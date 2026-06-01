import { publicApiUrl } from '../constants/apiBase'
import { SESSION_JWT_STORAGE_KEY } from '../constants/sessionJwtStorage'
import type { CatalogReview, ReviewListResponse } from '../types/catalogReview'

function sessionJwt(): string | null {
  try {
    const t = localStorage.getItem(SESSION_JWT_STORAGE_KEY)
    return t?.trim() ? t.trim() : null
  } catch {
    return null
  }
}

export async function fetchStoreReviews(page = 1, pageSize = 100): Promise<ReviewListResponse> {
  const res = await fetch(
    publicApiUrl(`/api/reviews?page=${page}&pageSize=${pageSize}`),
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`reviews get ${res.status}`)
  return (await res.json()) as ReviewListResponse
}

export async function fetchProductReviews(
  productId: string,
  page = 1,
  pageSize = 100,
): Promise<ReviewListResponse> {
  const res = await fetch(
    publicApiUrl(`/api/products/${encodeURIComponent(productId)}/reviews?page=${page}&pageSize=${pageSize}`),
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`product reviews get ${res.status}`)
  return (await res.json()) as ReviewListResponse
}

export async function postStoreReview(body: {
  rating: number
  text: string
  productId?: string | null
}): Promise<CatalogReview> {
  const jwt = sessionJwt()
  if (!jwt) throw new Error('auth_required')
  const res = await fetch(publicApiUrl('/api/reviews'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`reviews post ${res.status}`)
  return (await res.json()) as CatalogReview
}

export async function postProductReview(
  productId: string,
  body: { rating: number; text: string },
): Promise<CatalogReview> {
  const jwt = sessionJwt()
  if (!jwt) throw new Error('auth_required')
  const res = await fetch(publicApiUrl(`/api/products/${encodeURIComponent(productId)}/reviews`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`product reviews post ${res.status}`)
  return (await res.json()) as CatalogReview
}
