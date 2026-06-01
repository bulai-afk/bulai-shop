import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CheckIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import type { CSSProperties, FormEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  fetchAdminProductsDictionariesFromApi,
  fetchAdminProductsInventoryFromApi,
  putAdminProductsDictionariesToApi,
  putAdminProductsInventoryToApi,
} from '../../api/adminDataApi'
import { isSiteConfigApiExpected } from '../../constants/apiBase'
import { BelarusRubleSign } from '../../components/BelarusRubleSign'
import { PanelScrollArea } from '../../components/PanelScrollArea'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import { profileDialogPinnedScrollbarRailClass } from '../../components/scrollbarShared'
import { buildDefaultProductsInventory } from '../data/siteSettingsDefaults'
import {
  PRODUCTS_DICTIONARIES_UPDATED_EVENT,
  loadProductsDictionariesDraft,
  loadProductsInventoryDraft,
  saveProductsDictionariesDraft,
  saveProductsInventoryDraft,
} from '../lib/adminDraftStorage'
import type {
  ProductCatalogRow,
  ProductsDictionariesDraft,
  ProductsInventoryDraft,
} from '../types/siteSettings'
import { adminPriceFieldLabel } from '../../lib/formatMoney'
import { getPageScrollElement } from '../../utils/getPageScrollElement'

const inputClass =
  'block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
