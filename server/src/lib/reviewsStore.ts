import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '../db/pool.js'

export type CatalogReviewRecord = {
  id: string
  name: string
  avatar: string
  rating: number
  text: string
  productId: string | null
  createdAt: string
}

const TABLE = 'store_reviews_snapshot'
const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'

function normalizeReview(raw: unknown, index: number): CatalogReviewRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const rating = Number(r.rating)
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null
  const text = typeof r.text === 'string' ? r.text.trim() : ''
  if (text.length < 3) return null
  const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim() : 'Покупатель'
  const avatar =
    typeof r.avatar === 'string' && r.avatar.trim() ? r.avatar.trim() : DEFAULT_AVATAR
  const id =
    typeof r.id === 'string' && r.id.trim() ? r.id.trim() : `review-${index + 1}`
  const productId =
    r.productId === null || r.productId === undefined
      ? null
      : typeof r.productId === 'string' && r.productId.trim()
        ? r.productId.trim()
        : null
  const createdAt =
    typeof r.createdAt === 'string' && r.createdAt.trim()
      ? r.createdAt.trim()
      : new Date().toISOString()
  return { id, name, avatar, rating: Math.round(rating), text, productId, createdAt }
}

export async function loadAllReviews(): Promise<CatalogReviewRecord[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT payload FROM \`${TABLE}\` WHERE id = 1 LIMIT 1`,
  )
  const row = rows[0] as { payload?: unknown } | undefined
  if (row?.payload == null) return []
  const payload =
    typeof row.payload === 'string' ? (JSON.parse(row.payload) as unknown) : row.payload
  if (!payload || typeof payload !== 'object') return []
  const list = (payload as { reviews?: unknown }).reviews
  if (!Array.isArray(list)) return []
  const out: CatalogReviewRecord[] = []
  for (let i = 0; i < list.length; i++) {
    const n = normalizeReview(list[i], i)
    if (n) out.push(n)
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function saveAllReviews(reviews: CatalogReviewRecord[]): Promise<void> {
  const pool = getPool()
  const json = JSON.stringify({ reviews })
  await pool.query(
    `INSERT INTO \`${TABLE}\` (id, payload) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
    [json],
  )
}

export function paginateReviews(
  items: CatalogReviewRecord[],
  page: number,
  pageSize: number,
): { items: CatalogReviewRecord[]; total: number } {
  const p = Math.max(1, Math.floor(page) || 1)
  const size = Math.min(100, Math.max(1, Math.floor(pageSize) || 20))
  const total = items.length
  const start = (p - 1) * size
  return { items: items.slice(start, start + size), total }
}

export function productReviewStats(items: CatalogReviewRecord[]): {
  productRating: number
  reviewCount: number
} {
  if (items.length === 0) return { productRating: 0, reviewCount: 0 }
  const sum = items.reduce((acc, r) => acc + r.rating, 0)
  return {
    productRating: Math.round((sum / items.length) * 10) / 10,
    reviewCount: items.length,
  }
}

export { DEFAULT_AVATAR }
