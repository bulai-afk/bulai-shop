import {
  SITE_CONFIG_STORAGE_KEY,
  SITE_CONFIG_UPDATED_EVENT,
} from '../../constants/siteConfigStorage'
import {
  buildDefaultProductsDictionaries,
  buildDefaultProductsInventory,
  buildDefaultPromoMaterials,
  buildDefaultSiteConfig,
} from '../data/siteSettingsDefaults'
import { normalizeDictionaryValue } from '../../utils/productDictionaryValue'
import { normalizeStockRowsFromStorage } from './stockRowUtils'
import { createDefaultProfileExtras, type ProfileExtras } from '../../pages/ProfilePage'
import type { AdminClientRow } from '../types/adminClients'
import {
  inferOrderStageFromStatus,
  isIsoDateString,
  migrateLegacyOrderStageId,
  migrateLegacyPaymentMethod,
  migrateLegacyPaymentStatus,
  normalizeOrderLineItems,
  type AdminOrderRow,
  type OrderStageId,
} from '../types/adminOrders'
import type {
  ProductDictionaryValue,
  ProductsDictionariesDraft,
  ProductsInventoryDraft,
  PromoMaterialsForm,
  SiteConfigForm,
  Supplier,
  DefectRecord,
  SupplyLine,
  SupplyRecord,
  Warehouse,
} from '../types/siteSettings'
import {
  PROMO_MATERIALS_STORAGE_KEY,
  PROMO_MATERIALS_UPDATED_EVENT,
} from '../../constants/promoMaterialsStorage'
import { mergeSiteConfigForm } from '../../utils/siteConfigForm'
import { mergePromoMaterialsForm } from '../../utils/promoMaterialsForm'

/** Старый объединённый черновик (до разделения «Настройки сайта» / «Промо материалы»). */
const LEGACY_STORAGE_KEY = 'bulai-shop-admin-site-settings-v1'

export { SITE_CONFIG_STORAGE_KEY }
export { PROMO_MATERIALS_STORAGE_KEY, PROMO_MATERIALS_UPDATED_EVENT }
export const PRODUCTS_INVENTORY_STORAGE_KEY = 'bulai-shop-admin-products-inventory-v1'
export const PRODUCTS_INVENTORY_UPDATED_EVENT = 'bulai-shop-products-inventory-updated'
export const PRODUCTS_DICTIONARIES_STORAGE_KEY = 'bulai-shop-admin-products-dictionaries-v1'
export const PRODUCTS_DICTIONARIES_UPDATED_EVENT = 'bulai-shop-products-dictionaries-updated'

let legacyMigrated = false

function migrateLegacyIfNeeded() {
  if (legacyMigrated) return
  legacyMigrated = true
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) return
  try {
    const j = JSON.parse(raw) as {
      siteConfig?: SiteConfigForm
      promoMaterials?: PromoMaterialsForm
    }
    if (j.siteConfig?.contact && !localStorage.getItem(SITE_CONFIG_STORAGE_KEY)) {
      localStorage.setItem(SITE_CONFIG_STORAGE_KEY, JSON.stringify(j.siteConfig))
    }
    if (Array.isArray(j.promoMaterials?.tickerMessages) && !localStorage.getItem(PROMO_MATERIALS_STORAGE_KEY)) {
      localStorage.setItem(PROMO_MATERIALS_STORAGE_KEY, JSON.stringify(j.promoMaterials))
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* оставляем legacy, если JSON битый */
  }
}

export function loadSiteConfigDraft(): SiteConfigForm {
  migrateLegacyIfNeeded()
  try {
    const raw = localStorage.getItem(SITE_CONFIG_STORAGE_KEY)
    if (!raw) return buildDefaultSiteConfig()
    return mergeSiteConfigForm(JSON.parse(raw) as unknown)
  } catch {
    return buildDefaultSiteConfig()
  }
}

export function saveSiteConfigDraft(config: SiteConfigForm) {
  localStorage.setItem(SITE_CONFIG_STORAGE_KEY, JSON.stringify(config))
  window.dispatchEvent(new Event(SITE_CONFIG_UPDATED_EVENT))
}

export function clearSiteConfigDraft() {
  localStorage.removeItem(SITE_CONFIG_STORAGE_KEY)
  window.dispatchEvent(new Event(SITE_CONFIG_UPDATED_EVENT))
}

