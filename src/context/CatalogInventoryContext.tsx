import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchAdminProductsInventoryFromApi } from '../api/adminDataApi'
import { fetchDevSyncInventory } from '../lib/devCatalogSync'
import { fetchAllStoreReviews } from '../api/reviewsApi'
import { isSiteConfigApiExpected } from '../constants/apiBase'
import type { ProductCatalogRow, StockRow, Warehouse } from '../admin/types/siteSettings'
import {
  META_BY_ID as staticMetaById,
  products as staticProducts,
  type Product,
  type ProductMeta,
} from '../data/catalogProducts'
import { getRelatedProductsFromCatalog, mapCatalogRowsToStorefront } from '../utils/mapInventoryCatalogToStorefront'
import {
  applyReviewStatsToProducts,
  buildProductReviewStatsMap,
  type ProductReviewStats,
} from '../utils/productReviewStatsMap'

/** Совпадает с `PRODUCTS_INVENTORY_UPDATED_EVENT` в админке — обновление витрины после сохранения каталога. */
const PRODUCTS_INVENTORY_UPDATED_EVENT = 'bulai-shop-products-inventory-updated'
const REVIEWS_UPDATED_EVENT = 'bulai-shop-reviews-updated'

type CatalogSource = 'api' | 'static'

export type CatalogInventoryContextValue = {
  products: Product[]
  metaById: Record<string, ProductMeta>
  source: CatalogSource
  /** false до первого ответа API на проде — не показывать демо-каталог. */
  hydrated: boolean
  /** Для синхронизации корзины при смене каталога или цен. */
  catalogFingerprint: string
  getProductById: (id: string) => Product | undefined
  getRelatedProducts: (currentId: string, limit?: number) => Product[]
}

const CatalogInventoryContext = createContext<CatalogInventoryContextValue | null>(null)

export function CatalogInventoryProvider({ children }: { children: ReactNode }) {
  const apiExpected = isSiteConfigApiExpected()
  const [apiInventory, setApiInventory] = useState<{
    catalog: ProductCatalogRow[]
    stocks: StockRow[]
    warehouses: Warehouse[]
  } | null>(null)
  const [source, setSource] = useState<CatalogSource>(apiExpected ? 'api' : 'static')
  const [hydrated, setHydrated] = useState(!apiExpected)
  const [reviewStatsByProductId, setReviewStatsByProductId] = useState<
    Record<string, ProductReviewStats>
  >({})
  const applyStatic = useCallback(() => {
    setApiInventory(null)
    setSource('static')
  }, [])

  /** На проде без снимка в БД — пустой каталог, не демо из `catalogProducts.ts`. */
  const applyEmptyApi = useCallback(() => {
    setApiInventory({ catalog: [], stocks: [], warehouses: [] })
    setSource('api')
  }, [])

  const applyDevSyncFallback = useCallback(async (): Promise<boolean> => {
    if (!import.meta.env.DEV) return false
    const sync = await fetchDevSyncInventory()
    if (sync?.catalog?.length) {
      setSource('api')
      setApiInventory({
        catalog: sync.catalog,
        stocks: sync.stocks ?? [],
        warehouses: sync.warehouses ?? [],
      })
      return true
    }
    return false
  }, [])

  const fetchInventory = useCallback(async () => {
    if (!apiExpected) {
      applyStatic()
      setHydrated(true)
      return
    }
    try {
      const draft = await fetchAdminProductsInventoryFromApi()
      if (draft != null && Array.isArray(draft.catalog) && draft.catalog.length > 0) {
        setSource('api')
        setApiInventory({
          catalog: draft.catalog,
          stocks: draft.stocks ?? [],
          warehouses: draft.warehouses ?? [],
        })
        return
      }
      if (await applyDevSyncFallback()) return
      applyEmptyApi()
    } catch {
      if (await applyDevSyncFallback()) return
      applyEmptyApi()
    } finally {
      setHydrated(true)
    }
  }, [apiExpected, applyStatic, applyEmptyApi, applyDevSyncFallback])

  useEffect(() => {
    void fetchInventory()
  }, [fetchInventory])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onUpdate = () => {
      void fetchInventory()
    }
    window.addEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, onUpdate)
  }, [fetchInventory])

  const loadReviewStats = useCallback(async () => {
    if (!apiExpected) {
      setReviewStatsByProductId({})
      return
    }
    try {
      const all = await fetchAllStoreReviews()
      setReviewStatsByProductId(buildProductReviewStatsMap(all))
    } catch {
      setReviewStatsByProductId({})
    }
  }, [apiExpected])

  useEffect(() => {
    if (!hydrated) return
    void loadReviewStats()
  }, [hydrated, loadReviewStats])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onReviews = () => {
      void loadReviewStats()
    }
    window.addEventListener(REVIEWS_UPDATED_EVENT, onReviews)
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, onReviews)
  }, [loadReviewStats])

  const { products: baseProducts, metaById } = useMemo(() => {
    if (apiExpected && !hydrated) {
      return { products: [] as Product[], metaById: {} as Record<string, ProductMeta> }
    }
    if (source === 'api' && apiInventory !== null) {
      return mapCatalogRowsToStorefront(apiInventory.catalog, {
        stocks: apiInventory.stocks,
        warehouses: apiInventory.warehouses,
      })
    }
    if (source === 'static') {
      return { products: staticProducts, metaById: staticMetaById }
    }
    return { products: [] as Product[], metaById: {} as Record<string, ProductMeta> }
  }, [apiExpected, hydrated, source, apiInventory])

  const products = useMemo(
    () => applyReviewStatsToProducts(baseProducts, reviewStatsByProductId),
    [baseProducts, reviewStatsByProductId],
  )

  const catalogFingerprint = useMemo(
    () => `${source}:${products.map((p) => `${p.id}:${p.price}`).join('|')}`,
    [source, products],
  )

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  )

  const getRelatedProducts = useCallback(
    (currentId: string, limit = 4) =>
      getRelatedProductsFromCatalog(products, metaById, currentId, limit),
    [products, metaById],
  )

  const value = useMemo(
    () => ({
      products,
      metaById,
      source,
      hydrated,
      catalogFingerprint,
      getProductById,
      getRelatedProducts,
    }),
    [products, metaById, source, hydrated, catalogFingerprint, getProductById, getRelatedProducts],
  )

  return <CatalogInventoryContext.Provider value={value}>{children}</CatalogInventoryContext.Provider>
}

export function useCatalogInventory() {
  const ctx = useContext(CatalogInventoryContext)
  if (!ctx) {
    throw new Error('useCatalogInventory must be used within CatalogInventoryProvider')
  }
  return ctx
}
