import { publicApiUrl } from '../constants/apiBase'

export async function postYandexSessionToken(yandexOAuthToken: string): Promise<string> {
  const res = await fetch(publicApiUrl('/api/auth/session'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yandexOAuthToken }),
  })
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; token?: string; error?: string }
  if (!res.ok || !body.token) {
    throw new Error(body.error ?? `auth_session_${res.status}`)
  }
  return body.token
}

export async function postEmailSessionToken(email: string): Promise<string> {
  const res = await fetch(publicApiUrl('/api/auth/session'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'email', email }),
  })
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; token?: string; error?: string }
  if (!res.ok || !body.token) {
    throw new Error(body.error ?? `auth_session_${res.status}`)
  }
  return body.token
}