export function loadPromoMaterialsDraft(): PromoMaterialsForm {
  migrateLegacyIfNeeded()
  try {
    const raw = localStorage.getItem(PROMO_MATERIALS_STORAGE_KEY)
    if (!raw) return buildDefaultPromoMaterials()
    return mergePromoMaterialsForm(JSON.parse(raw) as unknown)
  } catch {
    return buildDefaultPromoMaterials()
  }
}

export function savePromoMaterialsDraft(data: PromoMaterialsForm) {
  localStorage.setItem(PROMO_MATERIALS_STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(PROMO_MATERIALS_UPDATED_EVENT))
}

export function clearPromoMaterialsDraft() {
  localStorage.removeItem(PROMO_MATERIALS_STORAGE_KEY)
  window.dispatchEvent(new Event(PROMO_MATERIALS_UPDATED_EVENT))
}

function normalizeSupplyLikeRecordsFromStorage(
  raw: unknown,
  warehouseIds: Set<string>,
  supplierIds: Set<string>,
  productIds: Set<string>,
  fallbackIdPrefix: 'sup' | 'def',
): SupplyRecord[] {
  if (!Array.isArray(raw)) return []
  const fallbackDate = new Date().toISOString().slice(0, 10)
  const firstWarehouseId = warehouseIds.size > 0 ? [...warehouseIds][0]! : ''
  const firstSupplierId = supplierIds.size > 0 ? [...supplierIds][0]! : ''
  return raw
    .map((item, index) => {
      const r = item as Partial<SupplyRecord>
      const id = typeof r.id === 'string' && r.id.trim() ? r.id : `${fallbackIdPrefix}-${index + 1}`
      let warehouseId = typeof r.warehouseId === 'string' ? r.warehouseId : ''
      if (!warehouseIds.has(warehouseId)) warehouseId = firstWarehouseId
      let supplierId = typeof r.supplierId === 'string' ? r.supplierId : ''
      if (!supplierIds.has(supplierId)) {
        const derived = `sup-${warehouseId}`
        supplierId = supplierIds.has(derived) ? derived : firstSupplierId
      }
      const date =
        typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : fallbackDate
      const documentNumber = typeof r.documentNumber === 'string' ? r.documentNumber : ''
      const ratingRaw = typeof r.rating === 'number' && Number.isFinite(r.rating) ? r.rating : 0
      const rating = Math.min(5, Math.max(0, Math.round(ratingRaw)))
      const note = typeof r.note === 'string' ? r.note : ''
      const lines: SupplyLine[] = Array.isArray(r.lines)
        ? r.lines
            .map((ln) => {
              const l = ln as Partial<SupplyLine>
              const productId = typeof l.productId === 'string' ? l.productId : ''
              const quantity =
                typeof l.quantity === 'number' && Number.isFinite(l.quantity)
                  ? Math.max(0, Math.floor(l.quantity))
                  : 0
              return { productId, quantity }
            })
            .filter((l) => l.productId && productIds.has(l.productId) && l.quantity > 0)
        : []
      return { id, warehouseId, supplierId, date, documentNumber, rating, note, lines }
    })
    .filter((s) => s.warehouseId && s.supplierId && s.lines.length > 0)
}

function normalizeSuppliesFromStorage(
  raw: unknown,
  warehouseIds: Set<string>,
  supplierIds: Set<string>,
  productIds: Set<string>,
): SupplyRecord[] {
  return normalizeSupplyLikeRecordsFromStorage(raw, warehouseIds, supplierIds, productIds, 'sup')
}

function normalizeDefectRecordsFromStorage(
  raw: unknown,
  warehouseIds: Set<string>,
  supplierIds: Set<string>,
  productIds: Set<string>,
): DefectRecord[] {
  return normalizeSupplyLikeRecordsFromStorage(raw, warehouseIds, supplierIds, productIds, 'def')
}

function isLegacyWarehouseRow(row: unknown): boolean {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false
  return 'requisites' in row && typeof (row as { requisites?: unknown }).requisites === 'string'
}

