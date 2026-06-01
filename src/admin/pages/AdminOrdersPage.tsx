import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import {
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid'
import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchAdminClientsFromApi, fetchAdminOrdersFromApi, putAdminClientsToApi, putAdminOrdersToApi } from '../../api/adminDataApi'
import { isSiteConfigApiExpected } from '../../constants/apiBase'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import {
  CLIENTS_UPDATED_EVENT,
  ORDERS_UPDATED_EVENT,
  PRODUCTS_INVENTORY_UPDATED_EVENT,
  loadClientsDraft,
  loadOrdersDraft,
  loadProductsInventoryDraft,
  saveClientsDraft,
  saveOrdersDraft,
} from '../lib/adminDraftStorage'
import { AdminOperationsCalendar } from '../components/AdminOperationsCalendar'
import { AdminOrderPreviewDialog } from '../components/AdminOrderPreviewDialog'
import type { AdminClientRow } from '../types/adminClients'
import type { ProductCatalogRow, ProductsInventoryDraft } from '../types/siteSettings'
import {
  ORDER_STAGES,
  orderStageLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  type AdminOrderLineItem,
  type AdminOrderRow,
  type OrderPaymentStatusId,
  type OrderStageId,
} from '../types/adminOrders'

const inputClass =
  'block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
const ordersTableCellValueClass =
  'flex min-h-10 min-w-0 items-center justify-center px-1 text-center text-sm text-gray-200'
const ordersTableCellNumericClass = `${ordersTableCellValueClass} tabular-nums`
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'

/** Строка таблицы заказов: те же колонки, что у родителя (`grid-template-columns: subgrid`) */
const ordersTableSubgridRowStyle: CSSProperties = {
  gridColumn: '1 / -1',
  display: 'grid',
  gridTemplateColumns: 'subgrid',
}

const COLUMN_DEFS = [
  { id: 'orderNumber' as const, label: 'Номер', track: 'minmax(5.5rem, max-content)' },
  { id: 'createdAt' as const, label: 'Создан', track: 'minmax(5.75rem, 7.75rem)' },
  { id: 'deliveryDate' as const, label: 'Доставка', track: 'minmax(5.75rem, max-content)' },
  { id: 'shippingDate' as const, label: 'Отправка', track: 'minmax(5.75rem, 7.75rem)' },
  { id: 'customerName' as const, label: 'Клиент', track: 'minmax(8rem, 2fr)' },
  { id: 'total' as const, label: 'Сумма', track: 'minmax(5.25rem, 6.75rem)' },
  { id: 'status' as const, label: 'Статус', track: 'minmax(5.25rem, 6.75rem)' },
  { id: 'paymentStatus' as const, label: 'Оплата', track: 'minmax(2.75rem, 3.25rem)' },
  { id: 'paymentMethod' as const, label: 'Способ оплаты', track: 'minmax(9.5rem, 1.35fr)' },
] as const

