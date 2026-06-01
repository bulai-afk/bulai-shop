import { config } from '../config.js'

function byteLengthUtf8(s: string): number {
  return Buffer.byteLength(s, 'utf8')
}

/** Убирает из объекта длинные строки (data URL, base64) для безопасного вывода в консоль. */
function redactLargeStrings(value: unknown, maxLen = 100): unknown {
  if (typeof value === 'string') {
    if (value.length > maxLen || value.startsWith('data:')) {
      return `[string ${value.length} chars]`
    }
    return value
  }
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map((item) => redactLargeStrings(item, maxLen))
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    out[k] = redactLargeStrings(v, maxLen)
  }
  return out
}

/** Краткий лог успешного сохранения снимка в БД. */
export function logSiteConfigSaved(normalizedJson: string, label = 'site-config'): void {
  const bytes = byteLengthUtf8(normalizedJson)
  try {
    const o = JSON.parse(normalizedJson) as {
      brand?: { logoUrl?: string; logoColor?: string; logoAlt?: string; logoHref?: string }
      contact?: {
        phoneDisplay?: string
        phoneTel?: string
        email?: string
        addressDisplay?: string
      }
      footer?: { legalEntityLine?: string; shopNameLine?: string }
      socialLinks?: Array<{ id?: string; name?: string; href?: string }>
      adminAccessClientIds?: string[]
    }
    const logoLen = typeof o.brand?.logoUrl === 'string' ? o.brand.logoUrl.length : 0
    const legal = (o.footer?.legalEntityLine ?? '').replace(/\r?\n/g, ' ').slice(0, 80)
    const addr = (o.contact?.addressDisplay ?? '').slice(0, 72)
    const social = o.socialLinks ?? []
    const admins = o.adminAccessClientIds ?? []

    console.log(`[api] PUT /api/${label} → БД OK (${bytes} B)`)
    console.log(
      `[api]   brand: logoUrl=${logoLen} chars logoColor=${JSON.stringify(o.brand?.logoColor ?? '')} logoAlt=${JSON.stringify((o.brand?.logoAlt ?? '').slice(0, 48))} logoHref=${JSON.stringify((o.brand?.logoHref ?? '').slice(0, 48))}`,
    )
    console.log(
      `[api]   contact: email=${JSON.stringify(o.contact?.email ?? '')} phoneDisplay=${JSON.stringify(o.contact?.phoneDisplay ?? '')} phoneTel=${JSON.stringify((o.contact?.phoneTel ?? '').slice(0, 32))} addressDisplay=${JSON.stringify(addr)}`,
    )
    console.log(
      `[api]   footer: shopNameLine=${JSON.stringify((o.footer?.shopNameLine ?? '').slice(0, 72))} legalEntityLine=${JSON.stringify(legal)}`,
    )
    console.log(`[api]   socialLinks (${social.length}):`)
    social.forEach((row, i) => {
      const href = (row.href ?? '').slice(0, 64)
      console.log(
        `[api]     [${i}] id=${JSON.stringify(row.id ?? '')} name=${JSON.stringify(row.name ?? '')} href=${JSON.stringify(href)}`,
      )
    })
    console.log(
      `[api]   adminAccessClientIds (${admins.length}): ${admins.slice(0, 12).join(', ')}${admins.length > 12 ? '…' : ''}`,
    )
  } catch {
    console.log(`[api] PUT /api/${label} → БД OK (${bytes} B)`)
  }
  if (config.nodeEnv === 'development') {
    try {
      const redacted = redactLargeStrings(JSON.parse(normalizedJson) as unknown)
      console.log(`[api] PUT /api/${label} JSON (без длинных полей):\n${JSON.stringify(redacted, null, 2)}`)
    } catch {
      /* ignore */
    }
  }
}

export function logPromoMaterialsSaved(normalizedJson: string): void {
  const bytes = byteLengthUtf8(normalizedJson)
  try {
    const o = JSON.parse(normalizedJson) as {
      tickerMessages?: string[]
      homeHeroes?: {
        badgeText?: string
        title?: string
        subtitle?: string
        primaryCtaLabel?: string
        secondaryCtaLabel?: string
      }[]
      aboutHero?: { title?: string; description?: string }
    }
    const tickers = Array.isArray(o.tickerMessages) ? o.tickerMessages : []
    const slides = Array.isArray(o.homeHeroes) ? o.homeHeroes : []
    const ah = o.aboutHero ?? {}
    console.log(`[api] PUT /api/promo-materials → БД OK (${bytes} B)`)
    console.log(`[api]   tickerMessages (${tickers.length}):`)
    tickers.forEach((t, i) => {
      console.log(`[api]     [${i}] ${JSON.stringify((t ?? '').slice(0, 100))}`)
    })
    console.log(`[api]   homeHeroes (${slides.length}):`)
    slides.forEach((hh, i) => {
      console.log(
        `[api]     [${i}] badge=${JSON.stringify((hh.badgeText ?? '').slice(0, 48))} title=${JSON.stringify((hh.title ?? '').slice(0, 56))} subtitle=${JSON.stringify((hh.subtitle ?? '').slice(0, 72))} primaryCta=${JSON.stringify((hh.primaryCtaLabel ?? '').slice(0, 32))} secondaryCta=${JSON.stringify((hh.secondaryCtaLabel ?? '').slice(0, 32))}`,
      )
    })
    console.log(
      `[api]   aboutHero: title=${JSON.stringify((ah.title ?? '').slice(0, 56))} description=${JSON.stringify((ah.description ?? '').slice(0, 80))}`,
    )
  } catch {
    console.log(`[api] PUT /api/promo-materials → БД OK (${bytes} B)`)
  }
  if (config.nodeEnv === 'development') {
    try {
      const redacted = redactLargeStrings(JSON.parse(normalizedJson) as unknown)
      console.log(
        `[api] PUT /api/promo-materials JSON (без длинных полей):\n${JSON.stringify(redacted, null, 2)}`,
      )
    } catch {
      /* ignore */
    }
  }
}

export function logAdminWorkspaceSaved(segment: string, json: string, hint = ''): void {
  const bytes = byteLengthUtf8(json)
  const tail = hint ? ` ${hint}` : ''
  console.log(`[api] PUT /api/admin/data/${segment} → БД OK (${bytes} B)${tail}`)
}

export function logPromoCodesCatalogSaved(normalizedJson: string): void {
  const bytes = byteLengthUtf8(normalizedJson)
  try {
    const o = JSON.parse(normalizedJson) as {
      promoCodes?: Array<{ code?: string; discountPercent?: string; validUntil?: string }>
    }
    const rows = Array.isArray(o.promoCodes) ? o.promoCodes : []
    console.log(`[api] PUT /api/promo-codes → БД OK (${bytes} B) строк=${rows.length}`)
    rows.forEach((row, i) => {
      console.log(
        `[api]   [${i}] code=${JSON.stringify((row.code ?? '').slice(0, 24))} %=${JSON.stringify(String(row.discountPercent ?? '').slice(0, 8))} until=${JSON.stringify(String(row.validUntil ?? '').slice(0, 12))}`,
      )
    })
  } catch {
    console.log(`[api] PUT /api/promo-codes → БД OK (${bytes} B)`)
  }
  if (config.nodeEnv === 'development') {
    try {
      console.log(`[api] PUT /api/promo-codes JSON:\n${JSON.stringify(JSON.parse(normalizedJson), null, 2)}`)
    } catch {
      /* ignore */
    }
  }
}
