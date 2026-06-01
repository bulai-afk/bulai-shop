/**
 * Нормализация JSON настроек сайта (тот же смысл слияния, что и на клиенте в mergeSiteConfigForm).
 */

export type SiteConfigJson = {
  brand: {
    logoUrl: string
    logoColor: string
    logoAlt: string
    logoHref: string
  }
  contact: {
    phoneDisplay: string
    phoneTel: string
    email: string
    addressDisplay: string
  }
  socialLinks: Array<{ id: string; name: string; href: string }>
  footer: {
    legalEntityLine: string
    shopNameLine: string
  }
  adminAccessClientIds: string[]
}

function defaultConfig(): SiteConfigJson {
  const year = new Date().getFullYear()
  return {
    brand: {
      logoUrl: '',
      logoColor: '',
      logoAlt: 'Bulai Shop',
      logoHref: '/',
    },
    contact: {
      phoneDisplay: '',
      phoneTel: '',
      email: 'hello@example.com',
      addressDisplay: '',
    },
    socialLinks: [
      { id: 'vk', name: 'VK', href: '' },
      { id: 'telegram', name: 'Telegram', href: '' },
      { id: 'youtube', name: 'YouTube', href: '' },
    ],
    footer: {
      legalEntityLine: 'ИП Булыга Александр Игоревич',
      shopNameLine: `© ${year} Интернет-магазин bulai.by`,
    },
    adminAccessClientIds: [],
  }
}

export function normalizeSiteConfig(input: unknown): SiteConfigJson {
  if (!input || typeof input !== 'object') return defaultConfig()
  const raw = input as Partial<SiteConfigJson>
  if (!raw.contact || typeof raw.contact.email !== 'string') return defaultConfig()
  const base = defaultConfig()
  return {
    ...base,
    ...raw,
    brand: { ...base.brand, ...(raw.brand ?? {}) },
    contact: { ...base.contact, ...raw.contact },
    footer: { ...base.footer, ...(raw.footer ?? {}) },
    socialLinks: Array.isArray(raw.socialLinks) ? raw.socialLinks : base.socialLinks,
    adminAccessClientIds: Array.isArray(raw.adminAccessClientIds)
      ? raw.adminAccessClientIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : base.adminAccessClientIds,
  }
}
