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
import { mergePromoMaterialsForm } from '../utils/promoMaterialsForm'
import { mergeSiteConfigForm } from '../utils/siteConfigForm'

type StorefrontSettingsContextValue = {
  siteConfig: SiteConfigForm
  promoMaterials: PromoMaterialsForm
  /** Первичная загрузка с API (успешная или с ошибкой) ещё не завершена */
  loading: boolean
}

const StorefrontSettingsContext = createContext<StorefrontSettingsContextValue | null>(null)

/**
 * Данные витрины только с API (без localStorage).
 * Оборачивает разметку `Layout`; админка этим провайдером не пользуется.
 */
export function StorefrontSettingsProvider({ children }: { children: ReactNode }) {
  const [siteConfig, setSiteConfig] = useState<SiteConfigForm>(() => buildDefaultSiteConfig())
  const [promoMaterials, setPromoMaterials] = useState<PromoMaterialsForm>(() =>
    buildDefaultPromoMaterials(),
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [sc, pm] = await Promise.all([
          fetchSiteConfigFromApi(),
          fetchPromoMaterialsFromApi(),
        ])
        if (cancelled) return
        if (sc != null) setSiteConfig(mergeSiteConfigForm(sc))
        if (pm != null) setPromoMaterials(mergePromoMaterialsForm(pm))
      } catch {
        /* офлайн, нет прокси /api, 5xx — остаются дефолты */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
  return useStorefrontSettings().siteConfig
}

export function useStorefrontPromoMaterials(): PromoMaterialsForm {
  return useStorefrontSettings().promoMaterials
}

export function useStorefrontSettingsLoading(): boolean {
  return useStorefrontSettings().loading
}