/** Старый формат: склад и поставщик в одной записи — разделяем. */
function migrateLegacyWarehousesToSplit(
  rawWarehouses: unknown[],
  baseWarehouses: Warehouse[],
  baseSuppliers: Supplier[],
): { warehouses: Warehouse[]; suppliers: Supplier[] } {
  if (!Array.isArray(rawWarehouses) || rawWarehouses.length === 0) {
    return { warehouses: baseWarehouses, suppliers: baseSuppliers }
  }
  const warehouses: Warehouse[] = []
  const suppliers: Supplier[] = []
  for (let index = 0; index < rawWarehouses.length; index++) {
    const w = rawWarehouses[index] as Partial<{
      id: string
      name: string
      address: string
      requisites: string
      rating: number
      supplyCount: number
    }>
    const id =
      typeof w?.id === 'string' && w.id.trim().length > 0
        ? w.id
        : baseWarehouses[index]?.id ?? `wh-${index + 1}`
    const address = typeof w?.address === 'string' ? w.address : ''
    const addrHead = address.split(/[,\n]/)[0]?.trim() ?? ''
    warehouses.push({
      id,
      name: addrHead.length > 0 ? addrHead.slice(0, 120) : `Склад ${index + 1}`,
      address,
    })
    const ratingRaw = typeof w?.rating === 'number' && Number.isFinite(w.rating) ? w.rating : 0
    const supplyRaw =
      typeof w?.supplyCount === 'number' && Number.isFinite(w.supplyCount) ? Math.floor(w.supplyCount) : 0
    suppliers.push({
      id: `sup-${id}`,
      name: typeof w?.name === 'string' && w.name.trim() ? w.name : `Поставщик ${index + 1}`,
      requisites: typeof w?.requisites === 'string' ? w.requisites : '',
      rating: Math.min(5, Math.max(0, ratingRaw)),
      supplyCount: Math.max(0, supplyRaw),
      defectCount: 0,
    })
  }
  return { warehouses, suppliers }
}

function normalizeWarehousesFromStorage(raw: unknown, base: Warehouse[]): Warehouse[] {
  if (!Array.isArray(raw) || raw.length === 0) return base
  return raw.map((row, index) => {
    const w = row as Partial<Warehouse>
    return {
      id:
        typeof w?.id === 'string' && w.id.trim().length > 0
          ? w.id
          : base[index]?.id ?? `wh-${index + 1}`,
      name: typeof w?.name === 'string' ? w.name : base[index]?.name ?? '',
      address: typeof w?.address === 'string' ? w.address : '',
    }
  })
}

function normalizeSuppliersFromStorage(raw: unknown, base: Supplier[]): Supplier[] {
  if (!Array.isArray(raw) || raw.length === 0) return base
  return raw.map((row, index) => {
    const s = row as Partial<Supplier>
    const ratingRaw = typeof s?.rating === 'number' && Number.isFinite(s.rating) ? s.rating : 0
    const supplyRaw =
      typeof s?.supplyCount === 'number' && Number.isFinite(s.supplyCount) ? Math.floor(s.supplyCount) : 0
    const defectRaw =
      typeof s.defectCount === 'number' && Number.isFinite(s.defectCount) ? Math.floor(s.defectCount) : 0
    return {
      id:
        typeof s?.id === 'string' && s.id.trim().length > 0
          ? s.id
          : base[index]?.id ?? `sup-${index + 1}`,
      name: typeof s?.name === 'string' ? s.name : base[index]?.name ?? '',
      requisites: typeof s?.requisites === 'string' ? s.requisites : '',
      rating: Math.min(5, Math.max(0, ratingRaw)),
      supplyCount: Math.max(0, supplyRaw),
      defectCount: Math.max(0, defectRaw),
    }
  })
}

