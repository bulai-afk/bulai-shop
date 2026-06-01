import { useCallback, useEffect, useState } from 'react'
import { fetchStoreReviews } from '../api/reviewsApi'
import { isSiteConfigApiExpected } from '../constants/apiBase'
import type { CatalogReview } from '../types/catalogReview'

const REVIEWS_UPDATED_EVENT = 'bulai-shop-reviews-updated'

export function notifyReviewsUpdated() {
  window.dispatchEvent(new Event(REVIEWS_UPDATED_EVENT))
}

export function useStoreReviews(): {
  reviews: CatalogReview[]
  loading: boolean
  reload: () => void
} {
  const [reviews, setReviews] = useState<CatalogReview[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isSiteConfigApiExpected()) {
      setReviews([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await fetchStoreReviews(1, 200)
      setReviews(data.items ?? [])
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onUpdate = () => {
      void load()
    }
    window.addEventListener(REVIEWS_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, onUpdate)
  }, [load])

  return { reviews, loading, reload: load }
}
