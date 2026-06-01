/**
 * Дата в формате ДД.ММ.ГГГГ из строки `YYYY-MM-DD` (как у `<input type="date">` / ISO date).
 */
export function formatDateRuFromIso(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!m) return isoDate
  const [, y, mo, d] = m
  return `${d}.${mo}.${y}`
}
