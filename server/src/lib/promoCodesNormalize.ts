export type PromoCodeRowJson = {
  code: string
  note: string
  validUntil: string
  discountPercent: string
}

export type PromoCodesCatalogJson = {
  promoCodes: PromoCodeRowJson[]
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

export function normalizePromoCodesCatalog(input: unknown): PromoCodesCatalogJson {
  if (!input || typeof input !== 'object') return { promoCodes: [] }
  const raw = input as { promoCodes?: unknown }
  if (!Array.isArray(raw.promoCodes)) return { promoCodes: [] }
  const promoCodes: PromoCodeRowJson[] = raw.promoCodes.map((row) => {
    const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    return {
      code: str(r.code).trim().toUpperCase(),
      note: str(r.note).trim(),
      validUntil: str(r.validUntil).trim(),
      discountPercent: str(r.discountPercent).trim(),
    }
  })
  return { promoCodes }
}
