import { randomUUID } from 'node:crypto'
import { normalizePromoCodesCatalog } from './promoCodesNormalize.js'
import { loadSnapshotDoc } from './adminSnapshotStore.js'
import {
  clientIdFromDoc,
  findClientIndexByEmail,
  loadClientsDoc,
  normalizeEmail,
  saveClientsDoc,
} from './adminClientsStore.js'
import { loadOrdersDoc, saveOrdersDoc } from './adminOrdersStore.js'

type CheckoutLine = {
  productId: string
  color: string
  size: string
  quantity: number
}

type CheckoutBody = {
  promoCode?: string
  lines: CheckoutLine[]
  contact: {
    lastName: string
    firstName: string
    email: string
    phone: string
    termsAccepted: boolean
  }
  shipping: {
    country: string
    city: string
    postalCode: string
    addressLine: string
  }
  paymentMethod: 'apple_pay' | 'card' | 'cash'
  deliveryNote?: string
}

type CatalogRow = {
  id: string
  sku?: string
  name: string
  price: number
  discountPercent?: number
  discountValidFrom?: string
  discountValidTo?: string
  imageUrls?: string[]
}

function todayIsoLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isDiscountActive(row: CatalogRow): boolean {
  const pct = Math.round(Number(row.discountPercent) || 0)
  if (pct <= 0) return false
  const t = todayIsoLocal()
  const from = row.discountValidFrom?.trim() ?? ''
  const to = row.discountValidTo?.trim() ?? ''
  if (from && t < from) return false
  if (to && t > to) return false
  return true
}

function unitPriceByn(row: CatalogRow): number {
  const list = Math.max(0, Number(row.price) || 0)
  const pct = Math.round(Number(row.discountPercent) || 0)
  if (!isDiscountActive(row) || pct <= 0) return list
  return Math.round(list * (1 - pct / 100))
}

