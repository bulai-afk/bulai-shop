import { publicApiUrl } from '../constants/apiBase'
import type { StorefrontOrder } from '../types/storefrontOrder'

export class StorefrontOrdersApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`GET /api/me/orders ${status}`)
    this.name = 'StorefrontOrdersApiError'
    this.status = status
  }
}

export async function fetchMyStorefrontOrders(sessionJwt: string): Promise<StorefrontOrder[]> {
  let res: Response
  try {
    res = await fetch(publicApiUrl('/api/me/orders'), {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${sessionJwt}` },
    })
  } catch {
    throw new StorefrontOrdersApiError(0)
  }
  if (!res.ok) throw new StorefrontOrdersApiError(res.status)
  const body = (await res.json()) as { orders?: StorefrontOrder[] }
  return Array.isArray(body.orders) ? body.orders : []
}
