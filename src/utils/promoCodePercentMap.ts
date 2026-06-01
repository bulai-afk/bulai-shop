import type { PromoCodeCatalogRow } from '../types/promoCodesCatalog'

/** Пустая дата — бессрочно; иначе ISO-дата поля type=date (локальный конец дня). */
export function isPromoCodeValidByDate(validUntil: string): boolean {
  const v = validUntil.trim()
  if (!v) return true
  const end = new Date(`${v}T23:59:59.999`)
  return !Number.isNaN(end.getTime()) && end.getTime() >= Date.now()
}

/** Код в верхнем регистре → процент (только непустой код, срок, 0 < % ≤ 100). */
export function promoCatalogRowsToPercentMap(rows: PromoCodeCatalogRow[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const row of rows) {
    const code = row.code.trim().toUpperCase()
    if (!code) continue
    if (!isPromoCodeValidByDate(row.validUntil)) continue
    const p = Math.min(100, Math.max(0, parseInt(row.discountPercent, 10) || 0))
    if (p <= 0) continue
    m[code] = p
  }
  return m
}
