import { useCallback, useEffect, useState } from 'react'
import { fetchProductReviews } from '../api/reviewsApi'
import { isSiteConfigApiExpected } from '../constants/apiBase'
import type { CatalogReview } from '../types/catalogReview'
import { notifyReviewsUpdated } from './useStoreReviews'

export { notifyReviewsUpdated }

export function useProductReviews(productId: string | undefined): {
  reviews: CatalogReview[]
  productRating: number | null
  reviewCount: number | null
  loading: boolean
  reload: () => void
} {
  const [reviews, setReviews] = useState<CatalogReview[]>([])
  const [productRating, setProductRating] = useState<number | null>(null)
  const [reviewCount, setReviewCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!productId?.trim() || !isSiteConfigApiExpected()) {
      setReviews([])
      setProductRating(null)
      setReviewCount(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await fetchProductReviews(productId, 1, 200)
      setReviews(data.items ?? [])
      setProductRating(typeof data.productRating === 'number' ? data.productRating : null)
      setReviewCount(typeof data.reviewCount === 'number' ? data.reviewCount : null)
    } catch {
      setReviews([])
      setProductRating(null)
      setReviewCount(null)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onUpdate = () => {
      void load()
    }
    window.addEventListener('bulai-shop-reviews-updated', onUpdate)
    return () => window.removeEventListener('bulai-shop-reviews-updated', onUpdate)
  }, [load])

  return { reviews, productRating, reviewCount, loading, reload: load }
}
