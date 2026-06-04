import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react'
import {
  ArchiveBoxIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  SquaresPlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { CSSProperties, FormEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PanelScrollArea } from '../../components/PanelScrollArea'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import { profileDialogPinnedScrollbarRailClass } from '../../components/scrollbarShared'
import {
  fetchAdminOrdersFromApi,
  fetchAdminProductsInventoryFromApi,
  putAdminProductsInventoryToApi,
} from '../../api/adminDataApi'
import { isSiteConfigApiExpected } from '../../constants/apiBase'
import { getPageScrollElement } from '../../utils/getPageScrollElement'
import { buildDefaultProductsInventory } from '../data/siteSettingsDefaults'
import {
  ORDERS_UPDATED_EVENT,
  PRODUCTS_INVENTORY_UPDATED_EVENT,
  loadOrdersDraft,
  loadProductsInventoryDraft,
  saveOrdersDraft,
  saveProductsInventoryDraft,
} from '../lib/adminDraftStorage'
import {
  buildOrderMetricsFromAdminOrders,
  orderMetricsFromMap,
  resolvePrimaryWarehouseId,
} from '../lib/stockOrdersFromAdmin'
import {
  emptyWarehouseStock,
  getWarehouseStock,
  sumMetricsAcrossWarehouses,
  withDerivedStock,
} from '../lib/stockRowUtils'
import type {
  ProductCatalogRow,
  ProductsInventoryDraft,
  StockRow,
  DefectRecord,
  Supplier,
  SupplyLine,
  SupplyRecord,
  Warehouse,
  WarehouseStockBreakdown,
} from '../types/siteSettings'

const inputClass =
  'block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
/** Как поля в блоке «Реквизиты» на странице настроек сайта. */
const settingsLabelClass = 'block text-sm font-medium text-gray-300'
const settingsHintClass = 'text-xs text-gray-500'
/** Общая рамка ячейки: ниже по высоте, содержимое по центру по вертикали. */
const stocksCellFrameClass =
  'flex h-full min-h-[2.5rem] w-full min-w-0 items-center self-stretch rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5'
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'
const WAREHOUSES_DIALOG_SCROLL_RAIL_TRIM_PX = 80

const multiValueSeparator = '||'

function decodeMultiValue(value: string): string[] {
  return value
    .split(multiValueSeparator)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Склонение для подписи «(N поставок)». */
function formatSupplyCountLabel(n: number): string {
  const abs = Math.abs(n) % 100
  const v = n % 10
  if (abs > 10 && abs < 20) return `(${n} поставок)`
  if (v === 1) return `(${n} поставка)`
  if (v >= 2 && v <= 4) return `(${n} поставки)`
  return `(${n} поставок)`
}

function formatDefectJournalCountLabel(n: number): string {
  const abs = Math.abs(n) % 100
  const v = n % 10
  if (abs > 10 && abs < 20) return `(${n} записей брака)`
  if (v === 1) return `(${n} запись брака)`
  if (v >= 2 && v <= 4) return `(${n} записи брака)`
  return `(${n} записей брака)`
}

function SupplierStars({ value }: { value: number }) {
  const full = Math.min(5, Math.max(0, Math.round(value)))
  return (
    <span className="select-none text-base leading-none text-amber-400" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < full ? '★' : '☆'}</span>
      ))}
    </span>
  )
}

function SupplyRatingStarsInput({
  value,
  onChange,
  labelId,
}: {
  value: number
  onChange: (n: number) => void
  labelId: string
}) {
  const rounded = Math.min(5, Math.max(0, Math.round(value)))
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-3"
      role="group"
      aria-labelledby={labelId}
    >
      <div className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-1">
        {Array.from({ length: 5 }, (_, i) => {
          const star = i + 1
          const filled = star <= rounded
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(rounded === star ? 0 : star)}
              className={`rounded px-0.5 text-2xl leading-none transition hover:scale-110 focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                filled ? 'text-amber-400' : 'text-gray-600 hover:text-gray-500'
              }`}
              aria-label={`Оценка ${star} из 5`}
              aria-pressed={filled}
            >
              ★
            </button>
          )
        })}
      </div>
      <span className="text-xs tabular-nums text-gray-500">{rounded === 0 ? 'Без оценки' : `${rounded} из 5`}</span>
    </div>
  )
}

function rowMatchesStocksSearch(row: ProductCatalogRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hit = (s: string) => s.toLowerCase().includes(q)
  if (hit(row.sku)) return true
  if (hit(row.name)) return true
  if (hit(row.description)) return true
  for (const part of decodeMultiValue(row.size)) {
    if (hit(part)) return true
  }
  for (const part of decodeMultiValue(row.color)) {
    if (hit(part)) return true
  }
  if (hit(row.availability)) return true
  for (const v of Object.values(row.attributes)) {
    if (hit(v)) return true
    for (const part of decodeMultiValue(v)) {
      if (hit(part)) return true
    }
  }
  return false
}

function filterJournalsToCatalog(d: ProductsInventoryDraft): ProductsInventoryDraft {
  const ids = new Set(d.catalog.map((p) => p.id))
  const supplies = d.supplies
    .map((s) => ({
      ...s,
      lines: s.lines.filter((l) => ids.has(l.productId) && l.quantity > 0),
    }))
    .filter((s) => s.lines.length > 0)
  const defectRecords = d.defectRecords
    .map((s) => ({
      ...s,
      lines: s.lines.filter((l) => ids.has(l.productId) && l.quantity > 0),
    }))
    .filter((s) => s.lines.length > 0)
  return { ...d, supplies, defectRecords }
}

function ensureStockRowsForCatalog(d: ProductsInventoryDraft): ProductsInventoryDraft {
  const have = new Set(d.stocks.map((s) => s.productId))
  const add: StockRow[] = d.catalog
    .filter((p) => !have.has(p.id))
    .map((p) => ({
      productId: p.id,
      byWarehouse: Object.fromEntries(d.warehouses.map((w) => [w.id, emptyWarehouseStock()])),
    }))
  const merged = add.length > 0 ? [...d.stocks, ...add] : d.stocks
  const stocks = merged.map((row) => ({
    productId: row.productId,
    byWarehouse: Object.fromEntries(
      d.warehouses.map((w) => [w.id, getWarehouseStock(row.byWarehouse, w.id)]),
    ),
  }))
  return filterJournalsToCatalog({ ...d, stocks })
}

function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatSupplyDateDisplay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function summarizeSupplyLines(lines: SupplyLine[]): { positions: number; units: number } {
  const positions = lines.filter((l) => l.quantity > 0).length
  const units = lines.reduce((s, l) => s + Math.max(0, l.quantity), 0)
  return { positions, units }
}

/** Поступления по журналу поставок: товар → склад → сумма количеств по строкам. */
function buildReceiptsFromSuppliesMap(supplies: SupplyRecord[]): Map<string, Map<string, number>> {
  const m = new Map<string, Map<string, number>>()
  for (const s of supplies) {
    const wid = s.warehouseId
    for (const line of s.lines) {
      const pid = line.productId
      const q = Math.max(0, Math.floor(Number(line.quantity) || 0))
      if (q <= 0) continue
      if (!m.has(pid)) m.set(pid, new Map())
      const wm = m.get(pid)!
      wm.set(wid, (wm.get(wid) ?? 0) + q)
    }
  }
  return m
}

function buildDefectsFromDefectRecordsMap(records: DefectRecord[]): Map<string, Map<string, number>> {
  return buildReceiptsFromSuppliesMap(records)
}

function receiptUnitsFromSupplies(
  map: Map<string, Map<string, number>>,
  productId: string,
  warehouseId: string,
): number {
  return map.get(productId)?.get(warehouseId) ?? 0
}

type SortKey = 'sku' | 'name' | 'receipts' | 'orders' | 'preorders' | 'defects' | 'stock'

type StocksMainTab = 'all' | 'supplies' | 'defects' | 'suppliers'

type MetricField = keyof WarehouseStockBreakdown

const METRIC_FIELDS = ['receipts', 'orders', 'preorders', 'defects', 'stock'] as const satisfies readonly MetricField[]

