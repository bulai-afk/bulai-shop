import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { buildDefaultPromoMaterials, buildDefaultSiteConfig } from '../admin/data/siteSettingsDefaults'
import type { PromoMaterialsForm, SiteConfigForm } from '../admin/types/siteSettings'
import { fetchPromoMaterialsFromApi } from '../api/promoMaterialsApi'
import { fetchSiteConfigFromApi } from '../api/siteConfigApi'
import { isSiteConfigApiExpected } from '../constants/apiBase'
import { mergePromoMaterialsForm } from '../utils/promoMaterialsForm'
import { mergeSiteConfigForm } from '../utils/siteConfigForm'

type StorefrontSettingsContextValue = {
  siteConfig: SiteConfigForm | null
  promoMaterials: PromoMaterialsForm | null
  /** Первичная загрузка с API (успешная или с ошибкой) ещё не завершена */
  loading: boolean
}

const StorefrontSettingsContext = createContext<StorefrontSettingsContextValue | null>(null)

/**
 * Данные витрины только с API (без localStorage).
 * Оборачивает разметку `Layout`; админка этим провайдером не пользуется.
 */
export function StorefrontSettingsProvider({ children }: { children: ReactNode }) {
  const apiExpected = isSiteConfigApiExpected()
  const [siteConfig, setSiteConfig] = useState<SiteConfigForm | null>(() =>
    apiExpected ? null : buildDefaultSiteConfig(),
  )
  const [promoMaterials, setPromoMaterials] = useState<PromoMaterialsForm | null>(() =>
    apiExpected ? null : buildDefaultPromoMaterials(),
  )
  const [loading, setLoading] = useState(apiExpected)

  useEffect(() => {
    if (!apiExpected) return
    let cancelled = false
    ;(async () => {
      try {
        const [sc, pm] = await Promise.all([
          fetchSiteConfigFromApi(),
          fetchPromoMaterialsFromApi(),
        ])
        if (cancelled) return
        setSiteConfig(sc != null ? mergeSiteConfigForm(sc) : buildDefaultSiteConfig())
        setPromoMaterials(pm != null ? mergePromoMaterialsForm(pm) : buildDefaultPromoMaterials())
      } catch {
        if (!cancelled) {
          setSiteConfig(buildDefaultSiteConfig())
          setPromoMaterials(buildDefaultPromoMaterials())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiExpected])

  const value = useMemo(
    () => ({ siteConfig, promoMaterials, loading }),
    [siteConfig, promoMaterials, loading],
  )

  return (
    <StorefrontSettingsContext.Provider value={value}>{children}</StorefrontSettingsContext.Provider>
  )
}

function useStorefrontSettings(): StorefrontSettingsContextValue {
  const ctx = useContext(StorefrontSettingsContext)
  if (!ctx) {
    throw new Error('StorefrontSettingsProvider обязателен для хуков витрины')
  }
  return ctx
}

export function useStorefrontSiteConfig(): SiteConfigForm {
  const { siteConfig } = useStorefrontSettings()
  return siteConfig ?? buildDefaultSiteConfig()
}

export function useStorefrontPromoMaterials(): PromoMaterialsForm {
  const { promoMaterials } = useStorefrontSettings()
  return promoMaterials ?? buildDefaultPromoMaterials()
}

export function useStorefrontSettingsLoading(): boolean {
  return useStorefrontSettings().loading
}
