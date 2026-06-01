import type { ProductsDictionariesDraft, ProductsInventoryDraft } from '../admin/types/siteSettings'

const DEV_SYNC_PREFIX = '/__dev_sync__'

/** Снимок каталога из `data/sync/` (только `npm run dev`). */
export async function fetchDevSyncInventory(): Promise<ProductsInventoryDraft | null> {
  if (!import.meta.env.DEV) return null
  try {
    const res = await fetch(`${DEV_SYNC_PREFIX}/products-inventory.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as ProductsInventoryDraft
    return Array.isArray(data.catalog) ? data : null
  } catch {
    return null
  }
}

export async function fetchDevSyncDictionaries(): Promise<ProductsDictionariesDraft | null> {
  if (!import.meta.env.DEV) return null
  try {
    const res = await fetch(`${DEV_SYNC_PREFIX}/products-dictionaries.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as ProductsDictionariesDraft
    return Array.isArray(data.dictionaries) ? data : null
  } catch {
    return null
  }
}
