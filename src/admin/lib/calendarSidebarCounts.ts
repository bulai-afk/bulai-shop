import type { AdminOrderRow } from '../types/adminOrders'
import { ORDER_STAGES, type OrderStageId } from '../types/adminOrders'
import type { ProductsInventoryDraft } from '../types/siteSettings'
import { orderPrimaryCalendarIso } from './orderCalendarDate'

function isIsoInMonth(iso: string, year: number, monthIndex0: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [y, m] = iso.split('-').map(Number)
  return y === year && m - 1 === monthIndex0
}

function normalizeOrderStage(o: AdminOrderRow): OrderStageId {
  return ORDER_STAGES.some((s) => s.id === o.stageId) ? o.stageId : 'new'
}

export type CalendarSidebarBucketCounts = {
  supplies: number
  new: number
  assembly: number
  shipping: number
  delivery: number
  delivered: number
  /** Поставки + заказы с датой в месяце (каждый заказ только в одном «ведре» по текущему этапу). */
  total: number
}

/**
 * Счётчики для бейджа «Календарь» за календарный месяц.
 * Заказ при смене статуса не дублируется: учитывается один раз по актуальному `stageId`.
 */
export function getCalendarSidebarCountsForMonth(
  orders: AdminOrderRow[],
  draft: ProductsInventoryDraft,
  year: number,
  monthIndex0: number,
): CalendarSidebarBucketCounts {
  const supplies = draft.supplies.filter((s) => isIsoInMonth(s.date, year, monthIndex0)).length

  const buckets = { new: 0, assembly: 0, shipping: 0, delivery: 0, delivered: 0 }
  for (const o of orders) {
    const iso = orderPrimaryCalendarIso(o)
    if (!iso || !isIsoInMonth(iso, year, monthIndex0)) continue
    const sid = normalizeOrderStage(o)
    if (sid === 'new') buckets.new++
    else if (sid === 'assembly') buckets.assembly++
    else if (sid === 'shipping') buckets.shipping++
    else if (sid === 'delivery') buckets.delivery++
    else if (sid === 'delivered') buckets.delivered++
  }

  const ordersInMonth = buckets.new + buckets.assembly + buckets.shipping + buckets.delivery + buckets.delivered
  return {
    supplies,
    ...buckets,
    total: supplies + ordersInMonth,
  }
}

export function formatCalendarSidebarBadgeTitle(c: CalendarSidebarBucketCounts): string {
  const parts: string[] = []
  if (c.supplies) parts.push(`Поставки: ${c.supplies}`)
  if (c.new) parts.push(`Новые заказы: ${c.new}`)
  if (c.assembly) parts.push(`Сборка: ${c.assembly}`)
  if (c.shipping) parts.push(`Отправка: ${c.shipping}`)
  if (c.delivery) parts.push(`Доставка: ${c.delivery}`)
  if (c.delivered) parts.push(`Доставлено: ${c.delivered}`)
  if (!parts.length) return 'Нет событий в этом месяце'
  return `${parts.join(' · ')} · всего: ${c.total}`
}