export function AdminProductsStocksPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<ProductsInventoryDraft>(() => buildDefaultProductsInventory())
  const [savedFlash, setSavedFlash] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [stocksSearchQuery, setStocksSearchQuery] = useState('')
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('')
  const [supplySearchQuery, setSupplySearchQuery] = useState('')
  const [mainTab, setMainTab] = useState<StocksMainTab>('all')
  /** На вкладке «Остатки»: какие склады участвуют в сумме в таблице (чекбоксы в шестерёнке). */
  const [allTabIncludedWarehouseIds, setAllTabIncludedWarehouseIds] = useState<string[]>([])
  const allTabWarehouseSelectionInitRef = useRef(false)
  /** Локальные правки склада — не перезаписывать опоздавшим ответом GET /api/admin/data. */
  const userTouchedDraftRef = useRef(false)
  const [supplyDialogError, setSupplyDialogError] = useState<string | null>(null)
  const [supplyDialogSaving, setSupplyDialogSaving] = useState(false)
  const [defectDialogError, setDefectDialogError] = useState<string | null>(null)
  const [defectDialogSaving, setDefectDialogSaving] = useState(false)
  const [allTabWarehouseSelectionReady, setAllTabWarehouseSelectionReady] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [warehousesDialogOpen, setWarehousesDialogOpen] = useState(false)
  const [supplierAddDialogOpen, setSupplierAddDialogOpen] = useState(false)
  const [supplierAddName, setSupplierAddName] = useState('')
  const [supplierAddRequisites, setSupplierAddRequisites] = useState('')
  const [supplierEditDialogOpen, setSupplierEditDialogOpen] = useState(false)
  const [supplierEditId, setSupplierEditId] = useState<string | null>(null)
  const [supplierEditName, setSupplierEditName] = useState('')
  const [supplierEditRequisites, setSupplierEditRequisites] = useState('')
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false)
  const [supplyDialogEditId, setSupplyDialogEditId] = useState<string | null>(null)
  const [supplyFormWarehouseId, setSupplyFormWarehouseId] = useState('')
  const [supplyFormSupplierId, setSupplyFormSupplierId] = useState('')
  const [supplyFormDate, setSupplyFormDate] = useState('')
  const [supplyFormDocument, setSupplyFormDocument] = useState('')
  const [supplyFormRating, setSupplyFormRating] = useState(0)
  const [supplyFormNote, setSupplyFormNote] = useState('')
  const [supplyFormLines, setSupplyFormLines] = useState<SupplyLine[]>([])
  const [supplyWarehouseQuery, setSupplyWarehouseQuery] = useState('')
  const [supplySupplierQuery, setSupplySupplierQuery] = useState('')
  const [supplyLineSkuQuery, setSupplyLineSkuQuery] = useState('')
  const [defectSearchQuery, setDefectSearchQuery] = useState('')
  const [defectDialogOpen, setDefectDialogOpen] = useState(false)
  const [defectDialogEditId, setDefectDialogEditId] = useState<string | null>(null)
  const [defectFormWarehouseId, setDefectFormWarehouseId] = useState('')
  const [defectFormSupplierId, setDefectFormSupplierId] = useState('')
  const [defectFormDate, setDefectFormDate] = useState('')
  const [defectFormDocument, setDefectFormDocument] = useState('')
  const [defectFormRating, setDefectFormRating] = useState(0)
  const [defectFormNote, setDefectFormNote] = useState('')
  const [defectFormLines, setDefectFormLines] = useState<SupplyLine[]>([])
  const [defectWarehouseQuery, setDefectWarehouseQuery] = useState('')
  const [defectSupplierQuery, setDefectSupplierQuery] = useState('')
  const [defectLineSkuQuery, setDefectLineSkuQuery] = useState('')
  const [stocksAddDialogOpen, setStocksAddDialogOpen] = useState(false)
  const [stocksAddDialogQuery, setStocksAddDialogQuery] = useState('')
  const warehousesDialogPanelRef = useRef<HTMLElement | null>(null)
  const stocksAddDialogPanelRef = useRef<HTMLElement | null>(null)
  const [warehousesDialogPinnedRailStyle, setWarehousesDialogPinnedRailStyle] = useState<
    CSSProperties | undefined
  >(undefined)
  const [stocksAddDialogPinnedRailStyle, setStocksAddDialogPinnedRailStyle] = useState<
    CSSProperties | undefined
  >(undefined)
  const [adminOrders, setAdminOrders] = useState(() => loadOrdersDraft())

  const syncWarehousesDialogPinnedRail = useCallback(() => {
    const el = warehousesDialogPanelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const inset = WAREHOUSES_DIALOG_SCROLL_RAIL_TRIM_PX / 2
    setWarehousesDialogPinnedRailStyle({
      top: rect.top + inset,
      height: Math.max(0, rect.height - WAREHOUSES_DIALOG_SCROLL_RAIL_TRIM_PX),
      right: Math.max(0, window.innerWidth - rect.right + 5),
    })
  }, [])

  const syncStocksAddDialogPinnedRail = useCallback(() => {
    const el = stocksAddDialogPanelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const inset = WAREHOUSES_DIALOG_SCROLL_RAIL_TRIM_PX / 2
    setStocksAddDialogPinnedRailStyle({
      top: rect.top + inset,
      height: Math.max(0, rect.height - WAREHOUSES_DIALOG_SCROLL_RAIL_TRIM_PX),
      right: Math.max(0, window.innerWidth - rect.right + 5),
    })
  }, [])

  const syncDraft = () => setDraft(ensureStockRowsForCatalog(loadProductsInventoryDraft()))

  useEffect(() => {
    syncDraft()
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isSiteConfigApiExpected()) return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchAdminProductsInventoryFromApi()
        if (cancelled || remote == null) return
        if (userTouchedDraftRef.current) return
        saveProductsInventoryDraft(remote)
        setDraft(ensureStockRowsForCatalog(loadProductsInventoryDraft()))
      } catch {
        /* остаётся черновик из localStorage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const syncOrders = () => setAdminOrders(loadOrdersDraft())
    window.addEventListener(ORDERS_UPDATED_EVENT, syncOrders)
    return () => window.removeEventListener(ORDERS_UPDATED_EVENT, syncOrders)
  }, [])

  useEffect(() => {
    if (!isSiteConfigApiExpected()) return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchAdminOrdersFromApi()
        if (cancelled || remote == null || !Array.isArray(remote.orders)) return
        saveOrdersDraft(remote.orders)
        setAdminOrders(remote.orders)
      } catch {
        /* localStorage / seed */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const orderMetricsFromAdminMap = useMemo(
    () => buildOrderMetricsFromAdminOrders(adminOrders, draft.catalog, draft.warehouses),
    [adminOrders, draft.catalog, draft.warehouses],
  )

  useEffect(() => {
    if (!mounted) return
    const raw = (location.state as { openSupplyId?: string } | null)?.openSupplyId?.trim()
    if (!raw) return
    const rec = draft.supplies.find((s) => s.id === raw)
    if (rec) {
      setSupplyDialogEditId(rec.id)
      setSupplyFormWarehouseId(rec.warehouseId)
      setSupplyFormSupplierId(rec.supplierId)
      setSupplyFormDate(rec.date)
      setSupplyFormDocument(rec.documentNumber)
      setSupplyFormRating(
        typeof rec.rating === 'number' && Number.isFinite(rec.rating)
          ? Math.min(5, Math.max(0, Math.round(rec.rating)))
          : 0,
      )
      setSupplyFormNote(rec.note)
      setSupplyFormLines(rec.lines.length > 0 ? rec.lines.map((l) => ({ ...l })) : [])
      setSupplyWarehouseQuery('')
      setSupplySupplierQuery('')
      setSupplyLineSkuQuery('')
      setSupplyDialogOpen(true)
    }
    navigate('.', { replace: true, state: {} })
  }, [mounted, location.state, draft.supplies, navigate])

  useEffect(() => {
    const onSync = () => syncDraft()
    window.addEventListener('storage', onSync)
    window.addEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, onSync)
    return () => {
      window.removeEventListener('storage', onSync)
      window.removeEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, onSync)
    }
  }, [])

  useEffect(() => {
    const ids = draft.warehouses.map((w) => w.id)
    setAllTabIncludedWarehouseIds((prev) => {
      if (!allTabWarehouseSelectionInitRef.current && ids.length > 0) {
        allTabWarehouseSelectionInitRef.current = true
        return [...ids]
      }
      const kept = prev.filter((id) => ids.includes(id))
      const newOnes = ids.filter((id) => !kept.includes(id))
      return [...kept, ...newOnes]
    })
    setAllTabWarehouseSelectionReady(true)
  }, [draft.warehouses])

  useEffect(() => {
    if (!warehousesDialogOpen && !stocksAddDialogOpen && !defectDialogOpen) return
    const el = getPageScrollElement()
    const prevOverflow = el.style.overflow
    el.style.overflow = 'hidden'
    return () => {
      el.style.overflow = prevOverflow
    }
  }, [warehousesDialogOpen, stocksAddDialogOpen, defectDialogOpen])

  useLayoutEffect(() => {
    if (!warehousesDialogOpen) {
      setWarehousesDialogPinnedRailStyle(undefined)
      return
    }
    let ro: ResizeObserver | null = null
    const raf = window.requestAnimationFrame(() => {
      syncWarehousesDialogPinnedRail()
      const el = warehousesDialogPanelRef.current
      if (el) {
        ro = new ResizeObserver(() => syncWarehousesDialogPinnedRail())
        ro.observe(el)
      }
    })
    window.addEventListener('resize', syncWarehousesDialogPinnedRail)
    return () => {
      window.cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', syncWarehousesDialogPinnedRail)
    }
  }, [warehousesDialogOpen, syncWarehousesDialogPinnedRail])

  useLayoutEffect(() => {
    if (!stocksAddDialogOpen) {
      setStocksAddDialogPinnedRailStyle(undefined)
      return
    }
    let ro: ResizeObserver | null = null
    const raf = window.requestAnimationFrame(() => {
      syncStocksAddDialogPinnedRail()
      const el = stocksAddDialogPanelRef.current
      if (el) {
        ro = new ResizeObserver(() => syncStocksAddDialogPinnedRail())
        ro.observe(el)
      }
    })
    window.addEventListener('resize', syncStocksAddDialogPinnedRail)
    return () => {
      window.cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', syncStocksAddDialogPinnedRail)
    }
  }, [stocksAddDialogOpen, syncStocksAddDialogPinnedRail])

  const stocksByProduct = useMemo(() => {
    const map = new Map(draft.stocks.map((row) => [row.productId, row]))
    return map
  }, [draft.stocks])

  const stocksAddDialogList = useMemo(() => {
    const q = stocksAddDialogQuery.trim().toLowerCase()
    if (!q) return draft.catalog
    return draft.catalog.filter((p) => rowMatchesStocksSearch(p, q))
  }, [draft.catalog, stocksAddDialogQuery])

  const catalogProductsWithoutStockRow = useMemo(
    () => draft.catalog.filter((p) => !stocksByProduct.has(p.id)),
    [draft.catalog, stocksByProduct],
  )

  const filteredProducts = useMemo(() => {
    if (!stocksSearchQuery.trim()) return draft.catalog
    return draft.catalog.filter((row) => rowMatchesStocksSearch(row, stocksSearchQuery))
  }, [draft.catalog, stocksSearchQuery])

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearchQuery.trim().toLowerCase()
    if (!q) return draft.suppliers
    return draft.suppliers.filter((s) => {
      const blob = `${s.name}\n${s.requisites}`.toLowerCase()
      return blob.includes(q)
    })
  }, [draft.suppliers, supplierSearchQuery])

  const suppliesSorted = useMemo(() => {
    return [...draft.supplies].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date)
      return b.id.localeCompare(a.id)
    })
  }, [draft.supplies])

  const filteredSupplies = useMemo(() => {
    const q = supplySearchQuery.trim().toLowerCase()
    if (!q) return suppliesSorted
    const whById = new Map(draft.warehouses.map((w) => [w.id, w]))
    const catById = new Map(draft.catalog.map((p) => [p.id, p]))
    const supById = new Map(draft.suppliers.map((x) => [x.id, x]))
    return suppliesSorted.filter((s) => {
      const w = whById.get(s.warehouseId)
      const sup = supById.get(s.supplierId)
      const whName = (w?.name ?? '').toLowerCase()
      const supName = (sup?.name ?? '').toLowerCase()
      if (whName.includes(q)) return true
      if (supName.includes(q)) return true
      if (s.documentNumber.toLowerCase().includes(q)) return true
      if (s.date.toLowerCase().includes(q)) return true
      if (s.note.toLowerCase().includes(q)) return true
      if (String(s.rating).includes(q)) return true
      return s.lines.some((l) => {
        const p = catById.get(l.productId)
        const name = (p?.name ?? '').toLowerCase()
        const sku = (p?.sku ?? '').toLowerCase()
        return name.includes(q) || sku.includes(q)
      })
    })
  }, [suppliesSorted, supplySearchQuery, draft.warehouses, draft.suppliers, draft.catalog])

  const filteredSupplyWarehouses = useMemo(() => {
    const q = supplyWarehouseQuery.trim().toLowerCase()
    if (!q) return draft.warehouses
    return draft.warehouses.filter((w) => `${w.name} ${w.address}`.toLowerCase().includes(q))
  }, [draft.warehouses, supplyWarehouseQuery])

  const filteredSupplySuppliers = useMemo(() => {
    const q = supplySupplierQuery.trim().toLowerCase()
    if (!q) return draft.suppliers
    return draft.suppliers.filter((s) => `${s.name} ${s.requisites}`.toLowerCase().includes(q))
  }, [draft.suppliers, supplySupplierQuery])

  const selectedSupplyWarehouse = useMemo(
    () => draft.warehouses.find((w) => w.id === supplyFormWarehouseId) ?? null,
    [draft.warehouses, supplyFormWarehouseId],
  )

  const selectedSupplySupplier = useMemo(
    () => draft.suppliers.find((s) => s.id === supplyFormSupplierId) ?? null,
    [draft.suppliers, supplyFormSupplierId],
  )

  const supplyLineSkuMatches = useMemo(() => {
    const q = supplyLineSkuQuery.trim().toLowerCase()
    if (!q) return []
    return draft.catalog
      .filter((item) => item.sku.toLowerCase().includes(q))
      .filter((item) => !supplyFormLines.some((l) => l.productId === item.id))
      .slice(0, 12)
  }, [draft.catalog, supplyLineSkuQuery, supplyFormLines])

  const defectsSorted = useMemo(() => {
    return [...draft.defectRecords].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date)
      return b.id.localeCompare(a.id)
    })
  }, [draft.defectRecords])

  const filteredDefects = useMemo(() => {
    const q = defectSearchQuery.trim().toLowerCase()
    if (!q) return defectsSorted
    const whById = new Map(draft.warehouses.map((w) => [w.id, w]))
    const catById = new Map(draft.catalog.map((p) => [p.id, p]))
    const supById = new Map(draft.suppliers.map((x) => [x.id, x]))
    return defectsSorted.filter((s) => {
      const w = whById.get(s.warehouseId)
      const sup = supById.get(s.supplierId)
      const whName = (w?.name ?? '').toLowerCase()
      const supName = (sup?.name ?? '').toLowerCase()
      if (whName.includes(q)) return true
      if (supName.includes(q)) return true
      if (s.documentNumber.toLowerCase().includes(q)) return true
      if (s.date.toLowerCase().includes(q)) return true
      if (s.note.toLowerCase().includes(q)) return true
      if (String(s.rating).includes(q)) return true
      return s.lines.some((l) => {
        const p = catById.get(l.productId)
        const name = (p?.name ?? '').toLowerCase()
        const sku = (p?.sku ?? '').toLowerCase()
        return name.includes(q) || sku.includes(q)
      })
    })
  }, [defectsSorted, defectSearchQuery, draft.warehouses, draft.suppliers, draft.catalog])

  const filteredDefectWarehouses = useMemo(() => {
    const q = defectWarehouseQuery.trim().toLowerCase()
    if (!q) return draft.warehouses
    return draft.warehouses.filter((w) => `${w.name} ${w.address}`.toLowerCase().includes(q))
  }, [draft.warehouses, defectWarehouseQuery])

  const filteredDefectSuppliers = useMemo(() => {
    const q = defectSupplierQuery.trim().toLowerCase()
    if (!q) return draft.suppliers
    return draft.suppliers.filter((s) => `${s.name} ${s.requisites}`.toLowerCase().includes(q))
  }, [draft.suppliers, defectSupplierQuery])

  const selectedDefectWarehouse = useMemo(
    () => draft.warehouses.find((w) => w.id === defectFormWarehouseId) ?? null,
    [draft.warehouses, defectFormWarehouseId],
  )

  const selectedDefectSupplier = useMemo(
    () => draft.suppliers.find((s) => s.id === defectFormSupplierId) ?? null,
    [draft.suppliers, defectFormSupplierId],
  )

  const defectLineSkuMatches = useMemo(() => {
    const q = defectLineSkuQuery.trim().toLowerCase()
    if (!q) return []
    return draft.catalog
      .filter((item) => item.sku.toLowerCase().includes(q))
      .filter((item) => !defectFormLines.some((l) => l.productId === item.id))
      .slice(0, 12)
  }, [draft.catalog, defectLineSkuQuery, defectFormLines])

  const receiptsFromSuppliesMap = useMemo(
    () => buildReceiptsFromSuppliesMap(draft.supplies),
    [draft.supplies],
  )

  const defectsFromDefectRecordsMap = useMemo(
    () => buildDefectsFromDefectRecordsMap(draft.defectRecords),
    [draft.defectRecords],
  )

  const mergeOrderMetrics = useCallback(
    (
      productId: string,
      warehouseIds: string[],
      base: WarehouseStockBreakdown,
      receipts: number,
      defects: number,
    ): WarehouseStockBreakdown => {
      const primaryId = resolvePrimaryWarehouseId(draft.warehouses)
      const split =
        warehouseIds.length === 0 || !primaryId
          ? { orders: 0, preorders: 0 }
          : warehouseIds.length === 1 && warehouseIds[0] !== primaryId
            ? { orders: 0, preorders: 0 }
            : orderMetricsFromMap(orderMetricsFromAdminMap, productId, primaryId)
      return withDerivedStock({
        ...base,
        receipts,
        defects,
        orders: split.orders,
        preorders: split.preorders,
      })
    },
    [orderMetricsFromAdminMap, draft.warehouses],
  )

  const getRowMetrics = useCallback(
    (stock: StockRow | undefined, productId: string): WarehouseStockBreakdown => {
      const notReady = !allTabWarehouseSelectionInitRef.current && draft.warehouses.length > 0
      if (notReady) {
        const summed = sumMetricsAcrossWarehouses(stock, draft.warehouses)
        let receipts = 0
        let defects = 0
        for (const w of draft.warehouses) {
          receipts += receiptUnitsFromSupplies(receiptsFromSuppliesMap, productId, w.id)
          defects += receiptUnitsFromSupplies(defectsFromDefectRecordsMap, productId, w.id)
        }
        return mergeOrderMetrics(
          productId,
          draft.warehouses.map((w) => w.id),
          summed,
          receipts,
          defects,
        )
      }
      const ids = allTabIncludedWarehouseIds
      if (ids.length === 0) return emptyWarehouseStock()
      if (ids.length === 1) {
        const wid = ids[0]!
        const b = getWarehouseStock(stock?.byWarehouse ?? {}, wid)
        const receipts = receiptUnitsFromSupplies(receiptsFromSuppliesMap, productId, wid)
        const defects = receiptUnitsFromSupplies(defectsFromDefectRecordsMap, productId, wid)
        return mergeOrderMetrics(productId, [wid], b, receipts, defects)
      }
      const included = draft.warehouses.filter((w) => ids.includes(w.id))
      const summed = sumMetricsAcrossWarehouses(stock, included)
      let receipts = 0
      let defects = 0
      for (const w of included) {
        receipts += receiptUnitsFromSupplies(receiptsFromSuppliesMap, productId, w.id)
        defects += receiptUnitsFromSupplies(defectsFromDefectRecordsMap, productId, w.id)
      }
      return mergeOrderMetrics(
        productId,
        included.map((w) => w.id),
        summed,
        receipts,
        defects,
      )
    },
    [
      draft.warehouses,
      allTabIncludedWarehouseIds,
      receiptsFromSuppliesMap,
      defectsFromDefectRecordsMap,
      mergeOrderMetrics,
    ],
  )

  const toggleAllTabWarehouse = (warehouseId: string) => {
    setAllTabIncludedWarehouseIds((prev) =>
      prev.includes(warehouseId) ? prev.filter((id) => id !== warehouseId) : [...prev, warehouseId],
    )
  }

  const selectAllTabWarehouses = () => {
    setAllTabIncludedWarehouseIds(draft.warehouses.map((w) => w.id))
  }

  const clearAllTabWarehouses = () => {
    setAllTabIncludedWarehouseIds([])
  }

  const displayedProducts = useMemo(() => {
    if (!sortKey) return filteredProducts
    const next = [...filteredProducts]
    next.sort((a, b) => {
      const sa = stocksByProduct.get(a.id)
      const sb = stocksByProduct.get(b.id)
      const ma = getRowMetrics(sa, a.id)
      const mb = getRowMetrics(sb, b.id)
      let cmp = 0
      if (sortKey === 'sku') cmp = a.sku.localeCompare(b.sku, 'ru', { numeric: true })
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name, 'ru', { numeric: true })
      else if (sortKey === 'receipts') cmp = ma.receipts - mb.receipts
      else if (sortKey === 'orders') cmp = ma.orders - mb.orders
      else if (sortKey === 'preorders') cmp = ma.preorders - mb.preorders
      else if (sortKey === 'defects') cmp = ma.defects - mb.defects
      else if (sortKey === 'stock') cmp = ma.stock - mb.stock
      return sortDir === 'asc' ? cmp : -cmp
    })
    return next
  }, [filteredProducts, sortKey, sortDir, stocksByProduct, getRowMetrics])

  const buildPersistedInventory = useCallback(
    (source: ProductsInventoryDraft): ProductsInventoryDraft => {
      const primaryWh = resolvePrimaryWarehouseId(source.warehouses)
      const receiptsMap = buildReceiptsFromSuppliesMap(source.supplies)
      const defectsMap = buildDefectsFromDefectRecordsMap(source.defectRecords)
      const orderMap = buildOrderMetricsFromAdminOrders(adminOrders, source.catalog, source.warehouses)
      return {
        ...source,
        stocks: source.stocks.map((row) => ({
          productId: row.productId,
          byWarehouse: Object.fromEntries(
            source.warehouses.map((w) => {
              const receipts = receiptUnitsFromSupplies(receiptsMap, row.productId, w.id)
              const defects = receiptUnitsFromSupplies(defectsMap, row.productId, w.id)
              const split = orderMetricsFromMap(orderMap, row.productId, w.id)
              const orders = w.id === primaryWh ? split.orders : 0
              const preorders = w.id === primaryWh ? split.preorders : 0
              return [
                w.id,
                withDerivedStock({
                  ...getWarehouseStock(row.byWarehouse, w.id),
                  receipts,
                  defects,
                  orders,
                  preorders,
                }),
              ]
            }),
          ),
        })),
      }
    },
    [adminOrders],
  )

  const persistProductsInventoryFromDraft = async (
    source: ProductsInventoryDraft,
    options?: { requireServer?: boolean },
  ): Promise<{ ok: true } | { ok: false; message: string }> => {
    setApiError(null)
    const toSave = buildPersistedInventory(source)
    userTouchedDraftRef.current = true
    saveProductsInventoryDraft(toSave)
    setDraft(ensureStockRowsForCatalog(loadProductsInventoryDraft()))

    const apiExpected = isSiteConfigApiExpected()
    if (apiExpected || options?.requireServer) {
      try {
        await putAdminProductsInventoryToApi(toSave)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось сохранить в базу.'
        setApiError(message)
        return { ok: false, message }
      }
    }

    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
    return { ok: true }
  }

  const persistProductsInventory = async () => {
    await persistProductsInventoryFromDraft(draft)
  }

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    await persistProductsInventory()
  }

  const onSortClick = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const addWarehouse = () => {
    const id = `wh-${crypto.randomUUID()}`
    setDraft((prev) => ({
      ...prev,
      warehouses: [...prev.warehouses, { id, name: 'Новый склад', address: '' }],
      stocks: prev.stocks.map((row) => ({
        ...row,
        byWarehouse: { ...row.byWarehouse, [id]: emptyWarehouseStock() },
      })),
    }))
  }

  const openSupplierAddDialog = () => {
    setSupplierAddName('')
    setSupplierAddRequisites('')
    setSupplierAddDialogOpen(true)
  }

  const confirmAddSupplier = () => {
    const nameTrim = supplierAddName.trim()
    const name = nameTrim || 'Новый поставщик'
    const requisites = supplierAddRequisites.replace(/\r\n?/g, '\n')
    const id = `sup-${crypto.randomUUID()}`
    setDraft((prev) => ({
      ...prev,
      suppliers: [...prev.suppliers, { id, name, requisites, rating: 0, supplyCount: 0, defectCount: 0 }],
    }))
    setSupplierAddDialogOpen(false)
  }

  const openSupplierEditDialog = (s: Supplier) => {
    setSupplierEditId(s.id)
    setSupplierEditName(s.name)
    setSupplierEditRequisites(s.requisites)
    setSupplierEditDialogOpen(true)
  }

  const patchWarehouse = (warehouseId: string, patch: Partial<Pick<Warehouse, 'name' | 'address'>>) => {
    setDraft((prev) => ({
      ...prev,
      warehouses: prev.warehouses.map((w) => (w.id === warehouseId ? { ...w, ...patch } : w)),
    }))
  }

  const patchSupplier = (
    supplierId: string,
    patch: Partial<Pick<Supplier, 'name' | 'requisites' | 'rating' | 'supplyCount' | 'defectCount'>>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((s) => {
        if (s.id !== supplierId) return s
        const next = { ...s, ...patch }
        if (typeof next.rating === 'number' && Number.isFinite(next.rating)) {
          next.rating = Math.min(5, Math.max(0, next.rating))
        }
        if (typeof next.supplyCount === 'number' && Number.isFinite(next.supplyCount)) {
          next.supplyCount = Math.max(0, Math.floor(next.supplyCount))
        }
        if (typeof next.defectCount === 'number' && Number.isFinite(next.defectCount)) {
          next.defectCount = Math.max(0, Math.floor(next.defectCount))
        }
        return next
      }),
    }))
  }

  const confirmEditSupplier = () => {
    if (!supplierEditId) return
    const nameTrim = supplierEditName.trim()
    const name = nameTrim || 'Новый поставщик'
    const requisites = supplierEditRequisites.replace(/\r\n?/g, '\n')
    patchSupplier(supplierEditId, { name, requisites })
    setSupplierEditDialogOpen(false)
    setSupplierEditId(null)
  }

  const removeSupplier = (supplierId: string) => {
    setDraft((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== supplierId),
      supplies: prev.supplies.filter((s) => s.supplierId !== supplierId),
      defectRecords: prev.defectRecords.filter((s) => s.supplierId !== supplierId),
    }))
  }

  const addStockRowsForProductIds = (productIds: string[]) => {
    setDraft((prev) => {
      const have = new Set(prev.stocks.map((s) => s.productId))
      const toAdd = productIds.filter((id) => !have.has(id))
      if (toAdd.length === 0) return prev
      const newRows: StockRow[] = toAdd.map((productId) => ({
        productId,
        byWarehouse: Object.fromEntries(prev.warehouses.map((w) => [w.id, emptyWarehouseStock()])),
      }))
      return { ...prev, stocks: [...prev.stocks, ...newRows] }
    })
  }

  const removeWarehouse = (warehouseId: string) => {
    setDraft((prev) => {
      if (prev.warehouses.length <= 1) return prev
      const dropped = prev.supplies.filter((s) => s.warehouseId === warehouseId)
      const decBySupplier = new Map<string, number>()
      for (const s of dropped) {
        decBySupplier.set(s.supplierId, (decBySupplier.get(s.supplierId) ?? 0) + 1)
      }
      const droppedDef = prev.defectRecords.filter((s) => s.warehouseId === warehouseId)
      const decDefBySupplier = new Map<string, number>()
      for (const s of droppedDef) {
        decDefBySupplier.set(s.supplierId, (decDefBySupplier.get(s.supplierId) ?? 0) + 1)
      }
      return {
        ...prev,
        warehouses: prev.warehouses.filter((w) => w.id !== warehouseId),
        supplies: prev.supplies.filter((s) => s.warehouseId !== warehouseId),
        defectRecords: prev.defectRecords.filter((s) => s.warehouseId !== warehouseId),
        suppliers: prev.suppliers.map((s) => {
          const dec = decBySupplier.get(s.id)
          const decD = decDefBySupplier.get(s.id)
          if (!dec && !decD) return s
          return {
            ...s,
            supplyCount: dec ? Math.max(0, s.supplyCount - dec) : s.supplyCount,
            defectCount: decD ? Math.max(0, s.defectCount - decD) : s.defectCount,
          }
        }),
        stocks: prev.stocks.map((row) => {
          const { [warehouseId]: _removed, ...rest } = row.byWarehouse
          return { ...row, byWarehouse: rest }
        }),
      }
    })
  }

  const openSupplyAddDialog = () => {
    setSupplyDialogEditId(null)
    setSupplyDialogError(null)
    const firstW = draft.warehouses[0]?.id ?? ''
    const firstS = draft.suppliers[0]?.id ?? ''
    setSupplyFormWarehouseId(firstW)
    setSupplyFormSupplierId(firstS)
    setSupplyFormDate(isoDateToday())
    setSupplyFormDocument('')
    setSupplyFormRating(0)
    setSupplyFormNote('')
    setSupplyFormLines([])
    setSupplyWarehouseQuery('')
    setSupplySupplierQuery('')
    setSupplyLineSkuQuery('')
    setSupplyDialogOpen(true)
  }

  const openSupplyEditDialog = (s: SupplyRecord) => {
    setSupplyDialogError(null)
    setSupplyDialogEditId(s.id)
    setSupplyFormWarehouseId(s.warehouseId)
    setSupplyFormSupplierId(s.supplierId)
    setSupplyFormDate(s.date)
    setSupplyFormDocument(s.documentNumber)
    setSupplyFormRating(
      typeof s.rating === 'number' && Number.isFinite(s.rating)
        ? Math.min(5, Math.max(0, Math.round(s.rating)))
        : 0,
    )
    setSupplyFormNote(s.note)
    setSupplyFormLines(s.lines.length > 0 ? s.lines.map((l) => ({ ...l })) : [])
    setSupplyWarehouseQuery('')
    setSupplySupplierQuery('')
    setSupplyLineSkuQuery('')
    setSupplyDialogOpen(true)
  }

  const addSupplyFormLineProduct = (productId: string) => {
    setSupplyFormLines((prev) => {
      if (prev.some((l) => l.productId === productId)) return prev
      return [...prev, { productId, quantity: 1 }]
    })
  }

  const confirmSupplyDialog = async () => {
    if (supplyDialogSaving) return
    setSupplyDialogError(null)
    if (draft.warehouses.length === 0) {
      setSupplyDialogError('Сначала добавьте склад (шестерёнка «Склады»).')
      return
    }
    if (draft.suppliers.length === 0) {
      setSupplyDialogError('Сначала добавьте поставщика на вкладке «Поставщики».')
      return
    }
    if (!supplyFormWarehouseId || !supplyFormSupplierId) {
      setSupplyDialogError('Выберите склад поступления и поставщика из списка.')
      return
    }
    const productIds = new Set(draft.catalog.map((p) => p.id))
    const lines = supplyFormLines
      .map((l) => ({
        productId: l.productId,
        quantity: Math.max(0, Math.floor(Number(l.quantity) || 0)),
      }))
      .filter((l) => l.productId && productIds.has(l.productId))
    const activeLines = lines.filter((l) => l.quantity > 0)
    if (activeLines.length === 0) {
      setSupplyDialogError('Добавьте хотя бы одну позицию с количеством больше 0.')
      return
    }

    const rating = Math.min(5, Math.max(0, Math.round(supplyFormRating)))
    const normalized = {
      warehouseId: supplyFormWarehouseId,
      supplierId: supplyFormSupplierId,
      date: /^\d{4}-\d{2}-\d{2}$/.test(supplyFormDate) ? supplyFormDate : isoDateToday(),
      documentNumber: supplyFormDocument.trim(),
      rating,
      note: supplyFormNote.replace(/\r\n?/g, '\n'),
      lines: activeLines,
    }

    let nextDraft: ProductsInventoryDraft
    if (supplyDialogEditId) {
      const old = draft.supplies.find((s) => s.id === supplyDialogEditId)
      if (!old) {
        setSupplyDialogError('Запись поставки не найдена. Обновите страницу.')
        return
      }
      let suppliers = draft.suppliers
      if (old.supplierId !== normalized.supplierId) {
        suppliers = suppliers.map((s) => {
          if (s.id === old.supplierId) return { ...s, supplyCount: Math.max(0, s.supplyCount - 1) }
          if (s.id === normalized.supplierId) return { ...s, supplyCount: s.supplyCount + 1 }
          return s
        })
      }
      nextDraft = ensureStockRowsForCatalog({
        ...draft,
        supplies: draft.supplies.map((s) => (s.id === supplyDialogEditId ? { ...s, ...normalized } : s)),
        suppliers,
      })
    } else {
      const id = `sup-${crypto.randomUUID()}`
      nextDraft = ensureStockRowsForCatalog({
        ...draft,
        supplies: [...draft.supplies, { id, ...normalized }],
        suppliers: draft.suppliers.map((s) =>
          s.id === supplyFormSupplierId ? { ...s, supplyCount: s.supplyCount + 1 } : s,
        ),
      })
    }
    setSupplyDialogSaving(true)
    const result = await persistProductsInventoryFromDraft(nextDraft, { requireServer: true })
    setSupplyDialogSaving(false)
    if (!result.ok) {
      setSupplyDialogError(result.message)
      return
    }
    setSupplyDialogOpen(false)
    setSupplyDialogEditId(null)
    setSupplyWarehouseQuery('')
    setSupplySupplierQuery('')
    setSupplyLineSkuQuery('')
  }

  const removeSupplyRecord = (id: string) => {
    setDraft((prev) => {
      const rec = prev.supplies.find((s) => s.id === id)
      if (!rec) return prev
      return {
        ...prev,
        supplies: prev.supplies.filter((s) => s.id !== id),
        suppliers: prev.suppliers.map((s) =>
          s.id === rec.supplierId ? { ...s, supplyCount: Math.max(0, s.supplyCount - 1) } : s,
        ),
      }
    })
  }

  const openDefectAddDialog = () => {
    setDefectDialogError(null)
    setDefectDialogEditId(null)
    const firstW = draft.warehouses[0]?.id ?? ''
    const firstS = draft.suppliers[0]?.id ?? ''
    setDefectFormWarehouseId(firstW)
    setDefectFormSupplierId(firstS)
    setDefectFormDate(isoDateToday())
    setDefectFormDocument('')
    setDefectFormRating(0)
    setDefectFormNote('')
    setDefectFormLines([])
    setDefectWarehouseQuery('')
    setDefectSupplierQuery('')
    setDefectLineSkuQuery('')
    setDefectDialogOpen(true)
  }

  const openDefectEditDialog = (s: DefectRecord) => {
    setDefectDialogError(null)
    setDefectDialogEditId(s.id)
    setDefectFormWarehouseId(s.warehouseId)
    setDefectFormSupplierId(s.supplierId)
    setDefectFormDate(s.date)
    setDefectFormDocument(s.documentNumber)
    setDefectFormRating(
      typeof s.rating === 'number' && Number.isFinite(s.rating)
        ? Math.min(5, Math.max(0, Math.round(s.rating)))
        : 0,
    )
    setDefectFormNote(s.note)
    setDefectFormLines(s.lines.length > 0 ? s.lines.map((l) => ({ ...l })) : [])
    setDefectWarehouseQuery('')
    setDefectSupplierQuery('')
    setDefectLineSkuQuery('')
    setDefectDialogOpen(true)
  }

  const addDefectFormLineProduct = (productId: string) => {
    setDefectFormLines((prev) => {
      if (prev.some((l) => l.productId === productId)) return prev
      return [...prev, { productId, quantity: 1 }]
    })
  }

  const confirmDefectDialog = async () => {
    if (defectDialogSaving) return
    setDefectDialogError(null)
    if (draft.warehouses.length === 0) {
      setDefectDialogError('Сначала добавьте склад.')
      return
    }
    if (draft.suppliers.length === 0) {
      setDefectDialogError('Сначала добавьте поставщика.')
      return
    }
    if (!defectFormWarehouseId || !defectFormSupplierId) {
      setDefectDialogError('Выберите склад и поставщика из списка.')
      return
    }
    const productIds = new Set(draft.catalog.map((p) => p.id))
    const lines = defectFormLines
      .map((l) => ({
        productId: l.productId,
        quantity: Math.max(0, Math.floor(Number(l.quantity) || 0)),
      }))
      .filter((l) => l.productId && productIds.has(l.productId))
    const activeLines = lines.filter((l) => l.quantity > 0)
    if (activeLines.length === 0) {
      setDefectDialogError('Добавьте хотя бы одну позицию с количеством больше 0.')
      return
    }

    const rating = Math.min(5, Math.max(0, Math.round(defectFormRating)))
    const normalized = {
      warehouseId: defectFormWarehouseId,
      supplierId: defectFormSupplierId,
      date: /^\d{4}-\d{2}-\d{2}$/.test(defectFormDate) ? defectFormDate : isoDateToday(),
      documentNumber: defectFormDocument.trim(),
      rating,
      note: defectFormNote.replace(/\r\n?/g, '\n'),
      lines: activeLines,
    }

    let nextDraft: ProductsInventoryDraft
    if (defectDialogEditId) {
      const old = draft.defectRecords.find((s) => s.id === defectDialogEditId)
      if (!old) {
        setDefectDialogError('Запись не найдена. Обновите страницу.')
        return
      }
      let suppliers = draft.suppliers
      if (old.supplierId !== normalized.supplierId) {
        suppliers = suppliers.map((s) => {
          if (s.id === old.supplierId) return { ...s, defectCount: Math.max(0, s.defectCount - 1) }
          if (s.id === normalized.supplierId) return { ...s, defectCount: s.defectCount + 1 }
          return s
        })
      }
      nextDraft = ensureStockRowsForCatalog({
        ...draft,
        defectRecords: draft.defectRecords.map((s) =>
          s.id === defectDialogEditId ? { ...s, ...normalized } : s,
        ),
        suppliers,
      })
    } else {
      const id = `def-${crypto.randomUUID()}`
      nextDraft = ensureStockRowsForCatalog({
        ...draft,
        defectRecords: [...draft.defectRecords, { id, ...normalized }],
        suppliers: draft.suppliers.map((s) =>
          s.id === defectFormSupplierId ? { ...s, defectCount: s.defectCount + 1 } : s,
        ),
      })
    }

    setDefectDialogSaving(true)
    const result = await persistProductsInventoryFromDraft(nextDraft, { requireServer: true })
    setDefectDialogSaving(false)
    if (!result.ok) {
      setDefectDialogError(result.message)
      return
    }
    setDefectDialogOpen(false)
    setDefectDialogEditId(null)
    setDefectWarehouseQuery('')
    setDefectSupplierQuery('')
    setDefectLineSkuQuery('')
  }

  const removeDefectRecord = (id: string) => {
    setDraft((prev) => {
      const rec = prev.defectRecords.find((s) => s.id === id)
      if (!rec) return prev
      return {
        ...prev,
        defectRecords: prev.defectRecords.filter((s) => s.id !== id),
        suppliers: prev.suppliers.map((s) =>
          s.id === rec.supplierId ? { ...s, defectCount: Math.max(0, s.defectCount - 1) } : s,
        ),
      }
    })
  }

  /** Одна сетка на всю таблицу: SKU, фото, название (гибко шире числовых), пять числовых колонок фиксированной ширины. */
  const tableGridCols = '7.5rem 3.75rem minmax(16rem, 1fr) repeat(5, 6rem)'

  const sortableTh = (key: SortKey, label: string) => (
    <div className="flex items-center justify-center px-1">
      <button
        type="button"
        onClick={() => onSortClick(key)}
        className={`flex items-center justify-center gap-0.5 rounded px-1 py-1 text-center text-xs font-medium transition hover:bg-white/10 hover:text-gray-200 ${
          sortKey === key ? 'text-indigo-200' : 'text-gray-400'
        }`}
        aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span className="whitespace-nowrap leading-tight">{label}</span>
        {sortKey === key ? (
          sortDir === 'asc' ? (
            <ChevronUpIcon className="size-3.5 shrink-0 text-indigo-300" aria-hidden />
          ) : (
            <ChevronDownIcon className="size-3.5 shrink-0 text-indigo-300" aria-hidden />
          )
        ) : null}
      </button>
    </div>
  )

  const tabBtnClass = (active: boolean) =>
    `rounded-t-md border border-b-0 px-4 py-2.5 text-sm font-medium transition ${
      active
        ? 'border-white/15 bg-white/[0.08] text-white'
        : 'border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-gray-200'
    }`

  if (!mounted) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-400">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Товары</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Остатки по складам</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          «Остатки» — матрица по товарам и физическим складам (редактирование складов — наименование и адрес). «Поставки» и
          «Брак» — журналы с позициями по складам и поставщикам. «Поставщики» — юр. лица. Сохранение — кнопка внизу страницы.
        </p>

        <form onSubmit={onSave} className="mt-8 space-y-8">
          <section className={sectionClass}>
            <div className="mb-4 flex flex-wrap items-end gap-0 border-b border-white/10">
              <button
                type="button"
                onClick={() => setMainTab('all')}
                className={tabBtnClass(mainTab === 'all')}
              >
                Остатки
              </button>
              <button
                type="button"
                onClick={() => setMainTab('supplies')}
                className={tabBtnClass(mainTab === 'supplies')}
              >
                Поставки
              </button>
              <button
                type="button"
                onClick={() => setMainTab('defects')}
                className={tabBtnClass(mainTab === 'defects')}
              >
                Брак
              </button>
              <button
                type="button"
                onClick={() => setMainTab('suppliers')}
                className={tabBtnClass(mainTab === 'suppliers')}
              >
                Поставщики
              </button>
            </div>

            {mainTab === 'all' ? (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
                <div className="relative min-w-0 flex-1 basis-[min(100%,20rem)]">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={stocksSearchQuery}
                    onChange={(e) => setStocksSearchQuery(e.target.value)}
                    placeholder="Поиск по SKU, названию, описанию…"
                    className={`${inputClass} pl-9`}
                    aria-label="Поиск товаров в остатках"
                  />
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1.5 border-l border-white/10 pl-3 sm:pl-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStocksAddDialogQuery('')
                      setStocksAddDialogOpen(true)
                    }}
                    className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                    aria-label="Добавить остатки по товарам"
                    title="Добавить остатки по товарам"
                  >
                    <SquaresPlusIcon className="size-4" aria-hidden />
                  </button>
                  {draft.warehouses.length > 0 ? (
                    <Popover className="relative">
                      <PopoverButton
                        type="button"
                        className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 outline-none transition hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500/50 data-open:border-indigo-500/35 data-open:bg-indigo-500/10 data-open:text-indigo-100"
                        title="Какие склады учитывать в сумме"
                      >
                        <span className="sr-only">Учитывать остатки по складам</span>
                        <Cog6ToothIcon className="size-4" aria-hidden />
                      </PopoverButton>
                      <PopoverPanel
                        transition
                        anchor="bottom end"
                        className="z-40 w-[min(calc(100vw-2rem),14rem)] rounded-lg border border-white/10 bg-[#0d1b2a] p-2.5 shadow-xl ring-1 ring-white/10 transition [--anchor-gap:0.5rem] data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                      >
                        <p className="mb-3 text-xs font-medium text-gray-400">Учитывать остатки по складам</p>
                        <ul className="max-h-[min(40vh,16rem)] space-y-2 overflow-y-auto pr-0.5">
                          {draft.warehouses.map((w) => (
                            <li key={w.id}>
                              <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-transparent px-1 py-0.5 text-sm text-gray-200 hover:border-white/10 hover:bg-white/[0.04]">
                                <input
                                  type="checkbox"
                                  checked={allTabIncludedWarehouseIds.includes(w.id)}
                                  onChange={() => toggleAllTabWarehouse(w.id)}
                                  className="mt-0.5 size-4 shrink-0 rounded border-white/25 bg-white/[0.06] text-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-0 focus:ring-offset-[#0d1b2a]"
                                />
                                <span className="min-w-0 leading-snug">{w.name}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                          <button
                            type="button"
                            onClick={selectAllTabWarehouses}
                            className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition hover:border-white/25 hover:bg-white/10"
                          >
                            Выбрать все
                          </button>
                          <button
                            type="button"
                            onClick={clearAllTabWarehouses}
                            className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition hover:border-white/25 hover:bg-white/10"
                          >
                            Снять все
                          </button>
                        </div>
                      </PopoverPanel>
                    </Popover>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setWarehousesDialogOpen(true)}
                    className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                    aria-label="Редактирование складов"
                    title="Редактирование складов"
                  >
                    <ArchiveBoxIcon className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            ) : mainTab === 'supplies' ? (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
                <div className="relative min-w-0 flex-1 basis-[min(100%,20rem)]">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={supplySearchQuery}
                    onChange={(e) => setSupplySearchQuery(e.target.value)}
                    placeholder="Поиск по поставщику, складу, документу, товару…"
                    className={`${inputClass} pl-9`}
                    aria-label="Поиск поставок"
                  />
                </div>
                <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 border-l border-white/10 pl-3 sm:pl-3.5">
                  <button
                    type="button"
                    onClick={openSupplyAddDialog}
                    disabled={
                      draft.warehouses.length === 0 ||
                      draft.suppliers.length === 0 ||
                      draft.catalog.length === 0
                    }
                    className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Добавить поставку"
                    title={
                      draft.warehouses.length === 0 || draft.suppliers.length === 0
                        ? 'Сначала добавьте склад и поставщика'
                        : draft.catalog.length === 0
                          ? 'Нет товаров в каталоге'
                          : 'Добавить поставку'
                    }
                  >
                    <PlusIcon className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehousesDialogOpen(true)}
                    className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                    aria-label="Редактирование складов"
                    title="Редактирование складов"
                  >
                    <ArchiveBoxIcon className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            ) : mainTab === 'defects' ? (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
                <div className="relative min-w-0 flex-1 basis-[min(100%,20rem)]">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={defectSearchQuery}
                    onChange={(e) => setDefectSearchQuery(e.target.value)}
                    placeholder="Поиск по поставщику, складу, документу, товару…"
                    className={`${inputClass} pl-9`}
                    aria-label="Поиск записей брака"
                  />
                </div>
                <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 border-l border-white/10 pl-3 sm:pl-3.5">
                  <button
                    type="button"
                    onClick={openDefectAddDialog}
                    disabled={
                      draft.warehouses.length === 0 ||
                      draft.suppliers.length === 0 ||
                      draft.catalog.length === 0
                    }
                    className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Добавить запись брака"
                    title={
                      draft.warehouses.length === 0 || draft.suppliers.length === 0
                        ? 'Сначала добавьте склад и поставщика'
                        : draft.catalog.length === 0
                          ? 'Нет товаров в каталоге'
                          : 'Добавить запись брака'
                    }
                  >
                    <PlusIcon className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehousesDialogOpen(true)}
                    className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                    aria-label="Редактирование складов"
                    title="Редактирование складов"
                  >
                    <ArchiveBoxIcon className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
                <div className="relative min-w-0 flex-1 basis-[min(100%,20rem)]">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={supplierSearchQuery}
                    onChange={(e) => setSupplierSearchQuery(e.target.value)}
                    placeholder="Поиск по наименованию и реквизитам…"
                    className={`${inputClass} pl-9`}
                    aria-label="Поиск поставщиков"
                  />
                </div>
                <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 border-l border-white/10 pl-3 sm:pl-3.5">
                  <button
                    type="button"
                    onClick={openSupplierAddDialog}
                    className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                    aria-label="Добавить поставщика"
                    title="Добавить поставщика"
                  >
                    <PlusIcon className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehousesDialogOpen(true)}
                    className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                    aria-label="Редактирование складов"
                    title="Редактирование складов"
                  >
                    <ArchiveBoxIcon className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}

            {mainTab === 'all' ? (
              <p className="mb-3 text-xs text-gray-500">
                {!allTabWarehouseSelectionReady ? (
                  <>Загрузка списка складов…</>
                ) : allTabIncludedWarehouseIds.length === 0 ? (
                  <>
                    Ни один склад не отмечен в панели с шестерёнкой — в таблице нули. Отметьте склады или нажмите «Выбрать
                    все».
                  </>
                ) : allTabIncludedWarehouseIds.length === 1 ? (
                  <>
                    Показаны остатки по одному складу. Поступления — журнал «Поставки», брак — «Брак», заказ и предзаказы —
                    из раздела «Заказы» (не доставленные; предзаказ — если у товара в каталоге «Под заказ»). Остаток:
                    поступления − заказ − предзаказы − брак.
                  </>
                ) : (
                  <>
                    Поступления и брак — по журналам на выбранных складах; заказ и предзаказы — из «Заказов» (основной склад:
                    Москва / первый в списке). Состав складов — шестерёнка справа.
                  </>
                )}
              </p>
            ) : mainTab === 'supplies' ? (
              <p className="mb-3 text-xs text-gray-500">
                Журнал поставок: дата, документ, поставщик (юр. лицо), склад поступления, рейтинг поставки, позиции и
                количество единиц. Новая запись увеличивает счётчик у выбранного поставщика. Склады — иконка архива.
              </p>
            ) : mainTab === 'defects' ? (
              <p className="mb-3 text-xs text-gray-500">
                Журнал брака: те же колонки, что у поставок. Новая запись увеличивает счётчик записей брака у поставщика.
                Склады — иконка архива.
              </p>
            ) : (
              <p className="mb-3 text-xs text-gray-500">
                Справочник юр. лиц: добавить — + справа, править — карандаш. Склады учёта (название и адрес) — иконка архива.
              </p>
            )}

            {mainTab === 'all' ? (
            <div className="stable-scroll-x-purple overflow-x-auto">
              <div
                role="grid"
                aria-label="Таблица остатков по товарам"
                className="grid w-full min-w-max gap-x-2 gap-y-2"
                style={{ gridTemplateColumns: tableGridCols }}
              >
                <div role="row" className="contents text-xs font-medium text-gray-400">
                  {sortableTh('sku', 'SKU')}
                  <div className="flex items-center justify-center whitespace-nowrap text-center text-xs text-gray-400">
                    Фото
                  </div>
                  {sortableTh('name', 'Наименование')}
                  {sortableTh('receipts', 'Поступления')}
                  {sortableTh('orders', 'Заказ')}
                  {sortableTh('preorders', 'Предзаказы')}
                  {sortableTh('defects', 'Брак')}
                  {sortableTh('stock', 'Остаток')}
                </div>

                {filteredProducts.length === 0 && draft.catalog.length > 0 ? (
                  <div
                    role="row"
                    className="contents"
                  >
                    <div className="col-span-full rounded-md border border-dashed border-white/15 bg-white/[0.02] py-8 text-center text-sm text-gray-500">
                      Ничего не найдено. Измените запрос поиска.
                    </div>
                  </div>
                ) : null}

                {displayedProducts.map((product) => {
                  const stock = stocksByProduct.get(product.id)
                  const m = getRowMetrics(stock, product.id)
                  const firstImage = product.imageUrls[0] ?? ''
                  return (
                    <div key={product.id} role="row" className="contents">
                      <div
                        className={`${stocksCellFrameClass} justify-center text-sm text-white`}
                      >
                        <span className="truncate text-center font-mono text-xs leading-none">{product.sku}</span>
                      </div>
                      <div className={`${stocksCellFrameClass} justify-center p-0.5`}>
                        <div className="size-10 shrink-0 overflow-hidden rounded border border-white/10 bg-white/[0.04]">
                          {firstImage ? (
                            <img
                              src={firstImage}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center px-0.5 text-center text-[9px] leading-tight text-gray-500">
                              Нет
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`${stocksCellFrameClass} min-w-0 justify-start text-sm text-white`}>
                        <span className="line-clamp-2 text-left text-sm leading-tight">{product.name}</span>
                      </div>
                      {METRIC_FIELDS.map((field) => (
                          <div
                            key={field}
                            className={`${stocksCellFrameClass} justify-center text-sm leading-none tabular-nums text-white`}
                            aria-label={
                              field === 'receipts'
                                ? `Поступления (сумма по поставкам) — ${product.name}`
                                : field === 'defects'
                                  ? `Брак (сумма по журналу брака) — ${product.name}`
                                  : field === 'stock'
                                    ? `Остаток: поступления минус заказ, предзаказы и брак — ${product.name}`
                                    : undefined
                            }
                          >
                            {m[field]}
                          </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
            ) : mainTab === 'supplies' ? (
              <div className="stable-scroll-x-purple overflow-x-auto">
                <div
                  className="grid w-full min-w-[min(100%,56rem)] gap-x-2 gap-y-2"
                  style={{
                    gridTemplateColumns:
                      'minmax(5.5rem,auto) minmax(7rem,1fr) minmax(9rem,1.1fr) minmax(9rem,1.1fr) minmax(6rem,auto) minmax(5rem,auto) minmax(5.5rem,auto) minmax(5.5rem,auto)',
                  }}
                >
                  <div className="contents text-xs font-medium text-gray-400">
                    <div className="flex items-center px-1 py-1">Дата</div>
                    <div className="flex items-center px-1 py-1">Документ</div>
                    <div className="flex items-center px-1 py-1">Поставщик</div>
                    <div className="flex items-center px-1 py-1">Склад</div>
                    <div className="flex items-center justify-center px-1 py-1 text-center">Рейтинг</div>
                    <div className="flex items-center justify-center px-1 py-1 text-center">Позиций</div>
                    <div className="flex items-center justify-center px-1 py-1 text-center">Количество</div>
                    <div className="flex items-center justify-center px-1 py-1 text-center">Действия</div>
                  </div>
                  {filteredSupplies.length === 0 ? (
                    <div className="col-span-full rounded-md border border-dashed border-white/15 bg-white/[0.02] py-10 text-center text-sm text-gray-500">
                      {draft.supplies.length === 0
                        ? 'Нет поставок. Нажмите + справа.'
                        : 'Ничего не найдено. Измените поиск.'}
                    </div>
                  ) : null}
                  {filteredSupplies.map((s) => {
                    const wh = draft.warehouses.find((w) => w.id === s.warehouseId)
                    const sup = draft.suppliers.find((x) => x.id === s.supplierId)
                    const sum = summarizeSupplyLines(s.lines)
                    return (
                      <div key={s.id} className="contents">
                        <div className={`${stocksCellFrameClass} justify-start`}>
                          <span className="text-sm tabular-nums text-white">{formatSupplyDateDisplay(s.date)}</span>
                        </div>
                        <div className={`${stocksCellFrameClass} min-w-0 justify-start`}>
                          <span className="text-sm text-gray-200">{s.documentNumber.trim() ? s.documentNumber : '—'}</span>
                        </div>
                        <div className={`${stocksCellFrameClass} min-w-0 justify-start`}>
                          <span className="text-sm leading-snug text-white">{sup?.name ?? '—'}</span>
                        </div>
                        <div className={`${stocksCellFrameClass} min-w-0 justify-start`}>
                          <span className="text-sm leading-snug text-gray-200">{wh?.name ?? '—'}</span>
                        </div>
                        <div
                          className={`${stocksCellFrameClass} flex items-center justify-center px-1 py-1`}
                          aria-label={`Рейтинг поставки ${s.rating} из 5`}
                        >
                          <SupplierStars value={s.rating} />
                        </div>
                        <div
                          className={`${stocksCellFrameClass} justify-center text-sm tabular-nums text-white`}
                          aria-label={`Позиций: ${sum.positions}`}
                        >
                          {sum.positions}
                        </div>
                        <div
                          className={`${stocksCellFrameClass} justify-center text-sm tabular-nums text-white`}
                          aria-label={`Количество единиц: ${sum.units}`}
                        >
                          {sum.units}
                        </div>
                        <div className={`${stocksCellFrameClass} flex items-center justify-center gap-1 px-1 py-1`}>
                          <button
                            type="button"
                            onClick={() => openSupplyEditDialog(s)}
                            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-indigo-500/40 hover:bg-indigo-950/30 hover:text-indigo-100"
                            aria-label="Редактировать поставку"
                            title="Редактировать"
                          >
                            <PencilSquareIcon className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSupplyRecord(s.id)}
                            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-rose-500/40 hover:bg-rose-950/25 hover:text-rose-200"
                            aria-label="Удалить поставку"
                            title="Удалить"
                          >
                            <TrashIcon className="size-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : mainTab === 'defects' ? (
              <div className="stable-scroll-x-purple overflow-x-auto">
                <div
                  className="grid w-full min-w-[min(100%,56rem)] gap-x-2 gap-y-2"
                  style={{
                    gridTemplateColumns:
                      'minmax(5.5rem,auto) minmax(7rem,1fr) minmax(9rem,1.1fr) minmax(9rem,1.1fr) minmax(6rem,auto) minmax(5rem,auto) minmax(5.5rem,auto) minmax(5.5rem,auto)',
                  }}
                >
                  <div className="contents text-xs font-medium text-gray-400">
                    <div className="flex items-center px-1 py-1">Дата</div>
                    <div className="flex items-center px-1 py-1">Документ</div>
                    <div className="flex items-center px-1 py-1">Поставщик</div>
                    <div className="flex items-center px-1 py-1">Склад</div>
                    <div className="flex items-center justify-center px-1 py-1 text-center">Рейтинг</div>
                    <div className="flex items-center justify-center px-1 py-1 text-center">Позиций</div>
                    <div className="flex items-center justify-center px-1 py-1 text-center">Количество</div>
                    <div className="flex items-center justify-center px-1 py-1 text-center">Действия</div>
                  </div>
                  {filteredDefects.length === 0 ? (
                    <div className="col-span-full rounded-md border border-dashed border-white/15 bg-white/[0.02] py-10 text-center text-sm text-gray-500">
                      {draft.defectRecords.length === 0
                        ? 'Нет записей брака. Нажмите + справа.'
                        : 'Ничего не найдено. Измените поиск.'}
                    </div>
                  ) : null}
                  {filteredDefects.map((s) => {
                    const wh = draft.warehouses.find((w) => w.id === s.warehouseId)
                    const sup = draft.suppliers.find((x) => x.id === s.supplierId)
                    const sum = summarizeSupplyLines(s.lines)
                    return (
                      <div key={s.id} className="contents">
                        <div className={`${stocksCellFrameClass} justify-start`}>
                          <span className="text-sm tabular-nums text-white">{formatSupplyDateDisplay(s.date)}</span>
                        </div>
                        <div className={`${stocksCellFrameClass} min-w-0 justify-start`}>
                          <span className="text-sm text-gray-200">{s.documentNumber.trim() ? s.documentNumber : '—'}</span>
                        </div>
                        <div className={`${stocksCellFrameClass} min-w-0 justify-start`}>
                          <span className="text-sm leading-snug text-white">{sup?.name ?? '—'}</span>
                        </div>
                        <div className={`${stocksCellFrameClass} min-w-0 justify-start`}>
                          <span className="text-sm leading-snug text-gray-200">{wh?.name ?? '—'}</span>
                        </div>
                        <div
                          className={`${stocksCellFrameClass} flex items-center justify-center px-1 py-1`}
                          aria-label={`Рейтинг записи брака ${s.rating} из 5`}
                        >
                          <SupplierStars value={s.rating} />
                        </div>
                        <div
                          className={`${stocksCellFrameClass} justify-center text-sm tabular-nums text-white`}
                          aria-label={`Позиций: ${sum.positions}`}
                        >
                          {sum.positions}
                        </div>
                        <div
                          className={`${stocksCellFrameClass} justify-center text-sm tabular-nums text-white`}
                          aria-label={`Количество единиц: ${sum.units}`}
                        >
                          {sum.units}
                        </div>
                        <div className={`${stocksCellFrameClass} flex items-center justify-center gap-1 px-1 py-1`}>
                          <button
                            type="button"
                            onClick={() => openDefectEditDialog(s)}
                            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-indigo-500/40 hover:bg-indigo-950/30 hover:text-indigo-100"
                            aria-label="Редактировать запись брака"
                            title="Редактировать"
                          >
                            <PencilSquareIcon className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDefectRecord(s.id)}
                            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-rose-500/40 hover:bg-rose-950/25 hover:text-rose-200"
                            aria-label="Удалить запись брака"
                            title="Удалить"
                          >
                            <TrashIcon className="size-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="stable-scroll-x-purple overflow-x-auto">
                <div
                  className="grid w-full min-w-[min(100%,36rem)] gap-x-2 gap-y-2"
                  style={{
                    gridTemplateColumns:
                      'minmax(10rem,1.2fr) minmax(12rem,2fr) minmax(9.5rem,1fr) minmax(5.5rem,auto)',
                  }}
                >
                  <div className="contents text-xs font-medium text-gray-400">
                    <div className="flex items-center px-1 py-1">Наименование</div>
                    <div className="flex items-center px-1 py-1">Реквизиты</div>
                    <div className="flex items-center justify-center px-1 py-1 text-center">Рейтинг</div>
                    <div className="flex items-center justify-center px-1 py-1 text-center">Действия</div>
                  </div>
                  {filteredSuppliers.length === 0 ? (
                    <div className="col-span-full rounded-md border border-dashed border-white/15 bg-white/[0.02] py-10 text-center text-sm text-gray-500">
                      {draft.suppliers.length === 0
                        ? 'Нет поставщиков. Нажмите кнопку с плюсом справа.'
                        : 'Ничего не найдено. Измените поиск.'}
                    </div>
                  ) : null}
                  {filteredSuppliers.map((w) => (
                    <div key={w.id} className="contents">
                      <div className={`${stocksCellFrameClass} min-w-0 justify-start`}>
                        <span className="text-left text-sm leading-snug text-white">{w.name}</span>
                      </div>
                      <div className={`${stocksCellFrameClass} min-w-0 items-start justify-start py-1.5`}>
                        <span className="whitespace-pre-wrap break-words text-left text-sm leading-snug text-gray-200">
                          {w.requisites || '—'}
                        </span>
                      </div>
                      <div
                        className={`${stocksCellFrameClass} flex flex-col items-center justify-center gap-1 px-2 py-1.5 text-center`}
                        aria-label={`${w.rating} из 5 звёзд ${formatSupplyCountLabel(w.supplyCount)} ${formatDefectJournalCountLabel(w.defectCount)}`}
                      >
                        <SupplierStars value={w.rating} />
                        <span className="text-xs leading-tight tabular-nums text-gray-400">
                          {formatSupplyCountLabel(w.supplyCount)}
                        </span>
                        <span className="text-[11px] leading-tight tabular-nums text-gray-500">
                          {formatDefectJournalCountLabel(w.defectCount)}
                        </span>
                      </div>
                      <div
                        className={`${stocksCellFrameClass} flex items-center justify-center gap-1 px-1 py-1`}
                      >
                        <button
                          type="button"
                          onClick={() => openSupplierEditDialog(w)}
                          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-indigo-500/40 hover:bg-indigo-950/30 hover:text-indigo-100"
                          aria-label={`Редактировать поставщика ${w.name}`}
                          title="Редактировать"
                        >
                          <PencilSquareIcon className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSupplier(w.id)}
                          disabled={draft.suppliers.length <= 1}
                          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-rose-500/40 hover:bg-rose-950/25 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label={`Удалить поставщика ${w.name}`}
                          title={
                            draft.suppliers.length <= 1
                              ? 'Нельзя удалить последнего поставщика'
                              : 'Удалить'
                          }
                        >
                          <TrashIcon className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      <Dialog
        open={supplierAddDialogOpen}
        onClose={() => setSupplierAddDialogOpen(false)}
        className="relative z-[120]"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex min-h-0 items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
          <DialogPanel className="relative my-auto w-full max-w-lg rounded-xl bg-[#0d1b2a] px-4 py-6 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:px-5">
            <button
              type="button"
              onClick={() => setSupplierAddDialogOpen(false)}
              className="absolute right-3.5 top-3 z-[122] rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть"
            >
              <XMarkIcon className="size-5" aria-hidden />
            </button>
            <DialogTitle className="pr-14 text-xl font-semibold tracking-tight text-white">Новый поставщик</DialogTitle>
            <p className="mt-1 text-sm text-gray-400">
              Реквизиты или юрлицо. Можно вводить построчно: одна строка — один реквизит.
            </p>
            <div className="mt-5 space-y-5">
              <div>
                <label className={settingsLabelClass} htmlFor="supplier-add-name">
                  Наименование
                </label>
                <input
                  id="supplier-add-name"
                  type="text"
                  value={supplierAddName}
                  onChange={(e) => setSupplierAddName(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                  placeholder="Название поставщика"
                  autoComplete="organization"
                />
              </div>
              <div>
                <label className={settingsLabelClass} htmlFor="supplier-add-requisites">
                  Реквизиты или юридическое название
                </label>
                <p className={`mt-0.5 ${settingsHintClass}`}>
                  Введите реквизиты по строкам: один пункт на одной строке (например, название юрлица, УНП, расчетный
                  счет, банк).
                </p>
                <textarea
                  id="supplier-add-requisites"
                  rows={4}
                  value={supplierAddRequisites}
                  onChange={(e) => setSupplierAddRequisites(e.target.value.replace(/\r\n?/g, '\n'))}
                  className={`mt-1 ${inputClass}`}
                  placeholder={'ИП Иванов И.И.\nУНП 123456789\nр/с BY00BBBB30120000000000000000'}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setSupplierAddDialogOpen(false)}
                className="rounded-md border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-white/25 hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmAddSupplier}
                className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Добавить
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={supplierEditDialogOpen}
        onClose={() => {
          setSupplierEditDialogOpen(false)
          setSupplierEditId(null)
        }}
        className="relative z-[120]"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex min-h-0 items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
          <DialogPanel className="relative my-auto w-full max-w-lg rounded-xl bg-[#0d1b2a] px-4 py-6 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:px-5">
            <button
              type="button"
              onClick={() => {
                setSupplierEditDialogOpen(false)
                setSupplierEditId(null)
              }}
              className="absolute right-3.5 top-3 z-[122] rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть"
            >
              <XMarkIcon className="size-5" aria-hidden />
            </button>
            <DialogTitle className="pr-14 text-xl font-semibold tracking-tight text-white">
              Редактирование поставщика
            </DialogTitle>
            <p className="mt-1 text-sm text-gray-400">
              Реквизиты или юрлицо. Можно вводить построчно: одна строка — один реквизит.
            </p>
            <div className="mt-5 space-y-5">
              <div>
                <label className={settingsLabelClass} htmlFor="supplier-edit-name">
                  Наименование
                </label>
                <input
                  id="supplier-edit-name"
                  type="text"
                  value={supplierEditName}
                  onChange={(e) => setSupplierEditName(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                  placeholder="Название поставщика"
                  autoComplete="organization"
                />
              </div>
              <div>
                <label className={settingsLabelClass} htmlFor="supplier-edit-requisites">
                  Реквизиты или юридическое название
                </label>
                <p className={`mt-0.5 ${settingsHintClass}`}>
                  Введите реквизиты по строкам: один пункт на одной строке (например, название юрлица, УНП, расчетный
                  счет, банк).
                </p>
                <textarea
                  id="supplier-edit-requisites"
                  rows={4}
                  value={supplierEditRequisites}
                  onChange={(e) => setSupplierEditRequisites(e.target.value.replace(/\r\n?/g, '\n'))}
                  className={`mt-1 ${inputClass}`}
                  placeholder={'ИП Иванов И.И.\nУНП 123456789\nр/с BY00BBBB30120000000000000000'}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSupplierEditDialogOpen(false)
                  setSupplierEditId(null)
                }}
                className="rounded-md border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-white/25 hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmEditSupplier}
                className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Сохранить
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={supplyDialogOpen}
        onClose={() => {
          setSupplyDialogOpen(false)
          setSupplyDialogEditId(null)
          setSupplyWarehouseQuery('')
          setSupplySupplierQuery('')
          setSupplyLineSkuQuery('')
        }}
        className="relative z-[120]"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex min-h-0 items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
          <DialogPanel className="relative my-auto max-h-[min(90dvh,720px)] w-full max-w-2xl overflow-y-auto rounded-xl bg-[#0d1b2a] px-4 py-6 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:px-5">
            <button
              type="button"
              onClick={() => {
                setSupplyDialogOpen(false)
                setSupplyDialogEditId(null)
                setSupplyWarehouseQuery('')
                setSupplySupplierQuery('')
                setSupplyLineSkuQuery('')
              }}
              className="absolute right-3.5 top-3 z-[122] rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть"
            >
              <XMarkIcon className="size-5" aria-hidden />
            </button>
            <DialogTitle className="pr-14 text-xl font-semibold tracking-tight text-white">
              {supplyDialogEditId ? 'Редактирование поставки' : 'Новая поставка'}
            </DialogTitle>
            <p className="mt-1 text-sm text-gray-400">
              Склад поступления, поставщик (юр. лицо), дата, документ, рейтинг и позиции по товарам.
            </p>
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-1 gap-5 gap-x-6 sm:grid-cols-2 sm:items-start">
                <div className="min-w-0">
                  <span className={settingsLabelClass} id="supply-form-warehouse-label">
                    Склад поступления
                  </span>
                  <Combobox
                    value={selectedSupplyWarehouse}
                    onChange={(w) => {
                      if (w) setSupplyFormWarehouseId(w.id)
                    }}
                    onClose={() => setSupplyWarehouseQuery('')}
                    by={(a, b) => Boolean(a && b && a.id === b.id)}
                  >
                    <div className="relative mt-1">
                      <ComboboxInput
                        aria-labelledby="supply-form-warehouse-label"
                        className={`${inputClass} pr-10`}
                        displayValue={(w: Warehouse | null) => w?.name ?? ''}
                        placeholder="Название или адрес склада…"
                        onChange={(e) => setSupplyWarehouseQuery(e.target.value)}
                      />
                      <ComboboxButton
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 text-gray-400 transition hover:text-white"
                      >
                        <ChevronDownIcon className="size-4 shrink-0" aria-hidden />
                      </ComboboxButton>
                    </div>
                    <ComboboxOptions
                      modal={false}
                      anchor="bottom start"
                      transition
                      className="z-[130] mt-1 max-h-60 w-[var(--input-width)] overflow-auto rounded-md border border-white/10 bg-[#0d1b2a] py-1 shadow-xl ring-1 ring-white/10 [--anchor-gap:4px] transition data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in empty:invisible"
                    >
                      {filteredSupplyWarehouses.length === 0 ? (
                        <div className="px-3 py-2.5 text-sm text-gray-500">Ничего не найдено</div>
                      ) : (
                        filteredSupplyWarehouses.map((w) => (
                          <ComboboxOption
                            key={w.id}
                            value={w}
                            className="cursor-pointer px-3 py-2 text-left text-sm data-focus:bg-white/10 data-selected:bg-indigo-500/15"
                          >
                            <span className="block font-medium text-white">{w.name}</span>
                            {w.address ? (
                              <span className="mt-0.5 block truncate text-xs text-gray-500">{w.address}</span>
                            ) : null}
                          </ComboboxOption>
                        ))
                      )}
                    </ComboboxOptions>
                  </Combobox>
                </div>
                <div className="min-w-0">
                  <span className={settingsLabelClass} id="supply-form-supplier-label">
                    Поставщик
                  </span>
                  <Combobox
                    value={selectedSupplySupplier}
                    onChange={(v) => {
                      if (v) setSupplyFormSupplierId(v.id)
                    }}
                    onClose={() => setSupplySupplierQuery('')}
                    by={(a, b) => Boolean(a && b && a.id === b.id)}
                  >
                    <div className="relative mt-1">
                      <ComboboxInput
                        aria-labelledby="supply-form-supplier-label"
                        className={`${inputClass} pr-10`}
                        displayValue={(s: Supplier | null) => s?.name ?? ''}
                        placeholder="Название организации или реквизиты…"
                        onChange={(e) => setSupplySupplierQuery(e.target.value)}
                      />
                      <ComboboxButton
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 text-gray-400 transition hover:text-white"
                      >
                        <ChevronDownIcon className="size-4 shrink-0" aria-hidden />
                      </ComboboxButton>
                    </div>
                    <ComboboxOptions
                      modal={false}
                      anchor="bottom start"
                      transition
                      className="z-[130] mt-1 max-h-60 w-[var(--input-width)] overflow-auto rounded-md border border-white/10 bg-[#0d1b2a] py-1 shadow-xl ring-1 ring-white/10 [--anchor-gap:4px] transition data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in empty:invisible"
                    >
                      {filteredSupplySuppliers.length === 0 ? (
                        <div className="px-3 py-2.5 text-sm text-gray-500">Ничего не найдено</div>
                      ) : (
                        filteredSupplySuppliers.map((s) => (
                          <ComboboxOption
                            key={s.id}
                            value={s}
                            className="cursor-pointer px-3 py-2 text-left text-sm data-focus:bg-white/10 data-selected:bg-indigo-500/15"
                          >
                            <span className="block font-medium text-white">{s.name}</span>
                            {s.requisites ? (
                              <span className="mt-0.5 block truncate text-xs text-gray-500">{s.requisites}</span>
                            ) : null}
                          </ComboboxOption>
                        ))
                      )}
                    </ComboboxOptions>
                  </Combobox>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 gap-x-6 sm:grid-cols-2 sm:items-start">
                <div className="min-w-0">
                  <label className={settingsLabelClass} htmlFor="supply-form-date">
                    Дата
                  </label>
                  <input
                    id="supply-form-date"
                    type="date"
                    value={supplyFormDate}
                    onChange={(e) => setSupplyFormDate(e.target.value)}
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div className="min-w-0">
                  <label className={settingsLabelClass} htmlFor="supply-form-doc">
                    Номер документа
                  </label>
                  <input
                    id="supply-form-doc"
                    type="text"
                    value={supplyFormDocument}
                    onChange={(e) => setSupplyFormDocument(e.target.value)}
                    className={`mt-1 ${inputClass}`}
                    placeholder="УПД, счёт…"
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <p className={settingsLabelClass} id="supply-form-rating-label">
                    Рейтинг поставки
                  </p>
                  <SupplyRatingStarsInput
                    labelId="supply-form-rating-label"
                    value={supplyFormRating}
                    onChange={(n) => setSupplyFormRating(Math.min(5, Math.max(0, n)))}
                  />
                </div>
              </div>
              <div>
                <label className={settingsLabelClass} htmlFor="supply-form-note">
                  Примечание
                </label>
                <textarea
                  id="supply-form-note"
                  rows={3}
                  value={supplyFormNote}
                  onChange={(e) => setSupplyFormNote(e.target.value.replace(/\r\n?/g, '\n'))}
                  className={`mt-1 ${inputClass} min-h-[4.5rem]`}
                />
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                <p className={settingsLabelClass}>Позиции</p>
                <p className="mt-1 text-xs text-gray-500">
                  Ищите товар по артикулу (SKU) и добавляйте в поставку.
                </p>
                {draft.catalog.length > 0 ? (
                  <>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={supplyLineSkuQuery}
                        onChange={(e) => setSupplyLineSkuQuery(e.target.value)}
                        placeholder="Поиск по артикулу, например HD-OVR-001"
                        className={inputClass}
                        aria-label="Поиск товара по артикулу для поставки"
                      />
                    </div>
                    {supplyLineSkuQuery.trim().length > 0 ? (
                      supplyLineSkuMatches.length === 0 ? (
                        <p className="mt-2 text-xs text-gray-500">Ничего не найдено по этому артикулу.</p>
                      ) : (
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                          {supplyLineSkuMatches.map((item) => (
                            <li
                              key={`supply-sku-search-${item.id}`}
                              className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="size-9 shrink-0 overflow-hidden rounded border border-white/10 bg-white/[0.04]">
                                  {item.imageUrls[0] ? (
                                    <img
                                      src={item.imageUrls[0]}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[9px] text-gray-500">
                                      Нет фото
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm text-gray-200">{item.name || 'Без названия'}</p>
                                  <p className="truncate text-[11px] text-gray-500">{item.sku}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => addSupplyFormLineProduct(item.id)}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-gray-200 transition hover:border-indigo-400/50 hover:bg-indigo-950/40 hover:text-white"
                              >
                                <PlusIcon className="size-3.5" aria-hidden />
                                Добавить
                              </button>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : null}
                    <div className="mt-3">
                      <p className="text-[11px] tracking-wide text-gray-500 uppercase">Добавленные позиции</p>
                      <p className="mt-1 text-[11px] text-gray-500">Всего: {supplyFormLines.length}</p>
                      {supplyFormLines.length > 0 ? (
                        <ul className="mt-2 flex flex-col gap-2">
                          {supplyFormLines.map((line, index) => {
                            const item = draft.catalog.find((p) => p.id === line.productId)
                            if (!item) return null
                            return (
                              <li
                                key={`supply-line-card-${line.productId}-${index}`}
                                className="group flex min-w-0 items-center gap-2.5 rounded-md border border-white/10 bg-white/[0.02] py-1.5 pl-2 pr-1.5"
                              >
                                <div className="size-8 shrink-0 overflow-hidden rounded border border-white/10 bg-white/[0.04]">
                                  {item.imageUrls[0] ? (
                                    <img
                                      src={item.imageUrls[0]}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[8px] leading-tight text-gray-500">
                                      Нет
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm leading-tight text-gray-200">
                                    {item.name || 'Без названия'}
                                  </p>
                                  <p className="truncate text-[11px] text-gray-500">{item.sku}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <label
                                    className="whitespace-nowrap text-[11px] text-gray-500"
                                    htmlFor={`supply-qty-${index}`}
                                  >
                                    Кол-во
                                  </label>
                                  <input
                                    id={`supply-qty-${index}`}
                                    type="number"
                                    min={0}
                                    value={line.quantity}
                                    onChange={(e) => {
                                      const v = Math.max(0, Math.floor(Number(e.target.value) || 0))
                                      setSupplyFormLines((prev) =>
                                        prev.map((row, i) => (i === index ? { ...row, quantity: v } : row)),
                                      )
                                    }}
                                    className={`${inputClass} w-14 py-1.5 text-center text-sm tabular-nums`}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSupplyFormLines((prev) => prev.filter((_, i) => i !== index))}
                                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-400 transition hover:border-rose-400/60 hover:bg-rose-950/40 hover:text-rose-200"
                                  aria-label="Убрать позицию"
                                  title="Убрать позицию"
                                >
                                  <XMarkIcon className="size-4" aria-hidden />
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">Позиции пока не добавлены — найдите товар по SKU выше.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">В каталоге нет товаров — добавьте их в разделе «Каталог товаров».</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4">
              {supplyDialogError ? (
                <p className="text-sm text-rose-400" role="alert">
                  {supplyDialogError}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={supplyDialogSaving}
                onClick={() => {
                  setSupplyDialogOpen(false)
                  setSupplyDialogEditId(null)
                  setSupplyDialogError(null)
                  setSupplyWarehouseQuery('')
                  setSupplySupplierQuery('')
                  setSupplyLineSkuQuery('')
                }}
                className="rounded-md border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-white/25 hover:bg-white/10 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={supplyDialogSaving}
                onClick={() => void confirmSupplyDialog()}
                className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-wait disabled:opacity-70"
              >
                {supplyDialogSaving ? 'Сохранение на сервер…' : 'Сохранить'}
              </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={defectDialogOpen}
        onClose={() => {
          setDefectDialogOpen(false)
          setDefectDialogEditId(null)
          setDefectWarehouseQuery('')
          setDefectSupplierQuery('')
          setDefectLineSkuQuery('')
        }}
        className="relative z-[120]"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex min-h-0 items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
          <DialogPanel className="relative my-auto max-h-[min(90dvh,720px)] w-full max-w-2xl overflow-y-auto rounded-xl bg-[#0d1b2a] px-4 py-6 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:px-5">
            <button
              type="button"
              onClick={() => {
                setDefectDialogOpen(false)
                setDefectDialogEditId(null)
                setDefectWarehouseQuery('')
                setDefectSupplierQuery('')
                setDefectLineSkuQuery('')
              }}
              className="absolute right-3.5 top-3 z-[122] rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть"
            >
              <XMarkIcon className="size-5" aria-hidden />
            </button>
            <DialogTitle className="pr-14 text-xl font-semibold tracking-tight text-white">
              {defectDialogEditId ? 'Редактирование записи брака' : 'Новая запись брака'}
            </DialogTitle>
            <p className="mt-1 text-sm text-gray-400">
              Склад, поставщик, дата, документ, оценка и позиции — как у поставок.
            </p>
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-1 gap-5 gap-x-6 sm:grid-cols-2 sm:items-start">
                <div className="min-w-0">
                  <span className={settingsLabelClass} id="defect-form-warehouse-label">
                    Склад поступления
                  </span>
                  <Combobox
                    value={selectedDefectWarehouse}
                    onChange={(w) => {
                      if (w) setDefectFormWarehouseId(w.id)
                    }}
                    onClose={() => setDefectWarehouseQuery('')}
                    by={(a, b) => Boolean(a && b && a.id === b.id)}
                  >
                    <div className="relative mt-1">
                      <ComboboxInput
                        aria-labelledby="defect-form-warehouse-label"
                        className={`${inputClass} pr-10`}
                        displayValue={(w: Warehouse | null) => w?.name ?? ''}
                        placeholder="Название или адрес склада…"
                        onChange={(e) => setDefectWarehouseQuery(e.target.value)}
                      />
                      <ComboboxButton
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 text-gray-400 transition hover:text-white"
                      >
                        <ChevronDownIcon className="size-4 shrink-0" aria-hidden />
                      </ComboboxButton>
                    </div>
                    <ComboboxOptions
                      modal={false}
                      anchor="bottom start"
                      transition
                      className="z-[130] mt-1 max-h-60 w-[var(--input-width)] overflow-auto rounded-md border border-white/10 bg-[#0d1b2a] py-1 shadow-xl ring-1 ring-white/10 [--anchor-gap:4px] transition data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in empty:invisible"
                    >
                      {filteredDefectWarehouses.length === 0 ? (
                        <div className="px-3 py-2.5 text-sm text-gray-500">Ничего не найдено</div>
                      ) : (
                        filteredDefectWarehouses.map((w) => (
                          <ComboboxOption
                            key={w.id}
                            value={w}
                            className="cursor-pointer px-3 py-2 text-left text-sm data-focus:bg-white/10 data-selected:bg-indigo-500/15"
                          >
                            <span className="block font-medium text-white">{w.name}</span>
                            {w.address ? (
                              <span className="mt-0.5 block truncate text-xs text-gray-500">{w.address}</span>
                            ) : null}
                          </ComboboxOption>
                        ))
                      )}
                    </ComboboxOptions>
                  </Combobox>
                </div>
                <div className="min-w-0">
                  <span className={settingsLabelClass} id="defect-form-supplier-label">
                    Поставщик
                  </span>
                  <Combobox
                    value={selectedDefectSupplier}
                    onChange={(v) => {
                      if (v) setDefectFormSupplierId(v.id)
                    }}
                    onClose={() => setDefectSupplierQuery('')}
                    by={(a, b) => Boolean(a && b && a.id === b.id)}
                  >
                    <div className="relative mt-1">
                      <ComboboxInput
                        aria-labelledby="defect-form-supplier-label"
                        className={`${inputClass} pr-10`}
                        displayValue={(s: Supplier | null) => s?.name ?? ''}
                        placeholder="Название организации или реквизиты…"
                        onChange={(e) => setDefectSupplierQuery(e.target.value)}
                      />
                      <ComboboxButton
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 text-gray-400 transition hover:text-white"
                      >
                        <ChevronDownIcon className="size-4 shrink-0" aria-hidden />
                      </ComboboxButton>
                    </div>
                    <ComboboxOptions
                      modal={false}
                      anchor="bottom start"
                      transition
                      className="z-[130] mt-1 max-h-60 w-[var(--input-width)] overflow-auto rounded-md border border-white/10 bg-[#0d1b2a] py-1 shadow-xl ring-1 ring-white/10 [--anchor-gap:4px] transition data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in empty:invisible"
                    >
                      {filteredDefectSuppliers.length === 0 ? (
                        <div className="px-3 py-2.5 text-sm text-gray-500">Ничего не найдено</div>
                      ) : (
                        filteredDefectSuppliers.map((s) => (
                          <ComboboxOption
                            key={s.id}
                            value={s}
                            className="cursor-pointer px-3 py-2 text-left text-sm data-focus:bg-white/10 data-selected:bg-indigo-500/15"
                          >
                            <span className="block font-medium text-white">{s.name}</span>
                            {s.requisites ? (
                              <span className="mt-0.5 block truncate text-xs text-gray-500">{s.requisites}</span>
                            ) : null}
                          </ComboboxOption>
                        ))
                      )}
                    </ComboboxOptions>
                  </Combobox>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 gap-x-6 sm:grid-cols-2 sm:items-start">
                <div className="min-w-0">
                  <label className={settingsLabelClass} htmlFor="defect-form-date">
                    Дата
                  </label>
                  <input
                    id="defect-form-date"
                    type="date"
                    value={defectFormDate}
                    onChange={(e) => setDefectFormDate(e.target.value)}
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div className="min-w-0">
                  <label className={settingsLabelClass} htmlFor="defect-form-doc">
                    Номер документа
                  </label>
                  <input
                    id="defect-form-doc"
                    type="text"
                    value={defectFormDocument}
                    onChange={(e) => setDefectFormDocument(e.target.value)}
                    className={`mt-1 ${inputClass}`}
                    placeholder="УПД, акт…"
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <p className={settingsLabelClass} id="defect-form-rating-label">
                    Оценка
                  </p>
                  <SupplyRatingStarsInput
                    labelId="defect-form-rating-label"
                    value={defectFormRating}
                    onChange={(n) => setDefectFormRating(Math.min(5, Math.max(0, n)))}
                  />
                </div>
              </div>
              <div>
                <label className={settingsLabelClass} htmlFor="defect-form-note">
                  Примечание
                </label>
                <textarea
                  id="defect-form-note"
                  rows={3}
                  value={defectFormNote}
                  onChange={(e) => setDefectFormNote(e.target.value.replace(/\r\n?/g, '\n'))}
                  className={`mt-1 ${inputClass} min-h-[4.5rem]`}
                />
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                <p className={settingsLabelClass}>Позиции</p>
                <p className="mt-1 text-xs text-gray-500">Ищите товар по артикулу (SKU) и добавляйте в запись.</p>
                {draft.catalog.length > 0 ? (
                  <>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={defectLineSkuQuery}
                        onChange={(e) => setDefectLineSkuQuery(e.target.value)}
                        placeholder="Поиск по артикулу, например HD-OVR-001"
                        className={inputClass}
                        aria-label="Поиск товара по артикулу для записи брака"
                      />
                    </div>
                    {defectLineSkuQuery.trim().length > 0 ? (
                      defectLineSkuMatches.length === 0 ? (
                        <p className="mt-2 text-xs text-gray-500">Ничего не найдено по этому артикулу.</p>
                      ) : (
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                          {defectLineSkuMatches.map((item) => (
                            <li
                              key={`defect-sku-search-${item.id}`}
                              className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="size-9 shrink-0 overflow-hidden rounded border border-white/10 bg-white/[0.04]">
                                  {item.imageUrls[0] ? (
                                    <img
                                      src={item.imageUrls[0]}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[9px] text-gray-500">
                                      Нет фото
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm text-gray-200">{item.name || 'Без названия'}</p>
                                  <p className="truncate text-[11px] text-gray-500">{item.sku}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => addDefectFormLineProduct(item.id)}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-gray-200 transition hover:border-indigo-400/50 hover:bg-indigo-950/40 hover:text-white"
                              >
                                <PlusIcon className="size-3.5" aria-hidden />
                                Добавить
                              </button>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : null}
                    <div className="mt-3">
                      <p className="text-[11px] tracking-wide text-gray-500 uppercase">Добавленные позиции</p>
                      <p className="mt-1 text-[11px] text-gray-500">Всего: {defectFormLines.length}</p>
                      {defectFormLines.length > 0 ? (
                        <ul className="mt-2 flex flex-col gap-2">
                          {defectFormLines.map((line, index) => {
                            const item = draft.catalog.find((p) => p.id === line.productId)
                            if (!item) return null
                            return (
                              <li
                                key={`defect-line-card-${line.productId}-${index}`}
                                className="group flex min-w-0 items-center gap-2.5 rounded-md border border-white/10 bg-white/[0.02] py-1.5 pl-2 pr-1.5"
                              >
                                <div className="size-8 shrink-0 overflow-hidden rounded border border-white/10 bg-white/[0.04]">
                                  {item.imageUrls[0] ? (
                                    <img
                                      src={item.imageUrls[0]}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[8px] leading-tight text-gray-500">
                                      Нет
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm leading-tight text-gray-200">
                                    {item.name || 'Без названия'}
                                  </p>
                                  <p className="truncate text-[11px] text-gray-500">{item.sku}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <label
                                    className="whitespace-nowrap text-[11px] text-gray-500"
                                    htmlFor={`defect-qty-${index}`}
                                  >
                                    Кол-во
                                  </label>
                                  <input
                                    id={`defect-qty-${index}`}
                                    type="number"
                                    min={0}
                                    value={line.quantity}
                                    onChange={(e) => {
                                      const v = Math.max(0, Math.floor(Number(e.target.value) || 0))
                                      setDefectFormLines((prev) =>
                                        prev.map((row, i) => (i === index ? { ...row, quantity: v } : row)),
                                      )
                                    }}
                                    className={`${inputClass} w-14 py-1.5 text-center text-sm tabular-nums`}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setDefectFormLines((prev) => prev.filter((_, i) => i !== index))}
                                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-400 transition hover:border-rose-400/60 hover:bg-rose-950/40 hover:text-rose-200"
                                  aria-label="Убрать позицию"
                                  title="Убрать позицию"
                                >
                                  <XMarkIcon className="size-4" aria-hidden />
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">Позиции пока не добавлены — найдите товар по SKU выше.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">В каталоге нет товаров — добавьте их в разделе «Каталог товаров».</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4">
              {defectDialogError ? (
                <p className="text-sm text-rose-400" role="alert">
                  {defectDialogError}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={defectDialogSaving}
                onClick={() => {
                  setDefectDialogOpen(false)
                  setDefectDialogEditId(null)
                  setDefectDialogError(null)
                  setDefectWarehouseQuery('')
                  setDefectSupplierQuery('')
                  setDefectLineSkuQuery('')
                }}
                className="rounded-md border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-white/25 hover:bg-white/10 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={defectDialogSaving}
                onClick={() => void confirmDefectDialog()}
                className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-wait disabled:opacity-70"
              >
                {defectDialogSaving ? 'Сохранение на сервер…' : 'Сохранить'}
              </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={warehousesDialogOpen}
        onClose={() => setWarehousesDialogOpen(false)}
        className="relative z-[120]"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex min-h-0 items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
          <DialogPanel
            ref={warehousesDialogPanelRef}
            className="relative my-auto grid min-h-0 max-h-[min(86dvh,720px)] w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] gap-5 overflow-hidden rounded-xl bg-[#0d1b2a] px-4 py-6 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:px-5"
          >
            <button
              type="button"
              onClick={() => setWarehousesDialogOpen(false)}
              className="absolute right-3.5 top-3 z-[122] rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть окно складов"
            >
              <XMarkIcon className="size-5" aria-hidden />
            </button>
            <DialogTitle className="pr-14 text-2xl font-semibold tracking-tight text-white">
              Редактирование складов
            </DialogTitle>
            <div className="min-h-0 min-w-0 overflow-hidden">
              <PanelScrollArea
                className="h-full min-h-0 min-w-0"
                pinRailToViewport
                pinnedRailClassName={profileDialogPinnedScrollbarRailClass}
                pinnedRailStyle={warehousesDialogPinnedRailStyle}
                scrollbarAutoHideAfterIdleMs={900}
                viewportClassName="min-w-0 pr-1 pb-2 sm:pr-1.5"
                propagateWheelToPage={false}
              >
                <p className="mb-3 text-xs text-gray-400">
                  Изменения сразу отражаются в таблице. Запись в черновик — «Сохранить» в этом окне или внизу страницы.
                </p>
                <div
                  className="mb-2 hidden gap-2 px-1 text-xs font-medium text-gray-400 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem]"
                  role="presentation"
                >
                  <div>Название склада</div>
                  <div>Адрес</div>
                  <span className="sr-only">Удалить</span>
                </div>
                <ul className="flex flex-col gap-3">
                  {draft.warehouses.map((w) => (
                    <li key={w.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] sm:items-start">
                        <div className="min-w-0">
                          <label className="mb-1 block text-xs font-medium text-gray-500 sm:sr-only">
                            Название склада
                          </label>
                          <input
                            type="text"
                            value={w.name}
                            onChange={(e) => patchWarehouse(w.id, { name: e.target.value })}
                            className={inputClass}
                            aria-label="Название склада"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="mb-1 block text-xs font-medium text-gray-500 sm:sr-only">Адрес</label>
                          <input
                            type="text"
                            value={w.address}
                            onChange={(e) => patchWarehouse(w.id, { address: e.target.value })}
                            className={inputClass}
                            placeholder="Улица, дом, город"
                            aria-label="Адрес склада"
                          />
                        </div>
                        <div className="flex justify-end sm:justify-start">
                          <button
                            type="button"
                            onClick={() => removeWarehouse(w.id)}
                            disabled={draft.warehouses.length <= 1}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-400 transition hover:border-rose-500/40 hover:bg-rose-950/25 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Удалить склад ${w.name}`}
                            title="Удалить склад"
                          >
                            <TrashIcon className="size-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={addWarehouse}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-white/20 bg-white/[0.02] px-3 py-2.5 text-sm font-medium text-gray-300 transition hover:border-indigo-500/40 hover:bg-indigo-950/20 hover:text-indigo-100"
                >
                  <PlusIcon className="size-4" aria-hidden />
                  Добавить склад
                </button>
              </PanelScrollArea>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={persistProductsInventory}
                className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Сохранить
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={stocksAddDialogOpen}
        onClose={() => setStocksAddDialogOpen(false)}
        className="relative z-[120]"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex min-h-0 items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
          <DialogPanel
            ref={stocksAddDialogPanelRef}
            className="relative my-auto grid min-h-0 max-h-[min(86dvh,720px)] w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] gap-5 overflow-hidden rounded-xl bg-[#0d1b2a] px-4 py-6 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:px-5"
          >
            <button
              type="button"
              onClick={() => setStocksAddDialogOpen(false)}
              className="absolute right-3.5 top-3 z-[122] rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть окно добавления остатков"
            >
              <XMarkIcon className="size-5" aria-hidden />
            </button>
            <DialogTitle className="pr-14 text-2xl font-semibold tracking-tight text-white">
              Добавить остатки по товарам
            </DialogTitle>
            <div className="min-h-0 min-w-0 overflow-hidden">
              <PanelScrollArea
                className="h-full min-h-0 min-w-0"
                pinRailToViewport
                pinnedRailClassName={profileDialogPinnedScrollbarRailClass}
                pinnedRailStyle={stocksAddDialogPinnedRailStyle}
                scrollbarAutoHideAfterIdleMs={900}
                viewportClassName="min-w-0 pr-1 pb-2 sm:pr-1.5"
                propagateWheelToPage={false}
              >
                <p className="mb-3 text-xs text-gray-400">
                  Товары из каталога без строки остатков можно добавить сюда (например, если данные пришли без учёта).
                  Нулевые значения вводите на вкладке «Остатки» (в шестерёнке отметьте один склад). Запись в черновик —
                  «Сохранить» в этом
                  окне или внизу страницы.
                </p>
                <div className="relative mb-3">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={stocksAddDialogQuery}
                    onChange={(e) => setStocksAddDialogQuery(e.target.value)}
                    placeholder="Поиск по SKU, названию…"
                    className={`${inputClass} pl-9`}
                    aria-label="Поиск товаров для добавления в остатки"
                  />
                </div>
                {draft.catalog.length === 0 ? (
                  <p className="rounded-md border border-dashed border-white/15 bg-white/[0.02] px-3 py-6 text-center text-sm text-gray-400">
                    В каталоге пока нет товаров. Добавьте позиции в разделе «Каталог товаров».
                  </p>
                ) : (
                  <>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                      <span className="text-xs text-gray-500">
                        Без строки остатков: {catalogProductsWithoutStockRow.length}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          addStockRowsForProductIds(
                            stocksAddDialogList.filter((p) => !stocksByProduct.has(p.id)).map((p) => p.id),
                          )
                        }
                        disabled={!stocksAddDialogList.some((p) => !stocksByProduct.has(p.id))}
                        className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Добавить все без остатков (в списке)
                      </button>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {stocksAddDialogList.map((p) => {
                        const hasStock = stocksByProduct.has(p.id)
                        return (
                          <li
                            key={p.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">{p.name}</p>
                              <p className="mt-0.5 font-mono text-xs text-gray-500">{p.sku}</p>
                            </div>
                            {hasStock ? (
                              <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-gray-500">
                                Уже в остатках
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addStockRowsForProductIds([p.id])}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-indigo-500/35 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-100 transition hover:border-indigo-400/50 hover:bg-indigo-500/20"
                              >
                                <PlusIcon className="size-4" aria-hidden />
                                Добавить
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    {stocksAddDialogList.length === 0 ? (
                      <p className="mt-3 text-center text-sm text-gray-500">Ничего не найдено по запросу.</p>
                    ) : null}
                  </>
                )}
              </PanelScrollArea>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={persistProductsInventory}
                className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Сохранить
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <ProfileSaveToast
        open={savedFlash}
        onDismiss={() => setSavedFlash(false)}
        message="Спасибо, что обновили остатки по складам — изменения сохранены."
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
