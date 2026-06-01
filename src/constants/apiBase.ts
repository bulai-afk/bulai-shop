/** База публичного API (без завершающего слэша). Пусто — относительные пути `/api/...` (один origin в проде). */
export function getPublicApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_URL
  if (typeof v === 'string' && v.trim()) return v.replace(/\/$/, '')
  return ''
}

export function publicApiUrl(path: string): string {
  const base = getPublicApiBaseUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}

/**
 * Нужно ли вызывать API (сохранение в БД из админки и т.д.).
 * - Задан `VITE_API_URL` — явный бэкенд.
 * - `npm run dev` (`import.meta.env.DEV`) — запросы на `/api/...` идут через proxy Vite на :3001.
 * - Иначе на localhost/127.0.0.1 — без API (только localStorage), чтобы не сыпались ошибки без бэка.
 */
export function isSiteConfigApiExpected(): boolean {
  if (getPublicApiBaseUrl()) return true
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h !== 'localhost' && h !== '127.0.0.1'
}