function formatAmount(n: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} BYN`
}

function resolvePromoPercent(code: string | undefined): number {
  if (!code?.trim()) return 0
  const normalized = code.trim().toUpperCase()
  if (normalized === 'HELLO15') return 15
  return 0
}

async function loadPromoPercent(code: string): Promise<number> {
  const normalized = code.trim().toUpperCase()
  const fallback = resolvePromoPercent(normalized)
  try {
    const payload = await loadSnapshotDoc('promo_codes_snapshot')
    const catalog = normalizePromoCodesCatalog(payload)
    const row = catalog.promoCodes.find((r) => r.code === normalized)
    if (!row) return fallback
    const pct = parseInt(row.discountPercent.replace(/\D/g, ''), 10)
    if (!Number.isFinite(pct) || pct <= 0) return 0
    if (row.validUntil.trim()) {
      const t = todayIsoLocal()
      if (t > row.validUntil.trim()) return 0
    }
    return Math.min(100, pct)
  } catch {
    return fallback
  }
}

async function loadCatalog(): Promise<CatalogRow[]> {
  const payload = await loadSnapshotDoc('products_inventory_snapshot')
  if (!payload || typeof payload !== 'object') return []
  const catalog = (payload as { catalog?: unknown }).catalog
  if (!Array.isArray(catalog)) return []
  return catalog.filter(
    (r): r is CatalogRow =>
      r != null && typeof r === 'object' && typeof (r as CatalogRow).id === 'string',
  ) as CatalogRow[]
}

function nextOrderNumber(orders: unknown[]): string {
  let max = 10000
  for (const raw of orders) {
    if (!raw || typeof raw !== 'object') continue
    const num = (raw as { orderNumber?: string }).orderNumber ?? ''
    const m = /BUL-(\d+)/i.exec(String(num))
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `BUL-${max + 1}`
}

function formatDateRuFromIso(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!m) return isoDate
  return `${m[3]}.${m[2]}.${m[1]}`
}

function customerNameFromClientRow(c: Record<string, unknown>): string {
  const first = typeof c.firstName === 'string' ? c.firstName.trim() : ''
  const last = typeof c.lastName === 'string' ? c.lastName.trim() : ''
  return [last, first].filter(Boolean).join(' ').trim()
}

function orderMatchesBuyer(
  order: Record<string, unknown>,
  email: string,
  clientId: string | undefined,
  clients: unknown[],
): boolean {
  if (typeof order.clientEmail === 'string' && normalizeEmail(order.clientEmail) === email) return true
  if (clientId && order.clientId === clientId) return true
  const customerName = typeof order.customerName === 'string' ? order.customerName.trim().toLowerCase() : ''
  if (!customerName) return false
  for (const raw of clients) {
    if (!raw || typeof raw !== 'object') continue
    const c = raw as Record<string, unknown>
    const em = typeof c.email === 'string' ? normalizeEmail(c.email) : ''
    if (em !== email) continue
    const full = customerNameFromClientRow(c).toLowerCase()
    const rev = [c.firstName, c.lastName]
      .filter((x) => typeof x === 'string')
      .map((x) => (x as string).trim())
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (full && customerName === full.replace(/\s+/g, ' ')) return true
    if (rev && customerName === rev.replace(/\s+/g, ' ')) return true
  }
  return false
}

function stageStatusText(stageId: string, deliveryDate?: string): { text: string; delivered: boolean } {
  if (stageId === 'delivered') {
    return {
      text: deliveryDate ? `Доставлено ${formatDateRuFromIso(deliveryDate)}` : 'Доставлен',
      delivered: true,
    }
  }
  if (stageId === 'delivery') {
    return {
      text: deliveryDate ? `Доставка ${formatDateRuFromIso(deliveryDate)}` : 'Доставка',
      delivered: false,
    }
  }
  const labels: Record<string, string> = {
    new: 'Новый',
    assembly: 'Сборка',
    shipping: 'Отправка',
  }
  return { text: labels[stageId] ?? 'Новый', delivered: false }
}

export function adminOrderToStorefrontJson(order: Record<string, unknown>): Record<string, unknown> {
  const items = Array.isArray(order.items) ? order.items : []
  const lines = items.map((raw, i) => {
    const ln = raw as Record<string, unknown>
    const priceStr = typeof ln.price === 'string' ? ln.price : '0'
    const unit = parseInt(priceStr.replace(/\D/g, ''), 10) || 0
    const qty = typeof ln.quantity === 'number' && ln.quantity >= 1 ? Math.floor(ln.quantity) : 1
    const productId = typeof ln.productId === 'string' ? ln.productId : ''
    return {
      id: typeof ln.id === 'string' ? ln.id : `line-${i}`,
      name: typeof ln.name === 'string' ? ln.name : '',
      priceRub: unit,
      quantity: qty,
      lineDiscountRub: 0,
      lineTotalRub: unit * qty,
      color: typeof ln.color === 'string' ? ln.color : '—',
      colorSwatch: '#52525b',
      size: typeof ln.size === 'string' ? ln.size : '—',
      imageSrc:
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="#1a2332" width="80" height="80"/></svg>',
        ),
      imageAlt: typeof ln.name === 'string' ? ln.name : '',
      productHref: productId ? `/product/${productId}` : '/catalog',
    }
  })
  const subtotalRub = lines.reduce((s, l) => s + l.priceRub * l.quantity, 0)
  const totalStr = typeof order.total === 'string' ? order.total : ''
  const totalRub = parseInt(totalStr.replace(/\D/g, ''), 10) || subtotalRub
  const orderDiscountRub = Math.max(0, subtotalRub - totalRub)
  const stageId = typeof order.stageId === 'string' ? order.stageId : 'new'
  const deliveryDate = typeof order.deliveryDate === 'string' ? order.deliveryDate : undefined
  const { text, delivered } = stageStatusText(stageId, deliveryDate)

  return {
    id: order.id,
    orderNumber: order.orderNumber ?? order.id,
    placedIso: order.createdAt ?? todayIsoLocal(),
    subtotalRub,
    orderDiscountRub,
    totalRub,
    orderStatusText: text,
    orderDelivered: delivered,
    lines,
    deliveryDate: order.deliveryDate,
    shippingDate: order.shippingDate,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
  }
}

export async function listStorefrontOrdersForEmail(sessionEmail: string): Promise<unknown[]> {
  const doc = await loadOrdersDoc()
  const email = normalizeEmail(sessionEmail)
  const clientsDoc = await loadClientsDoc()
  const clientId = clientIdFromDoc(clientsDoc.clients, email)
  return doc.orders
    .filter((o) => {
      if (!o || typeof o !== 'object') return false
      return orderMatchesBuyer(o as Record<string, unknown>, email, clientId, clientsDoc.clients)
    })
    .sort((a, b) => {
      const da = (a as { createdAt?: string }).createdAt ?? ''
      const db = (b as { createdAt?: string }).createdAt ?? ''
      return db.localeCompare(da)
    })
    .map((o) => adminOrderToStorefrontJson(o as Record<string, unknown>))
}

export async function createOrderFromCheckout(
  sessionEmail: string,
  body: CheckoutBody,
): Promise<{ orderNumber: string; message: string }> {
  if (!body.contact.termsAccepted) {
    throw new Error('terms_required')
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    throw new Error('empty_cart')
  }

  const canonicalEmail = normalizeEmail(sessionEmail)
  const contactEmail = normalizeEmail(body.contact.email)
  if (contactEmail && contactEmail !== canonicalEmail) {
    throw new Error('email_mismatch')
  }

  const catalog = await loadCatalog()
  const byId = new Map(catalog.map((r) => [r.id, r]))

  let sale = 0
  const items: Record<string, unknown>[] = []

  for (const line of body.lines) {
    const row = byId.get(line.productId)
    if (!row) throw new Error('product_not_found')
    const qty = Math.max(1, Math.floor(line.quantity))
    const unit = unitPriceByn(row)
    sale += unit * qty
    const image = Array.isArray(row.imageUrls) ? row.imageUrls[0] : undefined
    items.push({
      id: randomUUID(),
      productId: row.id,
      sku: row.sku ?? '',
      name: row.name,
      size: line.size,
      color: line.color,
      quantity: qty,
      price: formatAmount(unit),
      _imageSrc: image,
    })
  }

  const promoPct = body.promoCode?.trim()
    ? await loadPromoPercent(body.promoCode)
    : 0
  const promoRub = promoPct > 0 ? Math.round((sale * promoPct) / 100) : 0
  const totalRub = Math.max(0, sale - promoRub)

  const clientsDoc = await loadClientsDoc()
  const clientId = clientIdFromDoc(clientsDoc.clients, canonicalEmail)

  const ordersDoc = await loadOrdersDoc()
  const customerName =
    [body.contact.lastName, body.contact.firstName].map((s) => s.trim()).filter(Boolean).join(' ').trim() ||
    canonicalEmail

  const paid = body.paymentMethod !== 'cash'
  const commentParts = [
    body.deliveryNote?.trim(),
    body.shipping.addressLine?.trim() !== '-' ? body.shipping.addressLine?.trim() : '',
  ].filter(Boolean)

  const newOrder = {
    id: randomUUID(),
    orderNumber: nextOrderNumber(ordersDoc.orders),
    createdAt: todayIsoLocal(),
    customerName,
    clientId,
    clientEmail: canonicalEmail,
    total: formatAmount(totalRub),
    status: 'Новый',
    paymentStatus: paid ? 'paid' : 'unpaid',
    paymentMethod: body.paymentMethod === 'cash' ? 'cash' : 'card',
    stageId: 'new',
    items: items.map(({ _imageSrc: _, ...rest }) => rest),
    comment: commentParts.length ? commentParts.join(' · ') : undefined,
  }

  ordersDoc.orders.push(newOrder)
  await saveOrdersDoc(ordersDoc)

  return {
    orderNumber: String(newOrder.orderNumber),
    message: 'Заказ принят',
  }
}

export async function ensureClientExistsForCheckout(
  sessionEmail: string,
  contact: CheckoutBody['contact'],
): Promise<void> {
  const canonicalEmail = normalizeEmail(sessionEmail)
  const doc = await loadClientsDoc()
  const clients = [...doc.clients]
  let idx = findClientIndexByEmail(clients, canonicalEmail)
  const firstName = contact.firstName.trim()
  const lastName = contact.lastName.trim()
  const phone = contact.phone.trim()
  if (idx < 0) {
    clients.push({
      id: randomUUID(),
      email: canonicalEmail,
      firstName,
      lastName,
      phone,
    })
  } else {
    const prev = clients[idx] as Record<string, unknown>
    clients[idx] = {
      ...prev,
      email: canonicalEmail,
      firstName: firstName || prev.firstName,
      lastName: lastName || prev.lastName,
      phone: phone || prev.phone,
    }
  }
  await saveClientsDoc({ clients })
}
