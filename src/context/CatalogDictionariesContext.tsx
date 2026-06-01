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
import { buildDefaultProductsDictionaries } from '../admin/data/siteSettingsDefaults'
import type { ProductsDictionariesDraft } from '../admin/types/siteSettings'

const PRODUCTS_DICTIONARIES_UPDATED_EVENT = 'bulai-shop-products-dictionaries-updated'

const CatalogDictionariesContext = createContext<ProductsDictionariesDraft | null>(null)

export function CatalogDictionariesProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ProductsDictionariesDraft | null>(null)

  const fetchDictionaries = useCallback(async () => {
    if (!isSiteConfigApiExpected()) {
      setDraft(null)
      return
    }
    try {
      const remote = await fetchAdminProductsDictionariesFromApi()
      setDraft(remote ?? buildDefaultProductsDictionaries())
    } catch {
      setDraft(null)
    }
  }, [])

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

  const value = useMemo(() => draft, [draft])

  return (
    <CatalogDictionariesContext.Provider value={value}>{children}</CatalogDictionariesContext.Provider>
  )
}

export function useCatalogDictionaries(): ProductsDictionariesDraft | null {
  return useContext(CatalogDictionariesContext)
}