export function loadProductsInventoryDraft(): ProductsInventoryDraft {
  migrateLegacyIfNeeded()
  try {
    const raw = localStorage.getItem(PRODUCTS_INVENTORY_STORAGE_KEY)
    if (!raw) return buildDefaultProductsInventory()
    type LegacyCatalogRow = Partial<ProductsInventoryDraft['catalog'][number]> & {
      status?: 'active' | 'draft' | 'archived'
      imageUrl?: string
    }
    const p = JSON.parse(raw) as Partial<Omit<ProductsInventoryDraft, 'catalog'>> & {
      catalog?: LegacyCatalogRow[]
      suppliers?: unknown
    }
    const base = buildDefaultProductsInventory()
    const normalizeAvailability = (item: {
      availability?: ProductsInventoryDraft['catalog'][number]['availability']
      status?: 'active' | 'draft' | 'archived'
    }) => {
      if (item.availability) return item.availability
      if (item.status === 'active') return 'in_stock'
      if (item.status === 'archived') return 'out_of_stock'
      return 'preorder'
    }
    const rawWh = p?.warehouses
    const legacySplit =
      Array.isArray(rawWh) && rawWh.length > 0 && rawWh.some((row) => isLegacyWarehouseRow(row))
    let warehouses: Warehouse[]
    let suppliers: Supplier[]
    if (legacySplit) {
      const migrated = migrateLegacyWarehousesToSplit(rawWh as unknown[], base.warehouses, base.suppliers)
      warehouses = migrated.warehouses
      suppliers = migrated.suppliers
    } else {
      warehouses = normalizeWarehousesFromStorage(rawWh, base.warehouses)
      suppliers = normalizeSuppliersFromStorage(p?.suppliers, base.suppliers)
    }
    const catalogNormalized = Array.isArray(p?.catalog)
      ? p.catalog.map((row, index) => ({
            id: row.id ?? `row-${index + 1}`,
            sku: row.sku ?? `MODEL-${String(index + 1).padStart(3, '0')}`,
            name: row.name ?? '',
            description: typeof row.description === 'string' ? row.description : '',
            imageUrls: Array.isArray(row.imageUrls)
              ? row.imageUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
              : row.imageUrl && row.imageUrl.trim().length > 0
                ? [row.imageUrl]
                : [],
            recommendedProductIds: Array.isArray(row.recommendedProductIds)
              ? row.recommendedProductIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
              : [],
            size: row.size ?? '',
            color: row.color ?? '',
            price: typeof row.price === 'number' ? row.price : 0,
            discountPercent: (() => {
              const d = (row as { discountPercent?: unknown }).discountPercent
              if (typeof d !== 'number' || !Number.isFinite(d)) return 0
              return Math.min(100, Math.max(0, Math.round(d)))
            })(),
            discountValidFrom: (() => {
              const v = (row as { discountValidFrom?: unknown }).discountValidFrom
              if (typeof v !== 'string' || !v.trim()) return ''
              const t = v.trim()
              return isIsoDateString(t) ? t : ''
            })(),
            discountValidTo: (() => {
              const v = (row as { discountValidTo?: unknown }).discountValidTo
              if (typeof v !== 'string' || !v.trim()) return ''
              const t = v.trim()
              return isIsoDateString(t) ? t : ''
            })(),
            availability: normalizeAvailability(row),
            attributes:
              row.attributes && typeof row.attributes === 'object' && !Array.isArray(row.attributes)
                ? (row.attributes as Record<string, string>)
                : {},
          }))
      : base.catalog
    const productIds = new Set(catalogNormalized.map((row) => row.id))
    const warehouseIdSet = new Set(warehouses.map((w) => w.id))
    const supplierIdSet = new Set(suppliers.map((s) => s.id))
    const supplies = Array.isArray(p?.supplies)
      ? normalizeSuppliesFromStorage(p.supplies, warehouseIdSet, supplierIdSet, productIds)
      : []
    const defectRecords = Array.isArray(p?.defectRecords)
      ? normalizeDefectRecordsFromStorage(p.defectRecords, warehouseIdSet, supplierIdSet, productIds)
      : []

    return {
      catalog: catalogNormalized,
      warehouses,
      suppliers,
      stocks: Array.isArray(p?.stocks) ? normalizeStockRowsFromStorage(p.stocks, warehouses) : base.stocks,
      supplies,
      defectRecords,
    }
  } catch {
    return buildDefaultProductsInventory()
  }
}

export function saveProductsInventoryDraft(data: ProductsInventoryDraft) {
  localStorage.setItem(PRODUCTS_INVENTORY_STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(PRODUCTS_INVENTORY_UPDATED_EVENT))
}

