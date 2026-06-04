import type { AdminClientRow } from '../admin/types/adminClients'
import type { AdminOrderLineItem, AdminOrderRow, OrderStageId } from '../admin/types/adminOrders'
import { orderStageLabel } from '../admin/types/adminOrders'
import type { StorefrontOrder, StorefrontOrderLine } from '../types/storefrontOrder'
import { orderBelongsToClient } from './clientOrderLink'
import { formatDateRuFromIso } from './formatDateRu'

function digitsFromPriceDisplay(s: string): number {
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

/** Tailwind-класс кружка цвета → hex для истории заказов. */
export function tailwindSwatchClassToHex(className: string | undefined): string {
  const c = (className ?? '').trim()
  if (c.includes('gray-950') || c.includes('zinc-950')) return '#030712'
  if (c.includes('gray-900') || c.includes('zinc-900')) return '#18181b'
  if (c.includes('gray-800')) return '#1f2937'
  if (c.includes('gray-700') || c.includes('zinc-700')) return '#374151'
  if (c.includes('gray-600') || c.includes('zinc-600')) return '#4b5563'
  if (c.includes('gray-500')) return '#6b7280'
  if (c.includes('gray-400') || c.includes('zinc-400')) return '#9ca3af'
  if (c.includes('white')) return '#f4f4f5'
  if (c.includes('zinc-200')) return '#e4e4e7'
  if (c.includes('blue')) return '#2563eb'
  if (c.includes('red')) return '#7f1d1d'
  if (c.includes('lime')) return '#4d7c0f'
  if (c.includes('amber-200')) return '#fde68a'
  if (c.includes('amber-900')) return '#78350f'
  if (c.includes('fuchsia')) return '#701a75'
  return '#52525b'
}

function buildOrderStatusText(row: AdminOrderRow): { text: string; delivered: boolean } {
  const stage = row.stageId
  if (stage === 'delivered') {
    const d = row.deliveryDate?.trim()
    return {
      text: d ? `Доставлено ${formatDateRuFromIso(d)}` : orderStageLabel('delivered'),
      delivered: true,
    }
  }
  if (stage === 'delivery') {
    const d = row.deliveryDate?.trim()
    return {
      text: d ? `Доставка ${formatDateRuFromIso(d)}` : orderStageLabel('delivery'),
      delivered: false,
    }
  }
  if (stage === 'shipping') {
    return { text: orderStageLabel('shipping'), delivered: false }
  }
  if (stage === 'assembly') {
    return { text: orderStageLabel('assembly'), delivered: false }
  }
  const label = row.status.trim() || orderStageLabel(stage as OrderStageId)
  return { text: label, delivered: false }
}

function adminLineToStorefrontLine(line: AdminOrderLineItem): StorefrontOrderLine {
  const unit = digitsFromPriceDisplay(line.price ?? '0')
  const qty = Math.max(1, line.quantity)
  const lineTotal = unit * qty
  const productHref = line.productId ? `/product/${line.productId}` : '/catalog'
  return {
    id: line.id,
    name: line.name,
    priceRub: unit,
    quantity: qty,
    lineDiscountRub: 0,
    lineTotalRub: lineTotal,
    color: line.color?.trim() || '—',
    colorSwatch: '#52525b',
    size: line.size?.trim() || '—',
    imageSrc:
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="#1a2332" width="80" height="80"/></svg>',
      ),
    imageAlt: line.name,
    productHref,
  }
}

export function adminOrderToStorefrontOrder(
  row: AdminOrderRow,
  lineExtras?: Map<string, Pick<StorefrontOrderLine, 'colorSwatch' | 'imageSrc' | 'imageAlt'>>,
): StorefrontOrder {
  const items = row.items ?? []
  const lines: StorefrontOrderLine[] = items.map((ln) => {
    const base = adminLineToStorefrontLine(ln)
    const extra = lineExtras?.get(ln.id)
    return extra ? { ...base, ...extra } : base
  })

  const subtotalRub = lines.reduce((s, l) => s + l.priceRub * l.quantity, 0)
  const totalFromAdmin = digitsFromPriceDisplay(row.total)
  const totalRub = totalFromAdmin > 0 ? totalFromAdmin : lines.reduce((s, l) => s + l.lineTotalRub, 0)
  const orderDiscountRub = Math.max(0, subtotalRub - totalRub)
  const { text, delivered } = buildOrderStatusText(row)

  return {
    id: row.id,
    orderNumber: row.orderNumber.trim() || row.id,
    placedIso: row.createdAt,
    subtotalRub,
    orderDiscountRub,
    totalRub,
    orderStatusText: text,
    orderDelivered: delivered,
    lines,
    deliveryDate: row.deliveryDate,
    shippingDate: row.shippingDate,
    trackingNumber: row.trackingNumber,
    trackingUrl: row.trackingUrl,
  }
}

export function adminOrdersToStorefrontOrders(
  orders: AdminOrderRow[],
  clientEmail: string,
  clientId?: string,
  clients?: AdminClientRow[],
): StorefrontOrder[] {
  return orders
    .filter((o) => orderBelongsToClient(o, clientEmail, clientId, clients))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => adminOrderToStorefrontOrder(o))
}