/** Без стрелок у `type="number"` (Chrome / Firefox / Safari). */
const priceInputClass = `${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'

function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}
const defaultSkuPrefix = 'MODEL'
const recommendedProductsLimit = 4
/** Как в `ProfileDialog`: рельс скролла не доходит до верха/низа панели на половину значения. */
const PRODUCT_DIALOG_SCROLL_RAIL_HEIGHT_TRIM_PX = 80
const multiValueSeparator = '||'

function decodeMultiValue(value: string): string[] {
  return value
    .split(multiValueSeparator)
    .map((part) => part.trim())
    .filter(Boolean)
}

function encodeMultiValue(values: string[]): string {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).join(multiValueSeparator)
}

function getCatalogSortComparable(
  row: ProductCatalogRow,
  columnId: string,
): string | number {
  if (columnId === 'sku') return row.sku
  if (columnId === 'name') return row.name
  if (columnId === 'price') return row.price
  if (columnId.startsWith('dict:')) {
    const dictionaryId = columnId.replace('dict:', '')
    return decodeMultiValue(getDictionaryValue(row, dictionaryId)).join(', ')
  }
  return ''
}

function compareCatalogRowsByColumn(
  a: ProductCatalogRow,
  b: ProductCatalogRow,
  columnId: string,
  direction: 'asc' | 'desc',
): number {
  const va = getCatalogSortComparable(a, columnId)
  const vb = getCatalogSortComparable(b, columnId)
  let cmp = 0
  if (typeof va === 'number' && typeof vb === 'number') {
    cmp = va - vb
  } else {
    cmp = String(va).localeCompare(String(vb), 'ru', { numeric: true, sensitivity: 'base' })
  }
  return direction === 'asc' ? cmp : -cmp
}

function rowMatchesCatalogSearch(row: ProductCatalogRow, query: string): boolean {
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

function getSkuDictionaryValue(row: ProductCatalogRow, dictionaryId: string): string {
  if (dictionaryId === 'size') return row.size
  if (dictionaryId === 'color') return row.color
  if (dictionaryId === 'availability') return row.availability
  return row.attributes[dictionaryId] ?? ''
}

function getSkuSegmentByDictionaryOrder(
  row: ProductCatalogRow,
  dictionaryId: string,
  dictionaries: ProductsDictionariesDraft['dictionaries'],
): string {
  const dictionary = dictionaries.find((d) => d.id === dictionaryId)
  if (!dictionary || dictionary.values.length === 0) return '0'
  const rowValue = decodeMultiValue(getSkuDictionaryValue(row, dictionaryId))[0] ?? ''
  const idx = dictionary.values.findIndex((item) => {
    if (dictionaryId === 'availability') return normalizeAvailability(item.value) === rowValue
    return item.value === rowValue
  })
  return String(idx >= 0 ? idx + 1 : 0)
}

function buildSkuBaseFromRow(
  row: ProductCatalogRow,
  skuSourceDictionaryIds: string[],
  dictionaries: ProductsDictionariesDraft['dictionaries'],
): string {
  const segments = skuSourceDictionaryIds.map((dictionaryId) =>
    getSkuSegmentByDictionaryOrder(row, dictionaryId, dictionaries),
  )
  return segments.length > 0 ? segments.join('') : defaultSkuPrefix
}

function applyDynamicSku(
  catalog: ProductCatalogRow[],
  skuSourceDictionaryIds: string[],
  dictionaries: ProductsDictionariesDraft['dictionaries'],
): ProductCatalogRow[] {
  const baseById = new Map<string, string>()
  catalog.forEach((row) => baseById.set(row.id, buildSkuBaseFromRow(row, skuSourceDictionaryIds, dictionaries)))

  const counters = new Map<string, number>()
  return catalog.map((row) => {
    const base = baseById.get(row.id) ?? defaultSkuPrefix
    const nextIndex = (counters.get(base) ?? 0) + 1
    counters.set(base, nextIndex)
    return { ...row, sku: `${base}-${String(nextIndex).padStart(3, '0')}` }
  })
}

function normalizeAvailability(value: string): ProductCatalogRow['availability'] {
  const v = value.trim().toLowerCase()
  if (v === 'in_stock' || v === 'в наличии') return 'in_stock'
  if (v === 'out_of_stock' || v === 'нет в наличии') return 'out_of_stock'
  return 'preorder'
}

function getDictionaryValue(row: ProductCatalogRow, dictionaryId: string): string {
  if (dictionaryId === 'size') return row.size
  if (dictionaryId === 'color') return row.color
  if (dictionaryId === 'availability') return row.availability
  return row.attributes[dictionaryId] ?? ''
}

function getDictionaryOptionValue(dictionaryId: string, option: string): string {
  if (dictionaryId === 'availability') return normalizeAvailability(option)
  return option
}

function closeDropdownFromChild(target: EventTarget | null) {
  const details = target instanceof HTMLElement ? target.closest('details') : null
  if (details instanceof HTMLDetailsElement) details.open = false
}

function DictionaryDropdown({
  dictionary,
  value,
  onChange,
  ariaLabel,
}: {
  dictionary: ProductsDictionariesDraft['dictionaries'][number]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}) {
  const options = dictionary.values
    .map((item) => ({
      label: item.value,
      key: getDictionaryOptionValue(dictionary.id, item.value),
      color: item.color,
    }))
    .filter((item) => item.label.trim().length > 0)
  const selectedKeys = decodeMultiValue(value)
  const selected = options.filter((item) => selectedKeys.includes(item.key))

  const toggleOption = (key: string) => {
    const next = selectedKeys.includes(key)
      ? selectedKeys.filter((item) => item !== key)
      : [...selectedKeys, key]
    onChange(encodeMultiValue(next))
  }

  return (
    <details className="group relative">
      <summary
        className={`${inputClass} flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden`}
        aria-label={ariaLabel}
      >
        <span className="flex min-w-0 items-center gap-2">
          {(() => {
            const swatch = selected.find((s) => isValidHexColor(s.color))
            return swatch ? (
              <span
                aria-hidden
                className="size-3.5 shrink-0 rounded-full border border-white/25"
                style={{ backgroundColor: swatch.color }}
              />
            ) : null
          })()}
          <span className="truncate">
            {selected.length > 0 ? selected.map((item) => item.label).join(', ') : 'Не выбрано'}
          </span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-gray-400 transition group-open:rotate-180" />
      </summary>

      <div className="absolute inset-x-0 z-30 mt-1 max-h-56 overflow-auto rounded-md border border-white/15 bg-gray-900/95 p-1 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={(e) => {
            onChange('')
            closeDropdownFromChild(e.currentTarget)
          }}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-200 transition hover:bg-white/10"
        >
          Не выбрано
        </button>
        {options.map((item) => (
          <button
            key={`${dictionary.id}-${item.label}`}
            type="button"
            onClick={() => toggleOption(item.key)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-200 transition hover:bg-white/10"
          >
            <span
              className={`relative inline-flex size-4 shrink-0 items-center justify-center rounded border transition ${
                selectedKeys.includes(item.key)
                  ? 'border-indigo-400/80 bg-indigo-500/25'
                  : 'border-white/40 bg-white/[0.06]'
              }`}
              aria-hidden
            >
              {selectedKeys.includes(item.key) ? (
                <CheckIcon className="size-3 text-indigo-200" />
              ) : null}
            </span>
            {isValidHexColor(item.color) ? (
              <span
                aria-hidden
                className="size-3.5 shrink-0 rounded-full border border-white/25"
                style={{ backgroundColor: item.color }}
              />
            ) : null}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </details>
  )
}

export function AdminProductsCatalogPage() {
  const [draft, setDraft] = useState<ProductsInventoryDraft>(() => buildDefaultProductsInventory())
  const [dictionariesDraft, setDictionariesDraft] = useState<ProductsDictionariesDraft>(() =>
    loadProductsDictionariesDraft(),
  )
  const [savedFlash, setSavedFlash] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  /** null — ещё не проверяли API; true — в БД нет снимка каталога или он пустой. */
  const [dbCatalogEmpty, setDbCatalogEmpty] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [previewProductId, setPreviewProductId] = useState<string | null>(null)
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([])
  const [columnVisibilityInitialized, setColumnVisibilityInitialized] = useState(false)
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const [dragColumnId, setDragColumnId] = useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = useState<string | null>(null)
  const [dragImageIndex, setDragImageIndex] = useState<number | null>(null)
  const [dropImageIndex, setDropImageIndex] = useState<number | null>(null)
  const [recommendedSkuQuery, setRecommendedSkuQuery] = useState('')
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('')
  const [catalogSortColumnId, setCatalogSortColumnId] = useState<string | null>(null)
  const [catalogSortDirection, setCatalogSortDirection] = useState<'asc' | 'desc'>('asc')
  const columnsMenuRef = useRef<HTMLDivElement | null>(null)
  const productImageInputRef = useRef<HTMLInputElement | null>(null)
  const productDialogPanelRef = useRef<HTMLElement | null>(null)
  const [productDialogPinnedRailStyle, setProductDialogPinnedRailStyle] = useState<
    CSSProperties | undefined
  >(undefined)

  const syncProductDialogPinnedRail = useCallback(() => {
    const el = productDialogPanelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const inset = PRODUCT_DIALOG_SCROLL_RAIL_HEIGHT_TRIM_PX / 2
    setProductDialogPinnedRailStyle({
      top: rect.top + inset,
      height: Math.max(0, rect.height - PRODUCT_DIALOG_SCROLL_RAIL_HEIGHT_TRIM_PX),
      right: Math.max(0, window.innerWidth - rect.right + 5),
    })
  }, [])

  useEffect(() => {
    setDraft(loadProductsInventoryDraft())
    setDictionariesDraft(loadProductsDictionariesDraft())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isSiteConfigApiExpected()) return
    let cancelled = false
    ;(async () => {
      try {
        const [inv, dict] = await Promise.all([
          fetchAdminProductsInventoryFromApi(),
          fetchAdminProductsDictionariesFromApi(),
        ])
        if (cancelled) return
        if (dict != null) {
          saveProductsDictionariesDraft(dict)
          setDictionariesDraft(loadProductsDictionariesDraft())
        }
        if (inv != null) {
          saveProductsInventoryDraft(inv)
          setDraft(loadProductsInventoryDraft())
          setDbCatalogEmpty(!Array.isArray(inv.catalog) || inv.catalog.length === 0)
        } else if (isSiteConfigApiExpected()) {
          setDbCatalogEmpty(true)
        }
      } catch {
        /* остаётся черновик из localStorage */
        if (isSiteConfigApiExpected()) setDbCatalogEmpty(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const syncDictionaries = () => setDictionariesDraft(loadProductsDictionariesDraft())
    window.addEventListener(PRODUCTS_DICTIONARIES_UPDATED_EVENT, syncDictionaries)
    window.addEventListener('storage', syncDictionaries)
    return () => {
      window.removeEventListener(PRODUCTS_DICTIONARIES_UPDATED_EVENT, syncDictionaries)
      window.removeEventListener('storage', syncDictionaries)
    }
  }, [])

  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      catalog: applyDynamicSku(
        prev.catalog,
        dictionariesDraft.skuSourceDictionaryIds,
        dictionariesDraft.dictionaries,
      ),
    }))
  }, [dictionariesDraft])

  useEffect(() => {
    if (!previewProductId) return
    const el = getPageScrollElement()
    const prevOverflow = el.style.overflow
    el.style.overflow = 'hidden'
    return () => {
      el.style.overflow = prevOverflow
    }
  }, [previewProductId])

  useEffect(() => {
    if (previewProductId) return
    setDragImageIndex(null)
    setDropImageIndex(null)
    setRecommendedSkuQuery('')
  }, [previewProductId])

  useLayoutEffect(() => {
    if (!previewProductId) {
      setProductDialogPinnedRailStyle(undefined)
      return
    }
    let ro: ResizeObserver | null = null
    const raf = window.requestAnimationFrame(() => {
      syncProductDialogPinnedRail()
      const el = productDialogPanelRef.current
      if (el) {
        ro = new ResizeObserver(() => syncProductDialogPinnedRail())
        ro.observe(el)
      }
    })
    window.addEventListener('resize', syncProductDialogPinnedRail)
    return () => {
      window.cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', syncProductDialogPinnedRail)
    }
  }, [previewProductId, syncProductDialogPinnedRail])

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

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setApiError(null)
    saveProductsInventoryDraft(draft)
    saveProductsDictionariesDraft(dictionariesDraft)
    if (isSiteConfigApiExpected()) {
      try {
        await Promise.all([
          putAdminProductsInventoryToApi(draft),
          putAdminProductsDictionariesToApi(dictionariesDraft),
        ])
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'Не удалось сохранить в базу.')
        return
      }
      setDbCatalogEmpty(draft.catalog.length === 0)
    }
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  const updateRow = (id: string, patch: Partial<ProductCatalogRow>) => {
    setDraft((prev) => ({
      ...prev,
      catalog: applyDynamicSku(
        prev.catalog.map((row) => (row.id === id ? { ...row, ...patch } : row)),
        dictionariesDraft.skuSourceDictionaryIds,
        dictionariesDraft.dictionaries,
      ),
    }))
  }

  const addRow = () => {
    const currentDictionaries = loadProductsDictionariesDraft()
    const byId = new Map(currentDictionaries.dictionaries.map((d) => [d.id, d]))
    const defaultSize = byId.get('size')?.values[0]?.value ?? 'M'
    const defaultColor = byId.get('color')?.values[0]?.value ?? 'Черный'
    const defaultAvailability = normalizeAvailability(byId.get('availability')?.values[0]?.value ?? 'preorder')
    const defaultAttributes = currentDictionaries.dictionaries.reduce<Record<string, string>>((acc, d) => {
      if (d.id === 'size' || d.id === 'color' || d.id === 'availability') return acc
      acc[d.id] = d.values[0]?.value ?? ''
      return acc
    }, {})
    setDraft((prev) => ({
      ...prev,
      catalog: applyDynamicSku(
        [
          ...prev.catalog,
          {
            id: `new-${Date.now()}`,
            sku: '',
            name: 'Новый товар',
            description: '',
            imageUrls: [],
            recommendedProductIds: [],
            size: defaultSize,
            color: defaultColor,
            price: 0,
            discountPercent: 0,
            discountValidFrom: '',
            discountValidTo: '',
            availability: defaultAvailability,
            attributes: defaultAttributes,
          },
        ],
        currentDictionaries.skuSourceDictionaryIds,
        currentDictionaries.dictionaries,
      ),
    }))
  }

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id),
    )
  }

  const duplicateSelectedRows = () => {
    if (selectedIds.length !== 1) return
    setDraft((prev) => {
      const selectedSet = new Set(selectedIds)
      const rowsToCopy = prev.catalog.filter((row) => selectedSet.has(row.id))
      if (!rowsToCopy.length) return prev

      const idMap = new Map<string, string>()
      const timestamp = Date.now()
      const copiedRows = rowsToCopy.map((row, index) => {
        const newId = `copy-${timestamp}-${index}`
        idMap.set(row.id, newId)
        return {
          ...row,
          id: newId,
          sku: `${row.sku}-COPY`,
          name: `${row.name} (копия)`,
        }
      })

      const copiedStocks = prev.stocks
        .filter((stock) => selectedSet.has(stock.productId))
        .map((stock) => ({
          ...stock,
          productId: idMap.get(stock.productId) ?? stock.productId,
          byWarehouse: { ...stock.byWarehouse },
        }))

      return {
        ...prev,
        catalog: applyDynamicSku(
          [...prev.catalog, ...copiedRows],
          dictionariesDraft.skuSourceDictionaryIds,
          dictionariesDraft.dictionaries,
        ),
        stocks: [...prev.stocks, ...copiedStocks],
      }
    })
    setSelectedIds([])
  }

  const removeSelectedRows = () => {
    if (!selectedIds.length) return
    setDraft((prev) => {
      const selectedSet = new Set(selectedIds)
      return {
        ...prev,
        catalog: prev.catalog
          .filter((row) => !selectedSet.has(row.id))
          .map((row) => ({
            ...row,
            recommendedProductIds: row.recommendedProductIds.filter((id) => !selectedSet.has(id)),
          })),
        stocks: prev.stocks.filter((s) => !selectedSet.has(s.productId)),
        supplies: prev.supplies
          .map((s) => ({
            ...s,
            lines: s.lines.filter((l) => !selectedSet.has(l.productId)),
          }))
          .filter((s) => s.lines.length > 0),
      }
    })
    setSelectedIds([])
  }

  const toggleRecommendedProduct = (
    productId: string,
    recommendedProductId: string,
    checked: boolean,
  ) => {
    setDraft((prev) => ({
      ...prev,
      catalog: prev.catalog.map((row) => {
        if (row.id !== productId) return row
        const current = row.recommendedProductIds.filter((id) => id !== row.id)
        if (checked && !current.includes(recommendedProductId) && current.length >= recommendedProductsLimit) {
          return row
        }
        const next = checked
          ? Array.from(new Set([...current, recommendedProductId]))
          : current.filter((id) => id !== recommendedProductId)
        return { ...row, recommendedProductIds: next }
      }),
    }))
  }

  const addRecommendedProduct = (productId: string, recommendedProductId: string) => {
    toggleRecommendedProduct(productId, recommendedProductId, true)
  }

  const removeRecommendedProduct = (productId: string, recommendedProductId: string) => {
    toggleRecommendedProduct(productId, recommendedProductId, false)
  }

  const updateDictionaryValue = (productId: string, dictionaryId: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      catalog: applyDynamicSku(
        prev.catalog.map((row) => {
          if (row.id !== productId) return row
          const values = decodeMultiValue(value)
          if (dictionaryId === 'size') {
            return { ...row, size: encodeMultiValue(values.map((item) => item.toUpperCase())) }
          }
          if (dictionaryId === 'color') return { ...row, color: encodeMultiValue(values) }
          if (dictionaryId === 'availability') {
            return { ...row, availability: normalizeAvailability(values[0] ?? '') }
          }
          return { ...row, attributes: { ...row.attributes, [dictionaryId]: encodeMultiValue(values) } }
        }),
        dictionariesDraft.skuSourceDictionaryIds,
        dictionariesDraft.dictionaries,
      ),
    }))
  }

  const uploadPreviewImages = (productId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    const readers = imageFiles.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
          reader.readAsDataURL(file)
        }),
    )
    Promise.all(readers).then((images) => {
      const valid = images.filter((src) => src.length > 0)
      if (valid.length === 0) return
      setDraft((prev) => ({
        ...prev,
        catalog: prev.catalog.map((row) =>
          row.id === productId ? { ...row, imageUrls: [...row.imageUrls, ...valid] } : row,
        ),
      }))
    })
  }

  const previewProduct = previewProductId
    ? draft.catalog.find((product) => product.id === previewProductId) ?? null
    : null
  const tableDictionaries = dictionariesDraft.dictionaries
  const columnDefs = [
    { id: 'sku', label: 'SKU', width: '8rem' },
    { id: 'imageUrls', label: 'Фото', width: '4rem' },
    { id: 'name', label: 'Название', width: '14rem' },
    { id: 'price', label: adminPriceFieldLabel(), width: '9rem' },
    ...tableDictionaries.map((dictionary) => ({
      id: `dict:${dictionary.id}`,
      label: dictionary.name || dictionary.id,
      width: '9rem',
    })),
  ]
  const dictionaryColumnIds = columnDefs.filter((column) => column.id.startsWith('dict:')).map((column) => column.id)
  const baseColumnIds = columnDefs.map((column) => column.id)
  const [columnOrder, setColumnOrder] = useState<string[]>(baseColumnIds)

  useEffect(() => {
    setColumnOrder((prev) => {
      const kept = prev.filter((id) => baseColumnIds.includes(id))
      const appended = baseColumnIds.filter((id) => !kept.includes(id))
      return [...kept, ...appended]
    })
  }, [baseColumnIds.join('|')])

  useEffect(() => {
    if (!columnVisibilityInitialized) {
      setHiddenColumnIds(dictionaryColumnIds)
      setColumnVisibilityInitialized(true)
      return
    }
    // Новые справочники также скрываем по умолчанию, пока их не включат вручную.
    setHiddenColumnIds((prev) => {
      const next = [...prev]
      for (const id of dictionaryColumnIds) {
        if (!next.includes(id)) next.push(id)
      }
      return next
    })
  }, [columnVisibilityInitialized, dictionaryColumnIds.join('|')])

  const columnById = new Map(columnDefs.map((column) => [column.id, column]))
  const orderedColumnDefs = columnOrder
    .map((id) => columnById.get(id))
    .filter((column): column is { id: string; label: string; width: string } => Boolean(column))
  const visibleColumnDefs = orderedColumnDefs.filter((column) => !hiddenColumnIds.includes(column.id))
  const tableGridTemplate = `2rem ${visibleColumnDefs.map((c) => c.width).join(' ')} 2.5rem`
  const tableMinWidth = `${Math.max(860, 460 + visibleColumnDefs.length * 140)}px`

  const filteredCatalog = useMemo(() => {
    if (!catalogSearchQuery.trim()) return draft.catalog
    return draft.catalog.filter((row) => rowMatchesCatalogSearch(row, catalogSearchQuery))
  }, [draft.catalog, catalogSearchQuery])

  const filteredCatalogIdSet = useMemo(() => new Set(filteredCatalog.map((r) => r.id)), [filteredCatalog])

  const displayedCatalog = useMemo(() => {
    if (!catalogSortColumnId || catalogSortColumnId === 'imageUrls') return filteredCatalog
    const next = [...filteredCatalog]
    next.sort((a, b) =>
      compareCatalogRowsByColumn(a, b, catalogSortColumnId, catalogSortDirection),
    )
    return next
  }, [filteredCatalog, catalogSortColumnId, catalogSortDirection])

  const onCatalogColumnSortClick = (columnId: string) => {
    if (columnId === 'imageUrls') return
    if (catalogSortColumnId === columnId) {
      setCatalogSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setCatalogSortColumnId(columnId)
      setCatalogSortDirection('asc')
    }
  }

  const toggleColumnVisibility = (columnId: string, visible: boolean) => {
    setHiddenColumnIds((prev) =>
      visible ? prev.filter((id) => id !== columnId) : [...new Set([...prev, columnId])],
    )
  }

  const moveColumn = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return
    setColumnOrder((prev) => {
      const sourceIndex = prev.indexOf(sourceId)
      const targetIndex = prev.indexOf(targetId)
      if (sourceIndex < 0 || targetIndex < 0) return prev
      const next = [...prev]
      next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, sourceId)
      return next
    })
  }

  const moveProductImage = (productId: string, sourceIndex: number, targetIndex: number) => {
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return
    setDraft((prev) => ({
      ...prev,
      catalog: prev.catalog.map((row) => {
        if (row.id !== productId) return row
        if (sourceIndex >= row.imageUrls.length || targetIndex >= row.imageUrls.length) return row
        const next = [...row.imageUrls]
        const [moved] = next.splice(sourceIndex, 1)
        if (!moved) return row
        next.splice(targetIndex, 0, moved)
        return { ...row, imageUrls: next }
      }),
    }))
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
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Товары</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Каталог товаров</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Карточки товаров: SKU, название, фото, цена и характеристики из справочников.
        </p>
        {dbCatalogEmpty && draft.catalog.length > 0 && isSiteConfigApiExpected() ? (
          <p
            role="status"
            className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            На сайте эти товары появятся только после нажатия «Сохранить» внизу страницы — сейчас витрина не видит
            каталог в базе.
          </p>
        ) : null}

        <form onSubmit={onSave} className="mt-8 space-y-8">
          <section className={sectionClass}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-medium text-gray-200">Панель управления</p>
              <p className="text-xs text-gray-400">Выбрано: {selectedIds.length}</p>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
              <div className="relative min-w-0 w-full max-w-md flex-1">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                  aria-hidden
                />
                <input
                  type="search"
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  placeholder="Поиск по SKU, названию, описанию…"
                  className={`${inputClass} pl-9`}
                  aria-label="Поиск товаров в каталоге"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
                >
                  <PlusIcon className="size-4" />
                  Добавить товар
                </button>
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
                      {orderedColumnDefs.map((column) => (
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
              </div>
            </div>

            <div className="stable-scroll-x-purple overflow-x-auto">
              <div
                className="hidden gap-2 text-xs font-medium text-gray-400 sm:grid"
                style={{ gridTemplateColumns: tableGridTemplate, minWidth: tableMinWidth }}
              >
                <div className="flex items-center justify-center">
                  <TableCheckbox
                    checked={
                      filteredCatalog.length > 0 &&
                      filteredCatalog.every((row) => selectedIds.includes(row.id))
                    }
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredCatalog.map((r) => r.id)])))
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => !filteredCatalogIdSet.has(id)))
                      }
                    }}
                    ariaLabel="Выбрать все товары в текущей выдаче"
                  />
                </div>
                {visibleColumnDefs.map((column) => (
                  <div
                    key={column.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => {
                      if (dragColumnId && dragColumnId !== column.id) {
                        setDropTargetColumnId(column.id)
                      }
                    }}
                    onDragLeave={() => {
                      setDropTargetColumnId((prev) => (prev === column.id ? null : prev))
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const sourceId = e.dataTransfer.getData('text/plain') || dragColumnId
                      if (sourceId) moveColumn(sourceId, column.id)
                      setDragColumnId(null)
                      setDropTargetColumnId(null)
                    }}
                    className={`flex min-w-0 items-center justify-center rounded px-0.5 py-0.5 transition ${
                      dropTargetColumnId === column.id
                        ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40'
                        : ''
                    }`}
                  >
                    {column.id === 'imageUrls' ? (
                      <span
                        draggable
                        onDragStart={(e) => {
                          setDragColumnId(column.id)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', column.id)
                        }}
                        onDragEnd={() => {
                          setDragColumnId(null)
                          setDropTargetColumnId(null)
                        }}
                        className={`min-w-0 flex-1 cursor-grab touch-none truncate px-1 py-0.5 text-center select-none active:cursor-grabbing ${
                          dragColumnId === column.id ? 'opacity-60' : ''
                        }`}
                        title="Перетащите за название, чтобы изменить порядок столбцов"
                      >
                        {column.label}
                      </span>
                    ) : (
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          setDragColumnId(column.id)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', column.id)
                        }}
                        onDragEnd={() => {
                          setDragColumnId(null)
                          setDropTargetColumnId(null)
                        }}
                        onClick={() => onCatalogColumnSortClick(column.id)}
                        className={`flex min-w-0 flex-1 cursor-grab touch-none items-center justify-center gap-0.5 truncate rounded px-1 py-0.5 text-center transition select-none hover:bg-white/10 hover:text-gray-200 active:cursor-grabbing ${
                          catalogSortColumnId === column.id ? 'text-indigo-200' : ''
                        } ${dragColumnId === column.id ? 'opacity-60' : ''}`}
                        title="Клик — сортировка А→Я / Я→А. Перетащите за название — порядок столбцов."
                        aria-sort={
                          catalogSortColumnId === column.id
                            ? catalogSortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        <span className="truncate">{column.label}</span>
                        {catalogSortColumnId === column.id ? (
                          catalogSortDirection === 'asc' ? (
                            <ChevronUpIcon className="size-3.5 shrink-0 text-indigo-300" aria-hidden />
                          ) : (
                            <ChevronDownIcon className="size-3.5 shrink-0 text-indigo-300" aria-hidden />
                          )
                        ) : null}
                      </button>
                    )}
                  </div>
                ))}
                <span />
              </div>

              <ul className="mt-3 space-y-2">
                {filteredCatalog.length === 0 && draft.catalog.length > 0 ? (
                  <li className="rounded-md border border-dashed border-white/15 bg-white/[0.02] py-8 text-center text-sm text-gray-500">
                    Ничего не найдено. Измените запрос поиска.
                  </li>
                ) : null}
                {displayedCatalog.map((row) => (
                  <li
                    key={row.id}
                    className="grid gap-2"
                    style={{ gridTemplateColumns: tableGridTemplate, minWidth: tableMinWidth }}
                  >
                    <div className="flex items-center justify-center">
                      <TableCheckbox
                        checked={selectedIds.includes(row.id)}
                        onChange={(checked) => toggleRowSelection(row.id, checked)}
                        ariaLabel={`Выбрать товар ${row.name}`}
                      />
                    </div>
                    {visibleColumnDefs.map((column) => {
                        if (column.id === 'sku') {
                          return (
                            <input
                              key={column.id}
                              type="text"
                              value={row.sku}
                              readOnly
                              className={`${inputClass} cursor-not-allowed bg-white/0 text-gray-300`}
                              aria-label="SKU генерируется автоматически"
                            />
                          )
                        }
                        if (column.id === 'name') {
                          return (
                            <input
                              key={column.id}
                              type="text"
                              value={row.name}
                              onChange={(e) => updateRow(row.id, { name: e.target.value })}
                              className={inputClass}
                            />
                          )
                        }
                        if (column.id === 'price') {
                          return (
                            <div key={column.id} className="relative min-w-0">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={row.price}
                                onChange={(e) =>
                                  updateRow(row.id, { price: Number(e.target.value || 0) })
                                }
                                className={`${priceInputClass} pr-9`}
                                aria-label={adminPriceFieldLabel(false)}
                              />
                              <BelarusRubleSign
                                decorative
                                className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-2 -translate-y-1/2 text-gray-500"
                              />
                            </div>
                          )
                        }
                        if (column.id === 'imageUrls') {
                          const firstImage = row.imageUrls[0] ?? ''
                          return (
                            <div key={column.id} className="flex items-center justify-center">
                              <div className="size-10 shrink-0 overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
                                {firstImage ? (
                                  <img src={firstImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-white/25 bg-transparent px-1 text-center text-[10px] leading-tight text-gray-500">
                                    Нет фото
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        }
                        const dictionaryId = column.id.replace('dict:', '')
                        const dictionary = tableDictionaries.find((d) => d.id === dictionaryId)
                        const value = getDictionaryValue(row, dictionaryId)
                        if (dictionary) {
                          return (
                            <DictionaryDropdown
                              key={column.id}
                              dictionary={dictionary}
                              value={value}
                              onChange={(nextValue) => updateDictionaryValue(row.id, dictionaryId, nextValue)}
                              ariaLabel={`Выбрать значение ${dictionary.name || dictionary.id}`}
                            />
                          )
                        }
                        return (
                          <input
                            key={column.id}
                            type="text"
                            value={value}
                            onChange={(e) => updateDictionaryValue(row.id, dictionaryId, e.target.value)}
                            className={inputClass}
                          />
                        )
                      })}
                    <button
                      type="button"
                      onClick={() => setPreviewProductId(row.id)}
                      className="inline-flex size-10 items-center justify-center rounded-md border border-white/10 p-2 text-gray-400 hover:border-white/25 hover:bg-white/5 hover:text-white"
                      aria-label="Открыть карточку товара"
                    >
                      <MagnifyingGlassIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
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

      <Dialog open={previewProduct != null} onClose={() => setPreviewProductId(null)} className="relative z-[120]">
        <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex min-h-0 items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
          <DialogPanel
            ref={productDialogPanelRef}
            className="relative my-auto grid min-h-0 max-h-[min(86dvh,720px)] w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)] gap-5 overflow-hidden rounded-xl bg-[#0d1b2a] px-4 py-6 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:px-5"
          >
            <button
              type="button"
              onClick={() => setPreviewProductId(null)}
              className="absolute right-3.5 top-3 z-[122] rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть окно товара"
            >
              <XMarkIcon className="size-5" aria-hidden />
            </button>
            <DialogTitle className="pr-14 text-2xl font-semibold tracking-tight text-white">
              {previewProduct ? `Редактирование товара SKU ${previewProduct.sku}` : 'Редактирование товара'}
            </DialogTitle>
            {previewProduct ? (
              <div className="min-h-0 min-w-0 overflow-hidden">
                <PanelScrollArea
                  className="h-full min-h-0 min-w-0"
                  pinRailToViewport
                  pinnedRailClassName={profileDialogPinnedScrollbarRailClass}
                  pinnedRailStyle={productDialogPinnedRailStyle}
                  scrollbarAutoHideAfterIdleMs={900}
                  viewportClassName="min-w-0 pr-1 pb-2 sm:pr-1.5"
                  propagateWheelToPage={false}
                >
                <p className="mb-3 text-xs text-gray-400">
                  Изменения применяются сразу в таблице. Для сохранения в черновик нажмите `Сохранить` внизу
                  страницы.
                </p>
                <div className="flex flex-col gap-3">
                  <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-gray-400">Фото товара</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Рекомендуемый формат изображения: 1:1 (квадратное фото, без искажений при обрезке).
                    </p>
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => productImageInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            productImageInputRef.current?.click()
                          }
                        }}
                        className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-white/25 bg-white/[0.04] px-2 text-center text-xs text-gray-400 transition hover:border-indigo-400/60 hover:bg-indigo-950/20"
                      >
                        Добавить фото
                      </div>
                      {previewProduct.imageUrls.map((src, imageIndex) => (
                        <div
                          key={`${src.slice(0, 48)}-${imageIndex}`}
                          draggable
                          onDragStart={(e) => {
                            setDragImageIndex(imageIndex)
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', String(imageIndex))
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnter={() => {
                            if (dragImageIndex !== null && dragImageIndex !== imageIndex) {
                              setDropImageIndex(imageIndex)
                            }
                          }}
                          onDragLeave={() => {
                            setDropImageIndex((prev) => (prev === imageIndex ? null : prev))
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            const raw = e.dataTransfer.getData('text/plain')
                            const sourceIndex =
                              raw.trim().length > 0 ? Number.parseInt(raw, 10) : (dragImageIndex ?? -1)
                            if (Number.isNaN(sourceIndex) || sourceIndex < 0) return
                            moveProductImage(previewProduct.id, sourceIndex, imageIndex)
                            setDragImageIndex(null)
                            setDropImageIndex(null)
                          }}
                          onDragEnd={() => {
                            setDragImageIndex(null)
                            setDropImageIndex(null)
                          }}
                          className={`group relative aspect-square w-full overflow-hidden rounded-lg border bg-white/[0.04] transition ${
                            dropImageIndex === imageIndex
                              ? 'border-indigo-400/80 ring-2 ring-indigo-500/45'
                              : 'border-white/10'
                          } ${dragImageIndex === imageIndex ? 'cursor-grabbing opacity-70' : 'cursor-grab'}`}
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (imageIndex === 0) return
                              setDraft((prev) => ({
                                ...prev,
                                catalog: prev.catalog.map((row) => {
                                  if (row.id !== previewProduct.id) return row
                                  const next = [...row.imageUrls]
                                  const [selected] = next.splice(imageIndex, 1)
                                  if (!selected) return row
                                  next.unshift(selected)
                                  return { ...row, imageUrls: next }
                                }),
                              }))
                            }}
                            className={`absolute top-1.5 left-1.5 inline-flex size-6 items-center justify-center rounded-md border text-gray-100 transition ${
                              imageIndex === 0
                                ? 'border-amber-400/70 bg-amber-500/30'
                                : 'border-white/20 bg-black/55 hover:border-amber-400/70 hover:bg-amber-950/60'
                            }`}
                            aria-label={imageIndex === 0 ? 'Главное фото' : 'Сделать фото главным'}
                            title={imageIndex === 0 ? 'Главное фото' : 'Сделать фото главным'}
                          >
                            {imageIndex === 0 ? (
                              <StarSolidIcon className="size-3.5 text-amber-300" />
                            ) : (
                              <StarIcon className="size-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setDraft((prev) => ({
                                ...prev,
                                catalog: prev.catalog.map((row) =>
                                  row.id === previewProduct.id
                                    ? {
                                        ...row,
                                        imageUrls: row.imageUrls.filter((_, idx) => idx !== imageIndex),
                                      }
                                    : row,
                                ),
                              }))
                            }}
                            className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-md border border-white/20 bg-black/55 text-gray-200 opacity-0 transition hover:border-rose-400/70 hover:bg-rose-950/70 hover:text-rose-200 group-hover:opacity-100"
                            aria-label="Удалить фото"
                            title="Удалить фото"
                          >
                            <XMarkIcon className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      ref={productImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        uploadPreviewImages(previewProduct.id, e.target.files)
                        e.currentTarget.value = ''
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-gray-400">Название</p>
                      <input
                        type="text"
                        value={previewProduct.name}
                        onChange={(e) => updateRow(previewProduct.id, { name: e.target.value })}
                        className={`${inputClass} mt-1`}
                      />
                    </label>
                    <label className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-gray-400">{adminPriceFieldLabel()}</p>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={previewProduct.price}
                          onChange={(e) =>
                            updateRow(previewProduct.id, { price: Number(e.target.value || 0) })
                          }
                          className={`${priceInputClass} pr-9`}
                        />
                        <BelarusRubleSign
                          decorative
                          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-2 -translate-y-1/2 text-gray-500"
                        />
                      </div>
                    </label>
                    {dictionariesDraft.dictionaries.map((dictionary) => {
                      const value = getDictionaryValue(previewProduct, dictionary.id)
                      return (
                        <label key={dictionary.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-xs text-gray-400">{dictionary.name || dictionary.id}</p>
                          <div className="mt-1">
                            <DictionaryDropdown
                              dictionary={dictionary}
                              value={value}
                              onChange={(nextValue) =>
                                updateDictionaryValue(previewProduct.id, dictionary.id, nextValue)
                              }
                              ariaLabel={`Выбрать значение ${dictionary.name || dictionary.id}`}
                            />
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <label className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-gray-400">Описание</p>
                    <textarea
                      value={previewProduct.description}
                      onChange={(e) => updateRow(previewProduct.id, { description: e.target.value })}
                      rows={4}
                      className={`${inputClass} mt-1 min-h-[5.5rem] resize-y`}
                      placeholder="Текст для карточки товара на сайте"
                    />
                  </label>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-gray-400">Рекомендуемые товары</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Ищите товар по артикулу (SKU) и добавляйте его в рекомендации.
                    </p>
                    {draft.catalog.filter((item) => item.id !== previewProduct.id).length > 0 ? (
                      <>
                        <div className="mt-2">
                          <input
                            type="text"
                            value={recommendedSkuQuery}
                            onChange={(e) => setRecommendedSkuQuery(e.target.value)}
                            placeholder="Поиск по артикулу, например HD-OVR-001"
                            className={inputClass}
                            aria-label="Поиск товара по артикулу"
                          />
                        </div>
                        {recommendedSkuQuery.trim().length > 0 ? (
                          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                            {draft.catalog
                              .filter((item) => item.id !== previewProduct.id)
                              .filter((item) =>
                                item.sku.toLowerCase().includes(recommendedSkuQuery.trim().toLowerCase()),
                              )
                              .filter((item) => !previewProduct.recommendedProductIds.includes(item.id))
                              .slice(0, 12)
                              .map((item) => {
                                const limitReached =
                                  previewProduct.recommendedProductIds.length >= recommendedProductsLimit
                                return (
                                  <li
                                    key={`recommended-search-${item.id}`}
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
                                      onClick={() => addRecommendedProduct(previewProduct.id, item.id)}
                                      disabled={limitReached}
                                      className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-gray-200 transition hover:border-indigo-400/50 hover:bg-indigo-950/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <PlusIcon className="size-3.5" />
                                      Добавить
                                    </button>
                                  </li>
                                )
                              })}
                          </ul>
                        ) : null}
                        <div className="mt-3">
                          <p className="text-[11px] tracking-wide text-gray-500 uppercase">Добавленные товары</p>
                          <p className="mt-1 text-[11px] text-gray-500">
                            Выбрано: {previewProduct.recommendedProductIds.length}/{recommendedProductsLimit}
                          </p>
                          {previewProduct.recommendedProductIds.length > 0 ? (
                            <ul className="mt-2 grid grid-cols-4 gap-2">
                              {previewProduct.recommendedProductIds
                                .slice(0, recommendedProductsLimit)
                                .map((recommendedId) => {
                                const item = draft.catalog.find((p) => p.id === recommendedId)
                                if (!item || item.id === previewProduct.id) return null
                                return (
                                  <li
                                    key={`recommended-selected-${item.id}`}
                                    className="group relative overflow-hidden rounded-md border border-white/10 bg-white/[0.02]"
                                  >
                                    <div className="aspect-square w-full overflow-hidden border-b border-white/10 bg-white/[0.04]">
                                      {item.imageUrls[0] ? (
                                        <img
                                          src={item.imageUrls[0]}
                                          alt=""
                                          className="h-full w-full object-cover"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <span className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-gray-500">
                                          Нет фото
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-0.5 p-2.5">
                                      <p className="truncate text-sm text-gray-200">{item.name || 'Без названия'}</p>
                                      <p className="truncate text-[11px] text-gray-500">{item.sku}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeRecommendedProduct(previewProduct.id, item.id)}
                                      className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-md border border-white/20 bg-black/55 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:border-rose-400/60 hover:bg-rose-950/60 hover:text-rose-200"
                                      aria-label="Убрать из рекомендаций"
                                      title="Убрать из рекомендаций"
                                    >
                                      <XMarkIcon className="size-4" />
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-gray-500">Рекомендации пока не выбраны.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500">
                        Пока нет других товаров для подбора рекомендаций.
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPreviewProductId(null)}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  >
                    Готово
                  </button>
                </div>
                </PanelScrollArea>
              </div>
            ) : (
              <div className="min-h-0 overflow-auto pr-1">
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm text-gray-300">Товар не найден.</p>
                </div>
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>

      <ProfileSaveToast
        open={savedFlash}
        onDismiss={() => setSavedFlash(false)}
        message="Спасибо, что обновили каталог товаров — изменения сохранены."
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
