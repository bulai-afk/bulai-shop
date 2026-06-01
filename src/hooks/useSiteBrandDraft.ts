import { useMemo, useSyncExternalStore } from 'react'
import {
  SITE_CONFIG_STORAGE_KEY,
  SITE_CONFIG_UPDATED_EVENT,
} from '../constants/siteConfigStorage'

export type SiteBrandDraft = {
  logoUrl: string
  logoColor: string
  logoAlt: string
  logoHref: string
}

const empty: SiteBrandDraft = {
  logoUrl: '',
  logoColor: '',
  logoAlt: '',
  logoHref: '',
}

function readRaw(): string {
  try {
    return localStorage.getItem(SITE_CONFIG_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => {
    if (e.key === SITE_CONFIG_STORAGE_KEY || e.key === null) onChange()
  }
  const onLocal = () => onChange()
  window.addEventListener('storage', onStorage)
  window.addEventListener(SITE_CONFIG_UPDATED_EVENT, onLocal)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(SITE_CONFIG_UPDATED_EVENT, onLocal)
  }
}

function parseBrand(raw: string): SiteBrandDraft {
  if (!raw) return empty
  try {
    const p = JSON.parse(raw) as { brand?: Partial<SiteBrandDraft> }
    const b = p?.brand
    if (!b) return empty
    return {
      logoUrl: typeof b.logoUrl === 'string' ? b.logoUrl : '',
      logoColor: typeof b.logoColor === 'string' ? b.logoColor : '',
      logoAlt: typeof b.logoAlt === 'string' ? b.logoAlt : '',
      logoHref: typeof b.logoHref === 'string' ? b.logoHref : '',
    }
  } catch {
    return empty
  }
}

export function useSiteBrandDraft(): SiteBrandDraft {
  const raw = useSyncExternalStore(subscribe, readRaw, () => '')
  return useMemo(() => parseBrand(raw), [raw])
}
