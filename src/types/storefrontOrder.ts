/** Заказ в истории покупателя (`GET /api/me/orders`). */
export type StorefrontOrderLine = {
  id: string
  name: string
  priceRub: number
  quantity: number
  lineDiscountRub: number
  lineTotalRub: number
  color: string
  colorSwatch: string
  size: string
  imageSrc: string
  imageAlt: string
  productHref: string
}

export type StorefrontOrder = {
  id?: string
  orderNumber: string
  placedIso: string
  subtotalRub: number
  orderDiscountRub: number
  totalRub: number
  orderStatusText: string
  orderDelivered: boolean
  lines: StorefrontOrderLine[]
  deliveryDate?: string
  shippingDate?: string
  trackingNumber?: string
  trackingUrl?: string
}