function newOrderId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `o-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }
}

function TableCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
}) {
  return (
    <label className="relative inline-flex size-4 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        aria-label={ariaLabel}
      />
      <span className="size-4 rounded border border-white/25 bg-white/5 transition peer-checked:border-indigo-500/70 peer-checked:bg-indigo-500/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-500/60" />
      <CheckIcon className="pointer-events-none absolute size-3 text-indigo-300 opacity-0 transition peer-checked:opacity-100" />
    </label>
  )
}

function ColumnVisibilityCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
}) {
  return (
    <label className="relative inline-flex size-4 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        aria-label={ariaLabel}
      />
      <span className="size-4 rounded border border-white/25 bg-white/5 transition peer-checked:border-indigo-500/70 peer-checked:bg-indigo-500/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-500/60" />
      <CheckIcon className="pointer-events-none absolute size-3 text-indigo-300 opacity-0 transition peer-checked:opacity-100" />
    </label>
  )
}

function rowMatchesSearch(row: AdminOrderRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hit = (s: string) => s.toLowerCase().includes(q)
  if (hit(row.orderNumber)) return true
  if (hit(row.customerName)) return true
  if (hit(row.total)) return true
  if (hit(row.status)) return true
  if (hit(paymentStatusLabel(row.paymentStatus))) return true
  if (hit(paymentMethodLabel(row.paymentMethod))) return true
  if (hit(row.createdAt)) return true
  if (row.deliveryDate && hit(row.deliveryDate)) return true
  if (row.shippingDate && hit(row.shippingDate)) return true
  if (row.comment && hit(row.comment)) return true
  if (row.trackingNumber && hit(row.trackingNumber)) return true
  if (row.trackingUrl && hit(row.trackingUrl)) return true
  if (
    row.items?.some(
      (it) =>
        hit(it.name) ||
        (it.sku && hit(it.sku)) ||
        (it.price && hit(it.price)) ||
        (it.size && hit(it.size)) ||
        (it.color && hit(it.color)),
    )
  )
    return true
  return false
}

function orderColumnSortString(row: AdminOrderRow, columnId: string): string {
  switch (columnId) {
    case 'orderNumber':
      return row.orderNumber
    case 'customerName':
      return row.customerName
    case 'createdAt':
      return row.createdAt
    case 'deliveryDate':
      return row.deliveryDate ?? ''
    case 'shippingDate':
      return row.shippingDate ?? ''
    case 'status':
      return row.status
    case 'paymentStatus':
      return paymentStatusLabel(row.paymentStatus)
    case 'paymentMethod':
      return paymentMethodLabel(row.paymentMethod)
    default:
      return row.status
  }
}

function parseTotalComparable(s: string): number {
  const cleaned = String(s).replace(/[^\d.,-]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function compareOrders(
  a: AdminOrderRow,
  b: AdminOrderRow,
  columnId: string,
  direction: 'asc' | 'desc',
): number {
  let cmp = 0
  if (columnId === 'total') {
    cmp = parseTotalComparable(a.total) - parseTotalComparable(b.total)
  } else if (
    columnId === 'createdAt' ||
    columnId === 'deliveryDate' ||
    columnId === 'shippingDate'
  ) {
    const pick = (r: AdminOrderRow) =>
      columnId === 'createdAt'
        ? r.createdAt
        : columnId === 'deliveryDate'
          ? (r.deliveryDate ?? '')
          : (r.shippingDate ?? '')
    cmp = pick(a).localeCompare(pick(b))
  } else {
    cmp = orderColumnSortString(a, columnId).localeCompare(orderColumnSortString(b, columnId), 'ru', {
      numeric: true,
      sensitivity: 'base',
    })
  }
  return direction === 'asc' ? cmp : -cmp
}

type OrdersViewTabId = 'list' | 'kanban' | 'calendar'

const ORDERS_VIEW_TABS: { id: OrdersViewTabId; label: string }[] = [
  { id: 'list', label: 'Список' },
  { id: 'kanban', label: 'Канбан' },
  { id: 'calendar', label: 'Календарь' },
]

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

function kanbanPaymentBadgeClass(id: OrderPaymentStatusId): string {
  const base =
    'inline-flex min-w-0 max-w-[7.5rem] shrink-0 items-center justify-center rounded-full px-1.5 py-px text-[9px] font-medium leading-tight ring-1'
  switch (id) {
    case 'paid':
      return `${base} bg-emerald-500/15 text-emerald-200 ring-emerald-500/35`
    case 'pending':
      return `${base} bg-amber-500/15 text-amber-200 ring-amber-500/40`
    case 'unpaid':
      return `${base} bg-white/[0.08] text-gray-300 ring-white/15`
    case 'refunded':
      return `${base} bg-violet-500/15 text-violet-200 ring-violet-500/35`
    case 'failed':
      return `${base} bg-rose-500/15 text-rose-200 ring-rose-500/40`
    default:
      return `${base} bg-white/[0.08] text-gray-300 ring-white/15`
  }
}

/** Одна строка для подсказки title над блоком товаров */
function formatKanbanLineItem(i: AdminOrderLineItem): string {
  const name = i.name.trim() || 'Без названия'
  const bits: string[] = [name]
  if (i.size?.trim()) bits.push(`разм. ${i.size.trim()}`)
  if (i.color?.trim()) bits.push(i.color.trim())
  bits.push(i.sku?.trim() ? `SKU ${i.sku.trim()}` : 'SKU —')
  bits.push(`кол. ${i.quantity}`)
  return bits.join(' · ')
}

function kanbanCatalogImageMaps(catalog: ProductCatalogRow[]) {
  const byProductId = new Map<string, string>()
  const bySku = new Map<string, string>()
  for (const p of catalog) {
    const url = p.imageUrls[0]?.trim()
    if (!url) continue
    byProductId.set(p.id, url)
    const sku = p.sku?.trim()
    if (sku) bySku.set(sku, url)
  }
  return { byProductId, bySku }
}

function kanbanLineProductImage(
  line: AdminOrderLineItem,
  byProductId: Map<string, string>,
  bySku: Map<string, string>,
): string | undefined {
  if (line.productId) {
    const u = byProductId.get(line.productId)
    if (u) return u
  }
  const sku = line.sku?.trim()
  if (sku) return bySku.get(sku)
  return undefined
}

function KanbanLineMiniCard({ line, imageUrl }: { line: AdminOrderLineItem; imageUrl?: string }) {
  const name = line.name.trim() || 'Без названия'
  const size = line.size?.trim()
  const color = line.color?.trim()
  const sku = line.sku?.trim()
  const meta = [size ? `разм. ${size}` : null, color || null].filter(Boolean).join(' · ')

  return (
    <div className="flex gap-1 rounded border border-white/[0.12] bg-white/[0.06] px-1 py-0.5">
      <div className="size-8 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-white/[0.04]">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-px text-center text-[6px] leading-none text-gray-500">
            Нет фото
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-px">
        <p className="line-clamp-2 break-words text-[9px] font-medium leading-tight text-gray-100">{name}</p>
        {meta ? (
          <p className="mt-0.5 line-clamp-1 break-words text-[8px] leading-tight text-gray-500">{meta}</p>
        ) : null}
        <div className="mt-0.5 flex items-center justify-between gap-1 border-t border-white/10 pt-0.5">
          <span
            className="min-w-0 truncate text-[8px] tabular-nums text-gray-400"
            title={sku ? `SKU ${sku}` : undefined}
          >
            {sku ? `SKU ${sku}` : 'SKU —'}
          </span>
          <span className="shrink-0 rounded bg-white/[0.08] px-1 py-px text-[8px] font-semibold tabular-nums text-gray-200">
            ×{line.quantity}
          </span>
        </div>
      </div>
    </div>
  )
}

function OrdersKanbanBoard({
  orders,
  catalog,
  onOpenOrder,
}: {
  orders: AdminOrderRow[]
  catalog: ProductCatalogRow[]
  onOpenOrder: (id: string) => void
}) {
  const { byProductId, bySku } = useMemo(() => kanbanCatalogImageMaps(catalog), [catalog])

  const byStage = useMemo(() => {
    const m: Record<OrderStageId, AdminOrderRow[]> = {
      new: [],
      assembly: [],
      shipping: [],
      delivery: [],
      delivered: [],
    }
    for (const o of orders) {
      const sid = ORDER_STAGES.some((s) => s.id === o.stageId) ? o.stageId : 'new'
      m[sid].push(o)
    }
    return m
  }, [orders])

  return (
    <div className="stable-scroll-x-purple -mx-1 flex gap-3 overflow-x-auto pb-2 pt-1">
      {ORDER_STAGES.map((stage) => (
        <div
          key={stage.id}
          className="flex w-[min(100%,15.5rem)] shrink-0 flex-col rounded-lg border border-white/10 bg-white/[0.02]"
        >
          <div className="border-b border-white/10 px-2 py-1.5">
            <p className="text-xs font-semibold text-white">{stage.label}</p>
            <p className="text-[10px] text-gray-500">{byStage[stage.id].length}</p>
          </div>
          <ul className="flex max-h-[min(28rem,55vh)] flex-col gap-1.5 overflow-y-auto p-1.5">
            {byStage[stage.id].map((row) => {
              const lines = row.items ?? []
              const lineCount = lines.length
              const itemsTitle =
                lineCount === 0 ? 'Позиции не добавлены' : lines.map((l) => formatKanbanLineItem(l)).join('\n')
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onOpenOrder(row.id)}
                    className="w-full rounded-md border border-white/10 bg-white/[0.04] p-2 text-left text-xs transition hover:border-indigo-500/40 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="min-w-0 flex-1 font-medium text-gray-100">
                        {row.orderNumber.trim() ? row.orderNumber : 'Без номера'}
                      </p>
                      <span
                        className={kanbanPaymentBadgeClass(row.paymentStatus)}
                        title={paymentStatusLabel(row.paymentStatus)}
                      >
                        <span className="truncate">{paymentStatusLabel(row.paymentStatus)}</span>
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-gray-400">
                      {row.customerName.trim() ? row.customerName : '—'}
                    </p>
                    <div
                      className="mt-1 text-left text-[10px] leading-snug text-gray-500"
                      title={itemsTitle}
                    >
                      <span className="text-gray-500">Товары </span>
                      <span className="tabular-nums text-gray-400">({lineCount})</span>
                      {lineCount === 0 ? (
                        <span className="mt-0.5 block text-gray-400">Нет позиций</span>
                      ) : (
                        <div className="mt-1 flex max-h-[9rem] flex-col gap-1 overflow-y-auto overscroll-contain border-t border-white/10 pt-1">
                          {lines.map((line) => (
                            <KanbanLineMiniCard
                              key={line.id}
                              line={line}
                              imageUrl={kanbanLineProductImage(line, byProductId, bySku)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <p
                      className="mt-0.5 truncate text-[10px] text-gray-500"
                      title={paymentMethodLabel(row.paymentMethod)}
                    >
                      <span className="text-gray-500">Оплата: </span>
                      <span className="text-gray-400">{paymentMethodLabel(row.paymentMethod)}</span>
                    </p>
                    <p className="mt-0.5 tabular-nums text-[11px] text-gray-300">
                      {row.total.trim() ? row.total : '—'}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [clients, setClients] = useState<AdminClientRow[]>([])
  const [productsInventoryDraft, setProductsInventoryDraft] = useState<ProductsInventoryDraft>(() =>
    loadProductsInventoryDraft(),
  )
  const [savedFlash, setSavedFlash] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null)
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([])
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumnId, setSortColumnId] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [ordersView, setOrdersView] = useState<OrdersViewTabId>('list')
  const columnsMenuRef = useRef<HTMLDivElement | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    setOrders(loadOrdersDraft())
    setClients(loadClientsDraft())
    setProductsInventoryDraft(loadProductsInventoryDraft())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isSiteConfigApiExpected()) return
    let cancelled = false
    ;(async () => {
      try {
        const [remoteOrders, remoteClients] = await Promise.all([
          fetchAdminOrdersFromApi(),
          fetchAdminClientsFromApi(),
        ])
        if (cancelled) return
        if (remoteOrders != null && Array.isArray(remoteOrders.orders)) {
          saveOrdersDraft(remoteOrders.orders)
          setOrders(loadOrdersDraft())
        }
        if (remoteClients != null && Array.isArray(remoteClients.clients)) {
          saveClientsDraft(remoteClients.clients)
          setClients(loadClientsDraft())
        }
      } catch {
        /* остаётся черновик из localStorage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    const oid = searchParams.get('openOrder')?.trim()
    if (!oid) return
    if (orders.length === 0) return
    if (orders.some((o) => o.id === oid)) {
      setPreviewOrderId(oid)
      setOrdersView('list')
    }
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p)
        n.delete('openOrder')
        return n
      },
      { replace: true },
    )
  }, [mounted, orders, searchParams, setSearchParams])

  useEffect(() => {
    const sync = () => setOrders(loadOrdersDraft())
    window.addEventListener('storage', sync)
    window.addEventListener(ORDERS_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(ORDERS_UPDATED_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    const sync = () => setClients(loadClientsDraft())
    window.addEventListener('storage', sync)
    window.addEventListener(CLIENTS_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(CLIENTS_UPDATED_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    const sync = () => setProductsInventoryDraft(loadProductsInventoryDraft())
    window.addEventListener('storage', sync)
    window.addEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    if (!columnsMenuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (columnsMenuRef.current && target && !columnsMenuRef.current.contains(target)) {
        setColumnsMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [columnsMenuOpen])

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders
    return orders.filter((row) => rowMatchesSearch(row, searchQuery))
  }, [orders, searchQuery])

  const filteredIdSet = useMemo(() => new Set(filteredOrders.map((r) => r.id)), [filteredOrders])

  const visibleColumnDefs = useMemo(
    () => COLUMN_DEFS.filter((c) => !hiddenColumnIds.includes(c.id)),
    [hiddenColumnIds],
  )

  const displayedOrders = useMemo(() => {
    if (!sortColumnId) return filteredOrders
    const next = [...filteredOrders]
    next.sort((a, b) => compareOrders(a, b, sortColumnId, sortDirection))
    return next
  }, [filteredOrders, sortColumnId, sortDirection])

  const tableGridTemplate = useMemo(() => {
    const cols = visibleColumnDefs.map((c) => c.track).join(' ')
    return `auto ${cols} auto`
  }, [visibleColumnDefs])

  const ordersTableMinWidthPx = useMemo(
    () => Math.max(640, 260 + visibleColumnDefs.length * 79),
    [visibleColumnDefs],
  )

  const ordersTableParentGridStyle = useMemo(
    () =>
      ({
        gridTemplateColumns: tableGridTemplate,
        minWidth: `${ordersTableMinWidthPx}px`,
      }) satisfies CSSProperties,
    [tableGridTemplate, ordersTableMinWidthPx],
  )

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setApiError(null)
    saveOrdersDraft(orders)
    saveClientsDraft(clients)
    if (isSiteConfigApiExpected()) {
      try {
        await Promise.all([putAdminOrdersToApi(orders), putAdminClientsToApi(clients)])
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'Не удалось сохранить в базу.')
        return
      }
    }
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  const onColumnSortClick = (columnId: string) => {
    if (sortColumnId === columnId) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumnId(columnId)
      setSortDirection('asc')
    }
  }

  const toggleColumnVisibility = (columnId: string, visible: boolean) => {
    setHiddenColumnIds((prev) => {
      if (!visible && prev.length >= COLUMN_DEFS.length - 1 && !prev.includes(columnId)) {
        return prev
      }
      return visible ? prev.filter((id) => id !== columnId) : [...new Set([...prev, columnId])]
    })
  }

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))
  }

  const addRow = () => {
    const row: AdminOrderRow = {
      id: newOrderId(),
      orderNumber: '',
      createdAt: new Date().toISOString().slice(0, 10),
      deliveryDate: undefined,
      shippingDate: undefined,
      customerName: '',
      total: '',
      status: orderStageLabel('new'),
      paymentStatus: 'unpaid',
      paymentMethod: 'unspecified',
      stageId: 'new',
    }
    setOrders((prev) => [...prev, row])
    setSelectedIds([row.id])
  }

  const duplicateSelectedRows = () => {
    if (selectedIds.length !== 1) return
    const src = orders.find((o) => o.id === selectedIds[0])
    if (!src) return
    const copy: AdminOrderRow = { ...src, id: newOrderId(), orderNumber: src.orderNumber ? `${src.orderNumber} (копия)` : '' }
    setOrders((prev) => [...prev, copy])
    setSelectedIds([copy.id])
  }

  const removeSelectedRows = () => {
    if (selectedIds.length === 0) return
    const remove = new Set(selectedIds)
    setOrders((prev) => prev.filter((o) => !remove.has(o.id)))
    setSelectedIds([])
    setPreviewOrderId((id) => (id && remove.has(id) ? null : id))
  }

  if (!mounted) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-400">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div
        className={
          ordersView === 'list' ? 'mx-auto max-w-5xl' : 'mx-auto max-w-[min(100%,88rem)]'
        }
      >
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Заказы</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Список заказов</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Поиск и выбор строк в таблице; значения в ячейках только для просмотра. Редактирование — в карточке заказа по
          иконке лупы. Чтобы сохранить черновик в браузере, нажмите «Сохранить» внизу.
        </p>

        <form onSubmit={onSave} className="mt-8 space-y-8">
          <section className={sectionClass}>
            <div
              role="tablist"
              aria-label="Вид заказов"
              className="mb-4 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1"
            >
              {ORDERS_VIEW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={ordersView === tab.id}
                  id={`orders-view-tab-${tab.id}`}
                  onClick={() => setOrdersView(tab.id)}
                  className={`min-w-[5.5rem] flex-1 rounded-md px-3 py-2 text-sm font-medium transition sm:flex-none ${
                    ordersView === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-medium text-gray-200">Панель управления</p>
              {ordersView === 'list' ? (
                <p className="text-xs text-gray-400">Выбрано: {selectedIds.length}</p>
              ) : null}
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
              <div className="relative min-w-0 w-full max-w-md flex-1">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по номеру, датам, клиенту, сумме, статусу, оплате, способу оплаты, треку…"
                  className={`${inputClass} pl-9`}
                  aria-label="Поиск заказов"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
                >
                  <PlusIcon className="size-4" />
                  Добавить заказ
                </button>
                {ordersView === 'list' ? (
                  <>
                    <button
                      type="button"
                      onClick={duplicateSelectedRows}
                      disabled={selectedIds.length !== 1}
                      className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <DocumentDuplicateIcon className="size-4" />
                      Копировать
                    </button>
                    <button
                      type="button"
                      onClick={removeSelectedRows}
                      disabled={selectedIds.length === 0}
                      className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <TrashIcon className="size-4" />
                      Удалить
                    </button>
                    <div ref={columnsMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setColumnsMenuOpen((v) => !v)}
                        className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                        aria-label="Настроить отображение столбцов"
                        aria-expanded={columnsMenuOpen}
                      >
                        <Cog6ToothIcon className="size-4" />
                      </button>
                      {columnsMenuOpen ? (
                        <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-white/15 bg-gray-900/95 p-3 shadow-xl backdrop-blur">
                          <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                            Отображение столбцов
                          </p>
                          <ul className="space-y-1.5">
                            {COLUMN_DEFS.map((column) => (
                              <li key={column.id} className="flex items-center gap-2">
                                <ColumnVisibilityCheckbox
                                  checked={!hiddenColumnIds.includes(column.id)}
                                  onChange={(checked) => toggleColumnVisibility(column.id, checked)}
                                  ariaLabel={`Показать столбец ${column.label}`}
                                />
                                <span className="text-sm text-gray-200">{column.label}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div
              role="tabpanel"
              id={`orders-view-panel-${ordersView}`}
              aria-labelledby={`orders-view-tab-${ordersView}`}
            >
              {ordersView === 'list' ? (
                <div className="stable-scroll-x-purple overflow-x-auto">
                  <div
                    className="grid min-w-0 w-full gap-2"
                    style={ordersTableParentGridStyle}
                  >
                    <div
                      className="max-sm:hidden text-xs font-medium text-gray-400"
                      style={ordersTableSubgridRowStyle}
                    >
                      <div className="flex items-center justify-center">
                        <TableCheckbox
                          checked={
                            filteredOrders.length > 0 &&
                            filteredOrders.every((row) => selectedIds.includes(row.id))
                          }
                          onChange={(checked) => {
                            if (checked) {
                              setSelectedIds((prev) =>
                                Array.from(new Set([...prev, ...filteredOrders.map((r) => r.id)])),
                              )
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)))
                            }
                          }}
                          ariaLabel="Выбрать все заказы в текущей выдаче"
                        />
                      </div>
                      {visibleColumnDefs.map((column) => (
                        <div
                          key={column.id}
                          className="flex min-w-0 items-center justify-center text-center"
                        >
                          <button
                            type="button"
                            onClick={() => onColumnSortClick(column.id)}
                            className={`flex w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded py-0.5 text-center transition select-none hover:bg-white/10 hover:text-gray-200 sm:flex-row sm:justify-center sm:gap-0.5 ${
                              column.id === 'paymentStatus' ? 'px-0' : 'px-1'
                            } ${sortColumnId === column.id ? 'text-indigo-200' : ''}`}
                            title="Клик — сортировка А→Я / Я→А"
                            aria-sort={
                              sortColumnId === column.id
                                ? sortDirection === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            <span className="hyphens-none text-center leading-tight">{column.label}</span>
                            {sortColumnId === column.id ? (
                              sortDirection === 'asc' ? (
                                <ChevronUpIcon className="size-3.5 shrink-0 text-indigo-300" aria-hidden />
                              ) : (
                                <ChevronDownIcon className="size-3.5 shrink-0 text-indigo-300" aria-hidden />
                              )
                            ) : null}
                          </button>
                        </div>
                      ))}
                      <span />
                    </div>

                    <ul className="contents">
                      {filteredOrders.length === 0 && orders.length > 0 ? (
                        <li
                          className="list-none rounded-md border border-dashed border-white/15 bg-white/[0.02] py-8 text-center text-sm text-gray-500"
                          style={{ gridColumn: '1 / -1' }}
                        >
                          Ничего не найдено. Измените запрос поиска.
                        </li>
                      ) : null}
                      {orders.length === 0 ? (
                        <li
                          className="list-none rounded-md border border-dashed border-white/15 bg-white/[0.02] py-8 text-center text-sm text-gray-500"
                          style={{ gridColumn: '1 / -1' }}
                        >
                          Заказов пока нет. Нажмите «Добавить заказ».
                        </li>
                      ) : null}
                      {displayedOrders.map((row) => (
                        <li key={row.id} className="list-none" style={ordersTableSubgridRowStyle}>
                        <div className="flex items-center justify-center">
                          <TableCheckbox
                            checked={selectedIds.includes(row.id)}
                            onChange={(checked) => toggleRowSelection(row.id, checked)}
                            ariaLabel={`Выбрать заказ ${row.orderNumber || row.id}`}
                          />
                        </div>
                        {visibleColumnDefs.map((column) => {
                          if (column.id === 'orderNumber') {
                            return (
                              <div key={column.id} className={ordersTableCellNumericClass}>
                                <span className="min-w-0 max-w-full truncate" title={row.orderNumber || undefined}>
                                  {row.orderNumber.trim() ? row.orderNumber : '—'}
                                </span>
                              </div>
                            )
                          }
                          if (column.id === 'createdAt') {
                            return (
                              <div key={column.id} className={ordersTableCellNumericClass}>
                                <span className="min-w-0 max-w-full truncate" title={row.createdAt || undefined}>
                                  {row.createdAt.trim() ? row.createdAt : '—'}
                                </span>
                              </div>
                            )
                          }
                          if (column.id === 'deliveryDate') {
                            return (
                              <div key={column.id} className={ordersTableCellNumericClass}>
                                <span className="max-w-full whitespace-nowrap" title={row.deliveryDate ?? undefined}>
                                  {row.deliveryDate?.trim() ? row.deliveryDate : '—'}
                                </span>
                              </div>
                            )
                          }
                          if (column.id === 'shippingDate') {
                            return (
                              <div key={column.id} className={ordersTableCellNumericClass}>
                                <span className="min-w-0 max-w-full truncate" title={row.shippingDate ?? undefined}>
                                  {row.shippingDate?.trim() ? row.shippingDate : '—'}
                                </span>
                              </div>
                            )
                          }
                          if (column.id === 'customerName') {
                            return (
                              <div key={column.id} className={ordersTableCellValueClass}>
                                <span className="min-w-0 max-w-full truncate" title={row.customerName || undefined}>
                                  {row.customerName.trim() ? row.customerName : '—'}
                                </span>
                              </div>
                            )
                          }
                          if (column.id === 'total') {
                            return (
                              <div key={column.id} className={ordersTableCellNumericClass}>
                                <span className="min-w-0 max-w-full truncate" title={row.total || undefined}>
                                  {row.total.trim() ? row.total : '—'}
                                </span>
                              </div>
                            )
                          }
                          if (column.id === 'paymentStatus') {
                            const payLabel = paymentStatusLabel(row.paymentStatus)
                            return (
                              <div
                                key={column.id}
                                className="grid min-h-10 min-w-0 place-items-center px-0 text-sm text-gray-200"
                                title={payLabel}
                              >
                                <span className="sr-only">{payLabel}</span>
                                <OrdersPaymentStatusIcon id={row.paymentStatus} />
                              </div>
                            )
                          }
                          if (column.id === 'paymentMethod') {
                            return (
                              <div key={column.id} className={ordersTableCellValueClass}>
                                <span className="min-w-0 max-w-full truncate">
                                  {paymentMethodLabel(row.paymentMethod)}
                                </span>
                              </div>
                            )
                          }
                          return (
                            <div key={column.id} className={ordersTableCellValueClass}>
                              <span className="min-w-0 max-w-full truncate" title={row.status || undefined}>
                                {row.status.trim() ? row.status : '—'}
                              </span>
                            </div>
                          )
                        })}
                        <button
                          type="button"
                          onClick={() => setPreviewOrderId(row.id)}
                          className="inline-flex size-10 items-center justify-center justify-self-center rounded-md border border-white/10 p-2 text-gray-400 hover:border-white/25 hover:bg-white/5 hover:text-white"
                          aria-label="Открыть карточку заказа"
                        >
                          <MagnifyingGlassIcon className="size-4" />
                        </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
              {ordersView === 'kanban' ? (
                <div className="pt-1">
                  {orders.length === 0 ? (
                    <p className="rounded-md border border-dashed border-white/15 bg-white/[0.02] py-8 text-center text-sm text-gray-500">
                      Заказов пока нет. Нажмите «Добавить заказ».
                    </p>
                  ) : filteredOrders.length === 0 ? (
                    <p className="rounded-md border border-dashed border-white/15 bg-white/[0.02] py-8 text-center text-sm text-gray-500">
                      Ничего не найдено. Измените запрос поиска.
                    </p>
                  ) : (
                    <OrdersKanbanBoard
                      orders={displayedOrders}
                      catalog={productsInventoryDraft.catalog}
                      onOpenOrder={setPreviewOrderId}
                    />
                  )}
                </div>
              ) : null}
              {ordersView === 'calendar' ? (
                <div className="pt-1">
                  {orders.length === 0 ? (
                    <p className="rounded-md border border-dashed border-white/15 bg-white/[0.02] py-8 text-center text-sm text-gray-500">
                      Заказов пока нет. Нажмите «Добавить заказ».
                    </p>
                  ) : filteredOrders.length === 0 ? (
                    <p className="rounded-md border border-dashed border-white/15 bg-white/[0.02] py-8 text-center text-sm text-gray-500">
                      Ничего не найдено. Измените запрос поиска.
                    </p>
                  ) : (
                    <AdminOperationsCalendar
                      orders={displayedOrders}
                      supplies={productsInventoryDraft.supplies}
                      suppliers={productsInventoryDraft.suppliers}
                      onOpenOrder={setPreviewOrderId}
                      onOpenSupply={(rec) =>
                        navigate('/admin/products/stocks', { state: { openSupplyId: rec.id } })
                      }
                    />
                  )}
                </div>
              ) : null}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-6">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>

      <AdminOrderPreviewDialog
        open={previewOrderId != null}
        onClose={() => setPreviewOrderId(null)}
        orderId={previewOrderId}
        orders={orders}
        onOrdersChange={setOrders}
        clients={clients}
        onClientsChange={setClients}
        productsInventoryDraft={productsInventoryDraft}
        persistHint="Правки сразу отображаются в таблице. Чтобы сохранить список заказов, нажмите «Сохранить» внизу страницы."
      />

      <ProfileSaveToast
        open={savedFlash}
        onDismiss={() => setSavedFlash(false)}
        message="Спасибо, что обновили список заказов — изменения сохранены."
      />
      <ProfileSaveToast
        open={apiError != null}
        onDismiss={() => setApiError(null)}
        title="Ошибка"
        message={apiError ?? ''}
      />
    </div>
  )
}
