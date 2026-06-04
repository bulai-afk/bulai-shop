import type { AdminOrderLineItem, AdminOrderRow, OrderPaymentMethodId } from '../admin/types/adminOrders'
import { orderStageLabel } from '../admin/types/adminOrders'
import type { CartLine } from '../context/CartContext'
import { formatCartAmount } from '../context/CartContext'
import { customerNameFromClient, normalizeClientEmail } from '../utils/clientOrderLink'

export type CheckoutPaymentUi = 'apple_pay' | 'card' | 'cash'

export type CreateOrderFromCheckoutParams = {
  clientEmail: string
  clientId?: string
  firstName: string
  lastName: string
  phone: string
  lines: CartLine[]
  appliedPromoCode: string | null
  appliedPromoPercent: number
  paymentMethod: CheckoutPaymentUi
  deliveryMethodLabel: string
}

function digitsFromPriceDisplay(s: string): number {
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function mapPaymentMethod(m: CheckoutPaymentUi): OrderPaymentMethodId {
  if (m === 'cash') return 'cash'
  return 'card'
}

function nextOrderNumber(existing: AdminOrderRow[]): string {
  let max = 10000
  for (const o of existing) {
    const m = /BUL-(\d+)/i.exec(o.orderNumber.trim())
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `BUL-${max + 1}`
}

export function buildAdminOrderFromCheckout(
  params: CreateOrderFromCheckoutParams,
  existingOrders: AdminOrderRow[],
): AdminOrderRow {
  const customerName =
    [params.lastName, params.firstName].map((s) => s.trim()).filter(Boolean).join(' ').trim() ||
    params.clientEmail

  const newId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  const items: AdminOrderLineItem[] = params.lines.map((line) => ({
    id: newId(),
    productId: line.productId,
    name: line.name,
    size: line.sizeLabel,
    color: line.colorLabel,
    quantity: line.quantity,
    price: line.priceDisplay.includes(' ')
      ? line.priceDisplay
      : `${line.priceDisplay} BYN`,
  }))

  let sale = 0
  let catalog = 0
  for (const l of params.lines) {
    const uSale = digitsFromPriceDisplay(l.priceDisplay)
    const uCatalog = l.oldPriceDisplay ? digitsFromPriceDisplay(l.oldPriceDisplay) : uSale
    sale += uSale * l.quantity
    catalog += uCatalog * l.quantity
  }
  const pct = params.appliedPromoPercent
  const promoRub = pct > 0 ? Math.round((sale * pct) / 100) : 0
  const totalRub = Math.max(0, sale - promoRub)
  const total = `${formatCartAmount(totalRub)} BYN`

  const paid = params.paymentMethod !== 'cash'

  return {
    id: newId(),
    orderNumber: nextOrderNumber(existingOrders),
    createdAt: new Date().toISOString().slice(0, 10),
    customerName,
    clientId: params.clientId,
    clientEmail: normalizeClientEmail(params.clientEmail),
    total,
    status: orderStageLabel('new'),
    paymentStatus: paid ? 'paid' : 'unpaid',
    paymentMethod: mapPaymentMethod(params.paymentMethod),
    stageId: 'new',
    items,
    comment: params.deliveryMethodLabel.trim() || undefined,
  }
}

export function resolveClientIdForEmail(
  clients: { id: string; email: string }[],
  email: string,
): string | undefined {
  const n = normalizeClientEmail(email)
  return clients.find((c) => normalizeClientEmail(c.email) === n)?.id
}

export { customerNameFromClient }
