import type { ReactNode } from 'react'
import { isSiteConfigApiExpected } from '../constants/apiBase'
import { useCatalogDictionariesHydrated } from '../context/CatalogDictionariesContext'
import { useCatalogInventory } from '../context/CatalogInventoryContext'
import { useStorefrontSettingsLoading } from '../context/StorefrontSettingsContext'

/**
 * На проде не рендерит витрину, пока не подтянуты настройки, каталог и справочники —
 * иначе на первом кадре видны buildDefault* из кода.
 */
export function StorefrontBootstrapGate({ children }: { children: ReactNode }) {
  const settingsLoading = useStorefrontSettingsLoading()
  const { hydrated: catalogHydrated } = useCatalogInventory()
  const dictionariesHydrated = useCatalogDictionariesHydrated()
  const apiGate = isSiteConfigApiExpected()
  const ready = !apiGate || (catalogHydrated && dictionariesHydrated && !settingsLoading)

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center px-4 py-16">
        <p className="text-sm text-gray-400">Загрузка…</p>
      </div>
    )
  }

  return children
}