export function loadProductsDictionariesDraft(): ProductsDictionariesDraft {
  migrateLegacyIfNeeded()
  try {
    const raw = localStorage.getItem(PRODUCTS_DICTIONARIES_STORAGE_KEY)
    if (!raw) return buildDefaultProductsDictionaries()
    const p = JSON.parse(raw) as Partial<ProductsDictionariesDraft>
    const base = buildDefaultProductsDictionaries()
    const toValues = (input: unknown, seed: string): ProductDictionaryValue[] => {
      if (Array.isArray(input)) {
        return input.map((item, index) => {
          const maybe = item as Partial<ProductDictionaryValue>
          const id = maybe.id ?? `${seed}-${index + 1}`
          return normalizeDictionaryValue(maybe, id)
        })
      }
      if (typeof input === 'string') {
        return input
          .split(/\r?\n|,/g)
          .map((part) => part.trim())
          .filter(Boolean)
          .map((value, index) =>
            normalizeDictionaryValue({ value }, `${seed}-${index + 1}`),
          )
      }
      return []
    }
    if (!Array.isArray(p?.dictionaries)) return base
    const parsed = p.dictionaries.map((row, index) => ({
      id: row.id ?? `dict-${index + 1}`,
      name: row.name ?? '',
      values: toValues((row as { values?: unknown }).values, row.id ?? `dict-${index + 1}`),
    }))
    const byId = new Map(parsed.map((item) => [item.id, item]))
    const requiredIds = new Set(base.dictionaries.map((item) => item.id))
    const mergedRequired = base.dictionaries.map((required) => byId.get(required.id) ?? required)
    const extraCustom = parsed.filter((item) => !requiredIds.has(item.id))
    const dictionaries = [...mergedRequired, ...extraCustom]
    const allowedIds = new Set(dictionaries.map((item) => item.id))
    const rawSkuSources = Array.isArray((p as { skuSourceDictionaryIds?: unknown }).skuSourceDictionaryIds)
      ? ((p as { skuSourceDictionaryIds: unknown[] }).skuSourceDictionaryIds as string[])
      : base.skuSourceDictionaryIds
    const skuSourceDictionaryIds = rawSkuSources.filter((id) => typeof id === 'string' && allowedIds.has(id))
    return { dictionaries, skuSourceDictionaryIds }
  } catch {
    return buildDefaultProductsDictionaries()
  }
}

export function saveProductsDictionariesDraft(data: ProductsDictionariesDraft) {
  localStorage.setItem(PRODUCTS_DICTIONARIES_STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(PRODUCTS_DICTIONARIES_UPDATED_EVENT))
}

export const CLIENTS_STORAGE_KEY = 'bulai-shop-admin-clients-v1'
export const CLIENTS_UPDATED_EVENT = 'bulai-shop-clients-updated'

function normalizeProfileExtras(raw: unknown): ProfileExtras | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  return { ...createDefaultProfileExtras(), ...(raw as Partial<ProfileExtras>) }
}

function normalizeClientRow(raw: unknown, index: number): AdminClientRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : `client-${index + 1}`
  let firstName = typeof r.firstName === 'string' ? r.firstName : ''
  let lastName = typeof r.lastName === 'string' ? r.lastName : ''
  if (!firstName && !lastName && typeof r.name === 'string' && r.name.trim()) {
    const parts = r.name.trim().split(/\s+/).filter(Boolean)
    firstName = parts[0] ?? ''
    lastName = parts.slice(1).join(' ')
  }
  return {
    id,
    firstName,
    lastName,
    email: typeof r.email === 'string' ? r.email : '',
    phone: typeof r.phone === 'string' ? r.phone : '',
    profile: normalizeProfileExtras(r.profile),
  }
}

/** Пара примеров при первом открытии (нет ключа в localStorage). */
function buildDefaultClientsDraft(): AdminClientRow[] {
  return [
    {
      id: 'client-seed-1',
      firstName: 'Иван',
      lastName: 'Петров',
      email: 'ivan.petrov@example.com',
      phone: '+7 (999) 123-45-67',
    },
    {
      id: 'client-seed-2',
      firstName: 'Мария',
      lastName: 'Соколова',
      email: 'maria.sokolova@example.com',
      phone: '+7 (495) 000-11-22',
    },
  ]
}

export function loadClientsDraft(): AdminClientRow[] {
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY)
    if (!raw) return buildDefaultClientsDraft()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row, i) => normalizeClientRow(row, i))
      .filter((row): row is AdminClientRow => row != null)
  } catch {
    return []
  }
}

