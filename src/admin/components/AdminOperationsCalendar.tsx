import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import {
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid'
import { useMemo, useState } from 'react'
import { orderPrimaryCalendarIso } from '../lib/orderCalendarDate'
import {
  ORDER_STAGES,
  orderStageLabel,
  paymentStatusLabel,
  type AdminOrderRow,
  type OrderPaymentStatusId,
  type OrderStageId,
} from '../types/adminOrders'
import type { Supplier, SupplyRecord } from '../types/siteSettings'

function OrdersPaymentStatusIcon({ id, size = 'md' }: { id: OrderPaymentStatusId; size?: 'sm' | 'md' }) {
  const iconClass = `${size === 'sm' ? 'size-4' : 'size-5'} shrink-0`
  switch (id) {
    case 'paid':
      return <CheckCircleIcon className={`${iconClass} text-emerald-400`} aria-hidden />
    case 'unpaid':
      return <XCircleIcon className={`${iconClass} text-gray-500`} aria-hidden />
    case 'pending':
      return <ClockIcon className={`${iconClass} text-amber-400`} aria-hidden />
    case 'refunded':
      return <ArrowUturnLeftIcon className={`${iconClass} text-violet-400`} aria-hidden />
    case 'failed':
      return <ExclamationCircleIcon className={`${iconClass} text-rose-400`} aria-hidden />
    default:
      return <XCircleIcon className={`${iconClass} text-gray-500`} aria-hidden />
  }
}

function calendarOrderStageBadgeClass(id: OrderStageId): string {
  const base =
    'inline-flex max-w-full items-center justify-center self-start rounded-full px-1.5 py-px text-[8px] font-semibold leading-tight tracking-tight whitespace-nowrap ring-1'
  switch (id) {
    case 'new':
      return `${base} bg-sky-500/15 text-sky-200 ring-sky-500/35`
    case 'assembly':
      return `${base} bg-amber-500/15 text-amber-200 ring-amber-500/40`
    case 'shipping':
      return `${base} bg-indigo-500/15 text-indigo-200 ring-indigo-500/35`
    case 'delivery':
      return `${base} bg-cyan-500/15 text-cyan-200 ring-cyan-500/35`
    case 'delivered':
      return `${base} bg-emerald-500/15 text-emerald-200 ring-emerald-500/35`
    default:
      return `${base} bg-white/[0.08] text-gray-300 ring-white/15`
  }
}

function supplyBadgeClass(): string {
  return 'inline-flex max-w-full items-center justify-center self-start rounded-full bg-violet-500/15 px-1.5 py-px text-[8px] font-semibold leading-tight tracking-tight whitespace-nowrap text-violet-200 ring-1 ring-violet-500/35'
}

export type AdminOperationsCalendarProps = {
  orders: AdminOrderRow[]
  supplies: SupplyRecord[]
  suppliers: Supplier[]
  onOpenOrder: (orderId: string) => void
  /** Карточка поставки: открыть диалог редактирования (например переход на склады со state) */
  onOpenSupply: (rec: SupplyRecord) => void
}

/**
 * Календарь операций: поставки по дате поставки; заказы по дате доставки (или создания).
 * Каждый заказ в ячейке один раз — по текущему этапу.
 */
export function AdminOperationsCalendar({
  orders,
  supplies,
  suppliers,
  onOpenOrder,
  onOpenSupply,
}: AdminOperationsCalendarProps) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const monthLabelRaw = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(monthCursor)
  const monthLabel = monthLabelRaw.replace(/^./, (ch) => ch.toUpperCase())

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstJsDow = new Date(year, month, 1).getDay()
  const startPad = (firstJsDow + 6) % 7

  const supplierName = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of suppliers) {
      if (s.id && s.name?.trim()) m.set(s.id, s.name.trim())
    }
    return m
  }, [suppliers])

  const ordersByIso = useMemo(() => {
    const map = new Map<string, AdminOrderRow[]>()
    for (const o of orders) {
      const iso = orderPrimaryCalendarIso(o)
      if (!iso) continue
      const arr = map.get(iso) ?? []
      arr.push(o)
      map.set(iso, arr)
    }
    return map
  }, [orders])

  const suppliesByIso = useMemo(() => {
    const map = new Map<string, SupplyRecord[]>()
    for (const s of supplies) {
      const d = s.date?.trim()
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue
      const arr = map.get(d) ?? []
      arr.push(s)
      map.set(d, arr)
    }
    return map
  }, [supplies])

  const prevMonth = () => setMonthCursor(new Date(year, month - 1, 1))
  const nextMonth = () => setMonthCursor(new Date(year, month + 1, 1))

  const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const cells: { day: number | null }[] = []
  for (let i = 0; i < startPad; i++) cells.push({ day: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d })

  const padIso = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const calNavBtnClass =
    'inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={prevMonth} className={calNavBtnClass} aria-label="Предыдущий месяц">
          <ChevronLeftIcon className="size-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold text-white">{monthLabel}</p>
        <button type="button" onClick={nextMonth} className={calNavBtnClass} aria-label="Следующий месяц">
          <ChevronRightIcon className="size-5" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {weekdayLabels.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (c.day === null) {
            return <div key={`empty-${idx}`} className="min-h-[5.5rem] rounded-md bg-transparent" />
          }
          const iso = padIso(c.day)
          const dayOrders = ordersByIso.get(iso) ?? []
          const daySupplies = suppliesByIso.get(iso) ?? []
          return (
            <div
              key={iso}
              className="flex min-h-[5.5rem] flex-col rounded-md border border-white/10 bg-white/[0.02] p-1.5"
            >
              <span className="text-xs font-medium tabular-nums text-gray-400">{c.day}</span>
              <ul className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                {daySupplies.map((rec) => {
                  const sup = supplierName.get(rec.supplierId) ?? 'Поставщик'
                  const doc = rec.documentNumber?.trim() || '—'
                  const title = `${sup} · ${doc}`
                  return (
                    <li key={`sup-${rec.id}`}>
                      <button
                        type="button"
                        onClick={() => onOpenSupply(rec)}
                        className="flex w-full min-w-0 flex-col gap-0.5 rounded px-0.5 py-0.5 text-left transition hover:bg-white/10"
                        title={title}
                      >
                        <span className={supplyBadgeClass()}>Поставка</span>
                        <span className="truncate text-[9px] leading-tight text-violet-200/90">{doc}</span>
                        <span className="truncate text-[8px] text-gray-500">{sup}</span>
                      </button>
                    </li>
                  )
                })}
                {dayOrders.map((o) => {
                  const stageId: OrderStageId = ORDER_STAGES.some((s) => s.id === o.stageId) ? o.stageId : 'new'
                  const stageLabel = orderStageLabel(stageId)
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => onOpenOrder(o.id)}
                        className="flex w-full min-w-0 flex-col gap-0.5 rounded px-0.5 py-0.5 text-left transition hover:bg-white/10"
                      >
                        <span className={calendarOrderStageBadgeClass(stageId)} title={stageLabel}>
                          {stageLabel}
                        </span>
                        <div className="flex min-w-0 items-center justify-between gap-1">
                          <span className="min-w-0 flex-1 truncate text-[10px] leading-tight text-indigo-200/95">
                            {o.orderNumber.trim() ? o.orderNumber : '—'}
                          </span>
                          <span
                            className="inline-flex shrink-0 items-center justify-center"
                            title={paymentStatusLabel(o.paymentStatus)}
                          >
                            <span className="sr-only">{paymentStatusLabel(o.paymentStatus)}</span>
                            <OrdersPaymentStatusIcon id={o.paymentStatus} size="sm" />
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-500">
        Поставки — по дате поступления из журнала складов. Заказы — по дате доставки (если задана), иначе по дате
        создания; у каждого заказа в дне один актуальный этап.
      </p>
    </div>
  )
}
