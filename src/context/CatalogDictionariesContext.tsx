import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchAdminProductsDictionariesFromApi } from '../api/adminDataApi'
import { isSiteConfigApiExpected } from '../constants/apiBase'
import type { ProductsDictionariesDraft } from '../admin/types/siteSettings'

const PRODUCTS_DICTIONARIES_UPDATED_EVENT = 'bulai-shop-products-dictionaries-updated'

const EMPTY_PRODUCTS_DICTIONARIES: ProductsDictionariesDraft = {
  dictionaries: [],
  skuSourceDictionaryIds: [],
}

type CatalogDictionariesContextValue = {
  draft: ProductsDictionariesDraft | null
  hydrated: boolean
}

const CatalogDictionariesContext = createContext<CatalogDictionariesContextValue | null>(null)

export function CatalogDictionariesProvider({ children }: { children: ReactNode }) {
  const apiExpected = isSiteConfigApiExpected()
  const [draft, setDraft] = useState<ProductsDictionariesDraft | null>(null)
  const [hydrated, setHydrated] = useState(!apiExpected)

  const fetchDictionaries = useCallback(async () => {
    if (!apiExpected) {
      setDraft(null)
      setHydrated(true)
      return
    }
    try {
      const remote = await fetchAdminProductsDictionariesFromApi()
      setDraft(remote ?? EMPTY_PRODUCTS_DICTIONARIES)
    } catch {
      setDraft(EMPTY_PRODUCTS_DICTIONARIES)
    } finally {
      setHydrated(true)
    }
  }, [apiExpected])

  useEffect(() => {
    void fetchDictionaries()
  }, [fetchDictionaries])

  useEffect(() => {
    const onUpdate = () => {
      void fetchDictionaries()
    }
    window.addEventListener(PRODUCTS_DICTIONARIES_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(PRODUCTS_DICTIONARIES_UPDATED_EVENT, onUpdate)
  }, [fetchDictionaries])

  const value = useMemo(() => ({ draft, hydrated }), [draft, hydrated])

  return (
    <CatalogDictionariesContext.Provider value={value}>{children}</CatalogDictionariesContext.Provider>
  )
}

export function useCatalogDictionaries(): ProductsDictionariesDraft | null {
  return useContext(CatalogDictionariesContext)?.draft ?? null
}

export function useCatalogDictionariesHydrated(): boolean {
  return useContext(CatalogDictionariesContext)?.hydrated ?? true
}
