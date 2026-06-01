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
import { isSiteConfigApiExpected } from '../constants/apiBase'
import type { ProductCatalogRow } from '../admin/types/siteSettings'
import {
  META_BY_ID as staticMetaById,
  products as staticProducts,
  type Product,
  type ProductMeta,
} from '../data/catalogProducts'
import { getRelatedProductsFromCatalog, mapCatalogRowsToStorefront } from '../utils/mapInventoryCatalogToStorefront'

/** Совпадает с `PRODUCTS_INVENTORY_UPDATED_EVENT` в админке — обновление витрины после сохранения каталога. */
const PRODUCTS_INVENTORY_UPDATED_EVENT = 'bulai-shop-products-inventory-updated'

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
  const [apiRows, setApiRows] = useState<ProductCatalogRow[] | null>(null)
  const [source, setSource] = useState<CatalogSource>(apiExpected ? 'api' : 'static')
  const [hydrated, setHydrated] = useState(!apiExpected)

  const applyStatic = useCallback(() => {
    setApiRows(null)
    setSource('static')
  }, [])

  /** На проде без снимка в БД — пустой каталог, не демо из `catalogProducts.ts`. */
  const applyEmptyApi = useCallback(() => {
    setApiRows([])
    setSource('api')
  }, [])

  const fetchInventory = useCallback(async () => {
    if (!apiExpected) {
      applyStatic()
      setHydrated(true)
      return
    }
    try {
      const draft = await fetchAdminProductsInventoryFromApi()
      if (draft != null && Array.isArray(draft.catalog)) {
        setSource('api')
        setApiRows(draft.catalog)
        return
      }
      applyEmptyApi()
    } catch {
      applyEmptyApi()
    } finally {
      setHydrated(true)
    }
  }, [apiExpected, applyStatic, applyEmptyApi])

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

  const { products, metaById } = useMemo(() => {
    if (apiExpected && !hydrated) {
      return { products: [] as Product[], metaById: {} as Record<string, ProductMeta> }
    }
    if (source === 'api' && apiRows !== null) {
      return mapCatalogRowsToStorefront(apiRows)
    }
    if (source === 'static') {
      return { products: staticProducts, metaById: staticMetaById }
    }
    return { products: [] as Product[], metaById: {} as Record<string, ProductMeta> }
  }, [apiExpected, hydrated, source, apiRows])

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
