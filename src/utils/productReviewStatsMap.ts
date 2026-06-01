import type { CatalogReview } from '../types/catalogReview'
import type { Product } from '../data/catalogProducts'

export type ProductReviewStats = {
  rating: number
  count: number
}

/** Средний рейтинг и число отзывов по каждому productId из снимка отзывов. */
export function buildProductReviewStatsMap(
  reviews: CatalogReview[],
): Record<string, ProductReviewStats> {
  const buckets = new Map<string, { sum: number; count: number }>()
  for (const r of reviews) {
    const pid = r.productId?.trim()
    if (!pid) continue
    const b = buckets.get(pid) ?? { sum: 0, count: 0 }
    b.sum += r.rating
    b.count += 1
    buckets.set(pid, b)
  }
  const out: Record<string, ProductReviewStats> = {}
  for (const [pid, { sum, count }] of buckets) {
    out[pid] = {
      rating: Math.round((sum / count) * 10) / 10,
      count,
    }
  }
  return out
}

export function applyReviewStatsToProducts(
  products: Product[],
  statsByProductId: Record<string, ProductReviewStats>,
): Product[] {
  return products.map((p) => {
    const s = statsByProductId[p.id]
    if (!s || s.count === 0) {
      return { ...p, rating: 0, reviews: 0 }
    }
    return { ...p, rating: s.rating, reviews: s.count }
  })
}
