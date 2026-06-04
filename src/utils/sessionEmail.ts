function b64UrlToBinarySegment(segment: string): string {
  const pad = segment.length % 4 === 0 ? '' : '='.repeat(4 - (segment.length % 4))
  return atob(segment.replace(/-/g, '+').replace(/_/g, '/') + pad)
}

/** Email покупателя из JWT (`sub`), как на бэкенде в /api/me/orders. */
export function readSessionJwtSub(sessionJwt: string | null): string | null {
  if (!sessionJwt?.trim()) return null
  try {
    const parts = sessionJwt.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(b64UrlToBinarySegment(parts[1])) as { sub?: unknown }
    const sub = typeof payload.sub === 'string' ? payload.sub.trim().toLowerCase() : ''
    return sub || null
  } catch {
    return null
  }
}

const YANDEX_PLACEHOLDER_EMAIL = 'yandex@id.yandex'

/** Email для привязки заказов: приоритет у JWT, иначе email из профиля (не заглушка Яндекса). */
export function resolveStorefrontBuyerEmail(
  sessionJwt: string | null,
  userEmail: string | undefined,
): string | undefined {
  const fromJwt = readSessionJwtSub(sessionJwt)
  if (fromJwt) return fromJwt
  const u = userEmail?.trim().toLowerCase()
  if (!u || u === YANDEX_PLACEHOLDER_EMAIL) return undefined
  return u
}
