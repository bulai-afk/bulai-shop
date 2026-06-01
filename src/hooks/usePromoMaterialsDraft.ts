import { useMemo, useSyncExternalStore } from 'react'
import {
  PROMO_MATERIALS_STORAGE_KEY,
  PROMO_MATERIALS_UPDATED_EVENT,
} from '../constants/promoMaterialsStorage'
import { buildDefaultPromoMaterials } from '../admin/data/siteSettingsDefaults'
import type { PromoMaterialsForm } from '../admin/types/siteSettings'
import { mergePromoMaterialsForm } from '../utils/promoMaterialsForm'

function readRaw(): string {
  try {
    return localStorage.getItem(PROMO_MATERIALS_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => {
    if (e.key === PROMO_MATERIALS_STORAGE_KEY || e.key === null) onChange()
  }
  const onLocal = () => onChange()
  window.addEventListener('storage', onStorage)
  window.addEventListener(PROMO_MATERIALS_UPDATED_EVENT, onLocal)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(PROMO_MATERIALS_UPDATED_EVENT, onLocal)
  }
}

function parseFull(raw: string): PromoMaterialsForm {
  if (!raw.trim()) return buildDefaultPromoMaterials()
  try {
    return mergePromoMaterialsForm(JSON.parse(raw) as unknown)
  } catch {
    return buildDefaultPromoMaterials()
  }
}

/** Промо-материалы из кэша (localStorage), синхронно с витриной и админкой. */
export function usePromoMaterialsDraft(): PromoMaterialsForm {
  const raw = useSyncExternalStore(subscribe, readRaw, () => '')
  return useMemo(() => parseFull(raw), [raw])
}
