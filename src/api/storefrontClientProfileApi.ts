import { publicApiUrl } from '../constants/apiBase'

/** Ответ GET /api/profile/me — строка клиента (как в админке). */
export type StorefrontClientRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  profile?: Record<string, unknown>
}

function authHeaders(sessionJwt: string): HeadersInit {
  return {
    Authorization: `Bearer ${sessionJwt}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchStorefrontClientMe(sessionJwt: string): Promise<StorefrontClientRow | null> {
  const res = await fetch(publicApiUrl('/api/profile/me'), {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${sessionJwt}` },
  })
  if (!res.ok) throw new Error(`GET /api/profile/me ${res.status}`)
  const body = (await res.json()) as { data: StorefrontClientRow | null }
  return body.data ?? null
}

export async function putStorefrontClientProfileMe(
  sessionJwt: string,
  payload: {
    firstName: string
    lastName: string
    phone: string
    profile: unknown
  },
): Promise<void> {
  const res = await fetch(publicApiUrl('/api/profile/me'), {
    method: 'PUT',
    headers: authHeaders(sessionJwt),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`PUT /api/profile/me ${res.status}`)
}
