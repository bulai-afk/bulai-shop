export const ORDER_STAGES = [
  { id: 'new' as const, label: 'Новый' },
  { id: 'assembly' as const, label: 'Сборка' },
  { id: 'shipping' as const, label: 'Отправка' },
  { id: 'delivery' as const, label: 'Доставка' },
  { id: 'delivered' as const, label: 'Доставлен' },
] as const

export type OrderStageId = (typeof ORDER_STAGES)[number]['id']

export function isOrderStageId(v: string): v is OrderStageId {
  return ORDER_STAGES.some((s) => s.id === v)
}

export function orderStageLabel(id: OrderStageId): string {
  return ORDER_STAGES.find((s) => s.id === id)?.label ?? id
}

/** Старые id этапов до пятишагового таймлайна */
export function migrateLegacyOrderStageId(raw: string): OrderStageId {
  const t = raw.trim()
  if (t === 'processing') return 'assembly'
  if (t === 'shipped') return 'shipping'
  if (t === 'done') return 'delivered'
  if (isOrderStageId(t)) return t
  return 'new'
}

/** Подбор этапа по тексту статуса из старых данных */
export function inferOrderStageFromStatus(status: string): OrderStageId {
  const t = status.trim().toLowerCase()
  if (!t) return 'new'
  if (t.includes('доставлен') || t.includes('выполн') || t.includes('заверш')) return 'delivered'
  if (t.includes('доставка')) return 'delivery'
  if (t.includes('отправ')) return 'shipping'
  if (t.includes('сбор') || t.includes('работ')) return 'assembly'
  if (t.includes('нов')) return 'new'
  return 'new'
}

export const ORDER_PAYMENT_STATUSES = [
  { id: 'unpaid' as const, label: 'Не оплачен' },
  { id: 'pending' as const, label: 'Ожидает оплаты' },
  { id: 'paid' as const, label: 'Оплачен' },
  { id: 'refunded' as const, label: 'Возврат' },
  { id: 'failed' as const, label: 'Ошибка оплаты' },
] as const

export type OrderPaymentStatusId = (typeof ORDER_PAYMENT_STATUSES)[number]['id']

export function isOrderPaymentStatusId(v: string): v is OrderPaymentStatusId {
  return ORDER_PAYMENT_STATUSES.some((s) => s.id === v)
}

export function paymentStatusLabel(id: OrderPaymentStatusId): string {
  return ORDER_PAYMENT_STATUSES.find((s) => s.id === id)?.label ?? id
}

export function migrateLegacyPaymentStatus(raw: unknown): OrderPaymentStatusId {
  if (typeof raw === 'string' && isOrderPaymentStatusId(raw)) return raw
  return 'unpaid'
}

/** Способ оплаты (отдельно от статуса оплаты: оплачен / не оплачен и т.д.) */
export const ORDER_PAYMENT_METHODS = [
  { id: 'unspecified' as const, label: 'Не указан' },
  { id: 'card' as const, label: 'Банковская карта' },
  { id: 'sbp' as const, label: 'СБП' },
  { id: 'cash' as const, label: 'Наличные при получении' },
  { id: 'bank_transfer' as const, label: 'Банковский перевод' },
  { id: 'invoice' as const, label: 'Счёт на оплату (юрлицо)' },
] as const

export type OrderPaymentMethodId = (typeof ORDER_PAYMENT_METHODS)[number]['id']

export function isOrderPaymentMethodId(v: string): v is OrderPaymentMethodId {
  return ORDER_PAYMENT_METHODS.some((m) => m.id === v)
}

export function paymentMethodLabel(id: OrderPaymentMethodId): string {
  return ORDER_PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id
}

export function migrateLegacyPaymentMethod(raw: unknown): OrderPaymentMethodId {
  if (typeof raw === 'string' && isOrderPaymentMethodId(raw)) return raw
  return 'unspecified'
}

export type AdminOrderLineItem = {
  id: string
  /** Если позиция добавлена из каталога — id товара (для поиска и дедупликации) */
  productId?: string
  name: string
  /** Артикул из каталога (при ручном вводе можно задать вручную при необходимости) */
  sku?: string
  size?: string
  color?: string
  quantity: number
  /** Цена строки, например «2 500 ₽» */
  price?: string
}

export function normalizeOrderLineItems(raw: unknown): AdminOrderLineItem[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: AdminOrderLineItem[] = []
  for (let i = 0; i < raw.length; i++) {
    const x = raw[i]
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const id =
      typeof o.id === 'string' && o.id.trim()
        ? o.id.trim()
        : `line-${i}-${Math.random().toString(36).slice(2, 11)}`
    const productId =
      typeof o.productId === 'string' && o.productId.trim() ? o.productId.trim() : undefined
    const name = typeof o.name === 'string' ? o.name : ''
    const sku = typeof o.sku === 'string' && o.sku.trim() ? o.sku.trim() : undefined
    const size = typeof o.size === 'string' ? o.size : undefined
    const color = typeof o.color === 'string' ? o.color : undefined
    let quantity = 1
    if (typeof o.quantity === 'number' && Number.isFinite(o.quantity) && o.quantity >= 1) {
      quantity = Math.floor(o.quantity)
    }
    const price = typeof o.price === 'string' ? o.price : undefined
    out.push({ id, productId, name, sku, size, color, quantity, price })
  }
  return out.length ? out : undefined
}

/** Строка даты YYYY-MM-DD для полей type="date" */
export function isIsoDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim())
}

export type AdminOrderRow = {
  id: string
  /** Номер заказа для отображения */
  orderNumber: string
  /** Дата создания заказа (YYYY-MM-DD) */
  createdAt: string
  /** Дата доставки (YYYY-MM-DD), пусто — не задана */
  deliveryDate?: string
  /** Дата отправки заказа / передачи в доставку (YYYY-MM-DD) */
  shippingDate?: string
  customerName: string
  /** Сумма строкой, например «12 500 ₽» */
  total: string
  status: string
  /** Статус оплаты (интеграция с эквайрингом, напр. Альфа-Банк) */
  paymentStatus: OrderPaymentStatusId
  /** Способ оплаты: карта, СБП, наличные и т.д. */
  paymentMethod: OrderPaymentMethodId
  /** Текущий этап в таймлайне карточки заказа */
  stageId: OrderStageId
  /** Номер почтового отправления (трек-номер) */
  trackingNumber?: string
  /** Ссылка на отслеживание на сайте перевозчика */
  trackingUrl?: string
  /** Позиции заказа (товары) */
  items?: AdminOrderLineItem[]
  /** Примечание к заказу */
  comment?: string
}