export function saveClientsDraft(rows: AdminClientRow[]) {
  localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(rows))
  window.dispatchEvent(new Event(CLIENTS_UPDATED_EVENT))
}

export const ORDERS_STORAGE_KEY = 'bulai-shop-admin-orders-v1'
export const ORDERS_UPDATED_EVENT = 'bulai-shop-orders-updated'

function parseOrderCreatedAt(raw: unknown): string {
  if (typeof raw === 'string' && isIsoDateString(raw)) return raw.trim()
  return new Date().toISOString().slice(0, 10)
}

function parseOrderDeliveryDate(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const t = raw.trim()
  return isIsoDateString(t) ? t : undefined
}

function normalizeOrderRow(raw: unknown, index: number): AdminOrderRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : `order-${index + 1}`
  const status = typeof r.status === 'string' ? r.status : ''
  let stageId: OrderStageId = 'new'
  if (typeof r.stageId === 'string') {
    stageId = migrateLegacyOrderStageId(r.stageId)
  } else {
    stageId = inferOrderStageFromStatus(status)
  }
  return {
    id,
    orderNumber: typeof r.orderNumber === 'string' ? r.orderNumber : '',
    createdAt: parseOrderCreatedAt(r.createdAt),
    deliveryDate: parseOrderDeliveryDate(r.deliveryDate),
    shippingDate: parseOrderDeliveryDate(r.shippingDate),
    customerName: typeof r.customerName === 'string' ? r.customerName : '',
    clientId: typeof r.clientId === 'string' && r.clientId.trim() ? r.clientId.trim() : undefined,
    clientEmail:
      typeof r.clientEmail === 'string' && r.clientEmail.trim()
        ? r.clientEmail.trim().toLowerCase()
        : undefined,
    total: typeof r.total === 'string' ? r.total : '',
    status,
    paymentStatus: migrateLegacyPaymentStatus(r.paymentStatus),
    paymentMethod: migrateLegacyPaymentMethod(r.paymentMethod),
    stageId,
    trackingNumber: typeof r.trackingNumber === 'string' ? r.trackingNumber : undefined,
    trackingUrl: typeof r.trackingUrl === 'string' ? r.trackingUrl : undefined,
    items: normalizeOrderLineItems(r.items),
    comment: typeof r.comment === 'string' ? r.comment : undefined,
  }
}

function buildDefaultOrdersDraft(): AdminOrderRow[] {
  return [
    {
      id: 'order-seed-1',
      orderNumber: 'BUL-10042',
      createdAt: '2026-03-10',
      deliveryDate: '2026-03-18',
      shippingDate: '2026-03-16',
      customerName: 'Петров Иван',
      clientId: 'client-seed-1',
      clientEmail: 'ivan.petrov@example.com',
      total: '12 500 ₽',
      status: 'Отправка',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      stageId: 'shipping',
      trackingNumber: '10123456789012',
      trackingUrl: 'https://www.pochta.ru/tracking',
      items: [
        { id: 'li-seed-a', name: 'Куртка зимняя', size: 'M', color: 'Чёрный', quantity: 1, price: '8 900 ₽' },
        { id: 'li-seed-b', name: 'Шапка вязаная', size: '—', color: 'Бежевый', quantity: 2, price: '1 800 ₽' },
      ],
      comment: 'Доставка СДЭК',
    },
    {
      id: 'order-seed-2',
      orderNumber: 'BUL-10043',
      createdAt: '2026-03-28',
      deliveryDate: '2026-04-05',
      customerName: 'Соколова Мария',
      clientId: 'client-seed-2',
      clientEmail: 'maria.sokolova@example.com',
      total: '48 900 ₽',
      status: 'Сборка',
      paymentStatus: 'unpaid',
      paymentMethod: 'unspecified',
      stageId: 'assembly',
      items: [
        { id: 'li-seed-c', name: 'Пальто шерстяное', size: 'L', color: 'Серый', quantity: 1, price: '42 000 ₽' },
      ],
    },
  ]
}

export function loadOrdersDraft(): AdminOrderRow[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY)
    if (!raw) return buildDefaultOrdersDraft()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row, i) => normalizeOrderRow(row, i))
      .filter((row): row is AdminOrderRow => row != null)
  } catch {
    return []
  }
}

export function saveOrdersDraft(rows: AdminOrderRow[]) {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(rows))
  window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT))
}
