import {
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminProductsInventoryFromApi, putAdminProductsInventoryToApi } from '../../api/adminDataApi'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import { isSiteConfigApiExpected } from '../../constants/apiBase'
import { buildDefaultProductsInventory } from '../data/siteSettingsDefaults'
import {
  PRODUCTS_INVENTORY_UPDATED_EVENT,
  loadProductsInventoryDraft,
  saveProductsInventoryDraft,
} from '../lib/adminDraftStorage'
import type { ProductCatalogRow, ProductsInventoryDraft } from '../types/siteSettings'

const inputClass =
  'block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
const priceInputClass = `${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'

function clampDiscountPercent(raw: number): number {
  if (!Number.isFinite(raw)) return 0
  return Math.min(100, Math.max(0, Math.round(raw)))
}

function formatRub(amount: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.max(0, Math.round(amount)))} ₽`
}

function priceAfterDiscount(price: number, discountPercent: number): number {
  const d = clampDiscountPercent(discountPercent)
  return Math.round(price * (1 - d / 100))
}

function todayIsoLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Скидка считается в пределах периода; пустые даты — без ограничения с соответствующей стороны. */
function isDiscountInPeriod(row: ProductCatalogRow): boolean {
  const from = row.discountValidFrom?.trim() ?? ''
  const to = row.discountValidTo?.trim() ?? ''
  if (!from && !to) return true
  const t = todayIsoLocal()
  if (from && t < from) return false
  if (to && t > to) return false
  return true
}

/** Пустые даты в конце при сортировке по возрастанию. */
function compareIsoDateEmptyLast(a: string, b: string): number {
  const ae = !a.trim()
  const be = !b.trim()
  if (ae && be) return 0
  if (ae) return 1
  if (be) return -1
  return a.localeCompare(b, 'en-CA')
}

