import { buildDefaultSiteConfig } from '../admin/data/siteSettingsDefaults'
import type { SiteConfigForm } from '../admin/types/siteSettings'

/** Слияние с дефолтами (для ответа API и localStorage). */
export function mergeSiteConfigForm(p: unknown): SiteConfigForm {
  if (!p || typeof p !== 'object') return buildDefaultSiteConfig()
  const raw = p as Partial<SiteConfigForm>
  if (!raw.contact || typeof raw.contact.email !== 'string') return buildDefaultSiteConfig()
  const base = buildDefaultSiteConfig()
  return {
    ...base,
    ...raw,
    brand: { ...base.brand, ...raw.brand },
    contact: { ...base.contact, ...raw.contact },
    footer: { ...base.footer, ...raw.footer },
    socialLinks: Array.isArray(raw.socialLinks) ? raw.socialLinks : base.socialLinks,
    adminAccessClientIds: Array.isArray(raw.adminAccessClientIds)
      ? raw.adminAccessClientIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : base.adminAccessClientIds,
  }
}
