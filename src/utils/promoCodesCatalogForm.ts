import type { PromoCodeCatalogRow, PromoCodesCatalogDraft } from '../types/promoCodesCatalog'

export function defaultPromoCodesCatalogDraft(): PromoCodesCatalogDraft {
  return {
    promoCodes: [
      { code: 'HELLO15', note: 'Скидка 15% для новых клиентов', validUntil: '', discountPercent: '15' },
      { code: 'SPRING10', note: 'Весенняя акция', validUntil: '', discountPercent: '10' },
    ],
  }
}

export function mergePromoCodesCatalogDraft(input: unknown): PromoCodesCatalogDraft {
  const base = defaultPromoCodesCatalogDraft()
  if (!input || typeof input !== 'object') return base
  const raw = input as { promoCodes?: unknown }
  if (!Array.isArray(raw.promoCodes)) return base
  return {
    promoCodes: raw.promoCodes.map((row): PromoCodeCatalogRow => {
      const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
      return {
        code: typeof r.code === 'string' ? r.code : '',
        note: typeof r.note === 'string' ? r.note : '',
        validUntil: typeof r.validUntil === 'string' ? r.validUntil : '',
        discountPercent: typeof r.discountPercent === 'string' ? r.discountPercent : '',
      }
    }),
  }
}