function rowMatchesSearch(row: ProductCatalogRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hit = (s: string) => s.toLowerCase().includes(q)
  if (hit(row.sku)) return true
  if (hit(row.name)) return true
  if (hit(row.description)) return true
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

type SortKey = 'sku' | 'name' | 'price' | 'discountPercent' | 'discountValidFrom' | 'discountValidTo'

export function AdminProductsDiscountsPage() {
  const [draft, setDraft] = useState<ProductsInventoryDraft>(() => buildDefaultProductsInventory())
  const [savedFlash, setSavedFlash] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [bulkPercent, setBulkPercent] = useState('')
  const [bulkValidFrom, setBulkValidFrom] = useState('')
  const [bulkValidTo, setBulkValidTo] = useState('')

  useEffect(() => {
    setDraft(loadProductsInventoryDraft())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isSiteConfigApiExpected()) return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchAdminProductsInventoryFromApi()
        if (cancelled || remote == null) return
        saveProductsInventoryDraft(remote)
        setDraft(loadProductsInventoryDraft())
      } catch {
        /* localStorage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const sync = () => setDraft(loadProductsInventoryDraft())
    window.addEventListener('storage', sync)
    window.addEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, sync)
    }
  }, [])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return draft.catalog
    return draft.catalog.filter((row) => rowMatchesSearch(row, searchQuery))
  }, [draft.catalog, searchQuery])

  const filteredIdSet = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered])

  const displayed = useMemo(() => {
    if (!sortKey) return filtered
    const next = [...filtered]
    next.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'sku') cmp = a.sku.localeCompare(b.sku, 'ru', { numeric: true })
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name, 'ru', { numeric: true })
      else if (sortKey === 'price') cmp = a.price - b.price
      else if (sortKey === 'discountPercent')
        cmp = clampDiscountPercent(a.discountPercent) - clampDiscountPercent(b.discountPercent)
      else if (sortKey === 'discountValidFrom')
        cmp = compareIsoDateEmptyLast(a.discountValidFrom, b.discountValidFrom)
      else cmp = compareIsoDateEmptyLast(a.discountValidTo, b.discountValidTo)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return next
  }, [filtered, sortKey, sortDir])

  const onSortClick = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const updateDiscount = (id: string, value: number) => {
    const v = clampDiscountPercent(value)
    setDraft((prev) => ({
      ...prev,
      catalog: prev.catalog.map((row) => (row.id === id ? { ...row, discountPercent: v } : row)),
    }))
  }

  const updateDiscountPeriod = (id: string, patch: { discountValidFrom?: string; discountValidTo?: string }) => {
    setDraft((prev) => ({
      ...prev,
      catalog: prev.catalog.map((row) => {
        if (row.id !== id) return row
        let nextFrom = patch.discountValidFrom !== undefined ? patch.discountValidFrom : row.discountValidFrom
        let nextTo = patch.discountValidTo !== undefined ? patch.discountValidTo : row.discountValidTo
        if (nextFrom.trim() && nextTo.trim() && nextFrom > nextTo) {
          ;[nextFrom, nextTo] = [nextTo, nextFrom]
        }
        return { ...row, discountValidFrom: nextFrom.trim(), discountValidTo: nextTo.trim() }
      }),
    }))
  }

  const applyBulkToSelected = () => {
    const v = clampDiscountPercent(Number(bulkPercent.replace(',', '.')))
    const sel = new Set(selectedIds)
    if (sel.size === 0) return
    setDraft((prev) => ({
      ...prev,
      catalog: prev.catalog.map((row) => (sel.has(row.id) ? { ...row, discountPercent: v } : row)),
    }))
  }

  const clearDiscountSelected = () => {
    const sel = new Set(selectedIds)
    if (sel.size === 0) return
    setDraft((prev) => ({
      ...prev,
      catalog: prev.catalog.map((row) =>
        sel.has(row.id)
          ? { ...row, discountPercent: 0, discountValidFrom: '', discountValidTo: '' }
          : row,
      ),
    }))
  }

  const applyBulkDatesToSelected = () => {
    const sel = new Set(selectedIds)
    if (sel.size === 0) return
    const from = bulkValidFrom.trim()
    const to = bulkValidTo.trim()
    setDraft((prev) => ({
      ...prev,
      catalog: prev.catalog.map((row) => {
        if (!sel.has(row.id)) return row
        let nextFrom = from
        let nextTo = to
        if (nextFrom && nextTo && nextFrom > nextTo) {
          ;[nextFrom, nextTo] = [nextTo, nextFrom]
        }
        return { ...row, discountValidFrom: nextFrom, discountValidTo: nextTo }
      }),
    }))
  }

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setApiError(null)
    saveProductsInventoryDraft(draft)
    if (isSiteConfigApiExpected()) {
      try {
        await putAdminProductsInventoryToApi(draft)
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'Не удалось сохранить в базу.')
        return
      }
    }
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))
  }

  const dateInputClass = `${inputClass} min-w-0 py-1.5 text-xs [color-scheme:dark]`
  const gridTemplate =
    'auto minmax(3rem,3.5rem) minmax(7rem,1fr) minmax(10rem,2fr) minmax(6.5rem,8rem) minmax(5rem,6rem) minmax(9.5rem,11rem) minmax(9.5rem,11rem) minmax(7rem,9rem)'

  if (!mounted) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-400">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Товары</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Скидки по товарам</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Те же позиции, что в{' '}
          <Link to="/admin/products/catalog" className="text-indigo-300 underline-offset-2 hover:underline">
            каталоге
          </Link>
          : скидка в процентах (0–100) и необязательный период действия (даты «с» и «по» в локальном календаре). Если даты
          не заданы, скидка считается действующей всегда. Базовая цена — из карточки товара. При подключённом бэкенде кнопка
          «Сохранить» дублирует черновик в базу вместе с каталогом и остатками.
        </p>

        <form onSubmit={onSave} className="mt-8 space-y-8">
          <section className={sectionClass}>
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
                  placeholder="Поиск по SKU, названию…"
                  className={`${inputClass} pl-9`}
                  aria-label="Поиск товаров"
                />
              </div>
              <p className="text-xs text-gray-400">Выбрано: {selectedIds.length}</p>
            </div>

            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-3">
              <label className="min-w-[6rem] flex-1 sm:max-w-[10rem]">
                <span className="mb-1 block text-xs text-gray-500">Скидка для выбранных, %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(e.target.value)}
                  className={priceInputClass}
                  aria-label="Процент скидки для выбранных товаров"
                />
              </label>
              <button
                type="button"
                onClick={applyBulkToSelected}
                disabled={selectedIds.length === 0}
                className="rounded-md border border-indigo-500/40 bg-indigo-500/15 px-3 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Применить к выбранным
              </button>
              <button
                type="button"
                onClick={clearDiscountSelected}
                disabled={selectedIds.length === 0}
                className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Сбросить (0%)
              </button>
              <label className="min-w-0 sm:max-w-[11rem]">
                <span className="mb-1 block text-xs text-gray-500">Период: с (выбранные)</span>
                <input
                  type="date"
                  value={bulkValidFrom}
                  onChange={(e) => setBulkValidFrom(e.target.value)}
                  className={dateInputClass}
                  aria-label="Дата начала скидки для выбранных"
                />
              </label>
              <label className="min-w-0 sm:max-w-[11rem]">
                <span className="mb-1 block text-xs text-gray-500">по</span>
                <input
                  type="date"
                  value={bulkValidTo}
                  onChange={(e) => setBulkValidTo(e.target.value)}
                  className={dateInputClass}
                  aria-label="Дата окончания скидки для выбранных"
                />
              </label>
              <button
                type="button"
                onClick={applyBulkDatesToSelected}
                disabled={selectedIds.length === 0}
                className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Период к выбранным
              </button>
            </div>

            <div className="stable-scroll-x-purple overflow-x-auto">
              <div
                className="grid items-center gap-x-2 gap-y-0 border-b border-white/10 pb-2 text-xs font-medium text-gray-400"
                style={{ gridTemplateColumns: gridTemplate, minWidth: '72rem' }}
              >
                <div className="flex min-h-11 items-center justify-center">
                  <TableCheckbox
                    checked={filtered.length > 0 && filtered.every((row) => selectedIds.includes(row.id))}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedIds((prev) => Array.from(new Set([...prev, ...filtered.map((r) => r.id)])))
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)))
                      }
                    }}
                    ariaLabel="Выбрать все в выдаче"
                  />
                </div>
                <div className="flex min-h-11 items-center justify-center text-gray-500">Фото</div>
                <div className="flex min-h-11 items-center justify-start px-2">
                  <button
                    type="button"
                    onClick={() => onSortClick('sku')}
                    className={`inline-flex items-center gap-0.5 rounded py-0.5 text-left transition hover:bg-white/10 hover:text-gray-200 ${
                      sortKey === 'sku' ? 'text-indigo-200' : ''
                    }`}
                  >
                    SKU
                    {sortKey === 'sku' ? (
                      sortDir === 'asc' ? (
                        <ChevronUpIcon className="size-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
                      )
                    ) : null}
                  </button>
                </div>
                <div className="flex min-h-11 items-center justify-start px-2">
                  <button
                    type="button"
                    onClick={() => onSortClick('name')}
                    className={`inline-flex items-center gap-0.5 rounded py-0.5 text-left transition hover:bg-white/10 hover:text-gray-200 ${
                      sortKey === 'name' ? 'text-indigo-200' : ''
                    }`}
                  >
                    Название
                    {sortKey === 'name' ? (
                      sortDir === 'asc' ? (
                        <ChevronUpIcon className="size-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
                      )
                    ) : null}
                  </button>
                </div>
                <div className="flex min-h-11 items-center justify-end px-2">
                  <button
                    type="button"
                    onClick={() => onSortClick('price')}
                    className={`inline-flex items-center gap-0.5 rounded py-0.5 text-right tabular-nums transition hover:bg-white/10 hover:text-gray-200 ${
                      sortKey === 'price' ? 'text-indigo-200' : ''
                    }`}
                  >
                    Цена
                    {sortKey === 'price' ? (
                      sortDir === 'asc' ? (
                        <ChevronUpIcon className="size-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
                      )
                    ) : null}
                  </button>
                </div>
                <div className="flex min-h-11 items-center justify-center px-2">
                  <button
                    type="button"
                    onClick={() => onSortClick('discountPercent')}
                    className={`inline-flex items-center gap-0.5 rounded py-0.5 transition hover:bg-white/10 hover:text-gray-200 ${
                      sortKey === 'discountPercent' ? 'text-indigo-200' : ''
                    }`}
                  >
                    Скидка %
                    {sortKey === 'discountPercent' ? (
                      sortDir === 'asc' ? (
                        <ChevronUpIcon className="size-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
                      )
                    ) : null}
                  </button>
                </div>
                <div className="flex min-h-11 items-center justify-start px-2">
                  <button
                    type="button"
                    onClick={() => onSortClick('discountValidFrom')}
                    className={`inline-flex items-center gap-0.5 rounded py-0.5 text-left transition hover:bg-white/10 hover:text-gray-200 ${
                      sortKey === 'discountValidFrom' ? 'text-indigo-200' : ''
                    }`}
                  >
                    Скидка с
                    {sortKey === 'discountValidFrom' ? (
                      sortDir === 'asc' ? (
                        <ChevronUpIcon className="size-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
                      )
                    ) : null}
                  </button>
                </div>
                <div className="flex min-h-11 items-center justify-start px-2">
                  <button
                    type="button"
                    onClick={() => onSortClick('discountValidTo')}
                    className={`inline-flex items-center gap-0.5 rounded py-0.5 text-left transition hover:bg-white/10 hover:text-gray-200 ${
                      sortKey === 'discountValidTo' ? 'text-indigo-200' : ''
                    }`}
                  >
                    Скидка по
                    {sortKey === 'discountValidTo' ? (
                      sortDir === 'asc' ? (
                        <ChevronUpIcon className="size-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
                      )
                    ) : null}
                  </button>
                </div>
                <div className="flex min-h-11 items-center justify-end px-2 text-right text-gray-500">
                  Со скидкой
                </div>
              </div>

              <ul
                className="grid gap-x-2 gap-y-0"
                style={{ gridTemplateColumns: gridTemplate, minWidth: '72rem' }}
              >
                {displayed.map((row) => {
                  const thumb = row.imageUrls[0]
                  const d = clampDiscountPercent(row.discountPercent)
                  const sale = priceAfterDiscount(row.price, d)
                  const inPeriod = isDiscountInPeriod(row)
                  return (
                    <li
                      key={row.id}
                      className="contents [&>div]:border-b [&>div]:border-white/[0.06] [&>div]:py-2.5"
                    >
                      <div className="flex min-h-11 items-center justify-center">
                        <TableCheckbox
                          checked={selectedIds.includes(row.id)}
                          onChange={(checked) => toggleRowSelection(row.id, checked)}
                          ariaLabel={`Выбрать ${row.name}`}
                        />
                      </div>
                      <div className="flex min-h-11 items-center justify-center">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="size-10 rounded-md border border-white/10 object-cover"
                          />
                        ) : (
                          <span className="size-10 rounded-md border border-dashed border-white/15 bg-white/[0.03]" />
                        )}
                      </div>
                      <div className="flex min-h-11 min-w-0 items-center justify-start px-2">
                        <span className="truncate font-mono text-xs text-gray-300">{row.sku || '—'}</span>
                      </div>
                      <div className="flex min-h-11 min-w-0 items-center justify-start px-2">
                        <span className="truncate text-sm text-gray-200">{row.name}</span>
                      </div>
                      <div className="flex min-h-11 items-center justify-end px-2 text-right tabular-nums text-sm text-gray-300">
                        {formatRub(row.price)}
                      </div>
                      <div className="flex min-h-11 items-center justify-center px-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={d}
                          onChange={(e) => updateDiscount(row.id, Number(e.target.value))}
                          className={`${priceInputClass} w-full max-w-[4.5rem] text-center`}
                          aria-label={`Скидка для ${row.name}`}
                        />
                      </div>
                      <div className="flex min-h-11 min-w-0 items-center justify-stretch px-1">
                        <input
                          type="date"
                          value={row.discountValidFrom}
                          onChange={(e) =>
                            updateDiscountPeriod(row.id, { discountValidFrom: e.target.value })
                          }
                          className={`${dateInputClass} w-full`}
                          aria-label={`Дата начала скидки, ${row.name}`}
                        />
                      </div>
                      <div className="flex min-h-11 min-w-0 items-center justify-stretch px-1">
                        <input
                          type="date"
                          value={row.discountValidTo}
                          onChange={(e) =>
                            updateDiscountPeriod(row.id, { discountValidTo: e.target.value })
                          }
                          className={`${dateInputClass} w-full`}
                          aria-label={`Дата окончания скидки, ${row.name}`}
                        />
                      </div>
                      <div className="flex min-h-11 flex-col items-end justify-center gap-0.5 px-2 text-right">
                        {d > 0 ? (
                          <>
                            <span
                              className={`tabular-nums text-sm ${
                                inPeriod ? 'text-indigo-200/90' : 'text-gray-500 line-through'
                              }`}
                            >
                              {formatRub(sale)}
                            </span>
                            {!inPeriod && (row.discountValidFrom || row.discountValidTo) ? (
                              <span className="text-[10px] leading-tight text-amber-400/90">вне периода</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {draft.catalog.length === 0 ? (
                <p className="mt-4 text-center text-sm text-gray-500">
                  В каталоге нет товаров. Добавьте их в разделе «Каталог товаров».
                </p>
              ) : displayed.length === 0 ? (
                <p className="mt-4 text-center text-sm text-gray-500">Ничего не найдено по запросу.</p>
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

      <ProfileSaveToast
        open={savedFlash}
        onDismiss={() => setSavedFlash(false)}
        message="Скидки по товарам сохранены."
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
