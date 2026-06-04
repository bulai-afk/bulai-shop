import { publicApiUrl } from '../constants/apiBase'

export type YandexOAuthPublicConfig = {
  clientId: string | null
  redirectUri: string | null
}

export async function fetchYandexOAuthPublicConfig(): Promise<YandexOAuthPublicConfig | null> {
  try {
    const res = await fetch(publicApiUrl('/api/auth/yandex-config'), { cache: 'no-store' })
    if (!res.ok) return null
    const body = (await res.json()) as YandexOAuthPublicConfig
    const clientId = typeof body.clientId === 'string' && body.clientId.trim() ? body.clientId.trim() : null
    const redirectUri =
      typeof body.redirectUri === 'string' && body.redirectUri.trim() ? body.redirectUri.trim() : null
    return { clientId, redirectUri }
  } catch {
    return null
  }
}
