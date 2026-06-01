import type { AdminOrderRow } from '../types/adminOrders'

/** Дата для календаря заказа: доставка (если ISO), иначе дата создания. */
export function orderPrimaryCalendarIso(o: AdminOrderRow): string | null {
  const delivery = o.deliveryDate?.trim()
  if (delivery && /^\d{4}-\d{2}-\d{2}$/.test(delivery)) return delivery
  const created = o.createdAt.trim()
  if (created && /^\d{4}-\d{2}-\d{2}$/.test(created)) return created
  return null
}
