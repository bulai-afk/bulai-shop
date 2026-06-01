import { useMemo, useSyncExternalStore } from 'react'
import {
  SITE_CONFIG_STORAGE_KEY,
  SITE_CONFIG_UPDATED_EVENT,
} from '../constants/siteConfigStorage'
import { buildDefaultSiteConfig } from '../admin/data/siteSettingsDefaults'
import type { SiteConfigForm } from '../admin/types/siteSettings'
import { mergeSiteConfigForm } from '../utils/siteConfigForm'

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

function parseFull(raw: string): SiteConfigForm {
  if (!raw.trim()) return buildDefaultSiteConfig()
  try {
    return mergeSiteConfigForm(JSON.parse(raw) as unknown)
  } catch {
    return buildDefaultSiteConfig()
  }
}

/** Полные настройки сайта из кэша (localStorage), синхронно с витриной и админкой. */
export function useSiteConfigDraft(): SiteConfigForm {
  const raw = useSyncExternalStore(subscribe, readRaw, () => '')
  return useMemo(() => parseFull(raw), [raw])
}
