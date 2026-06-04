import { publicApiUrl } from '../constants/apiBase'
import type { StorefrontOrder } from '../types/storefrontOrder'

export async function fetchMyStorefrontOrders(sessionJwt: string): Promise<StorefrontOrder[]> {
  const res = await fetch(publicApiUrl('/api/me/orders'), {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${sessionJwt}` },
  })
  if (!res.ok) throw new Error(`GET /api/me/orders ${res.status}`)
  const body = (await res.json()) as { orders?: StorefrontOrder[] }
  return Array.isArray(body.orders) ? body.orders : []
}
