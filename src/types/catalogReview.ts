export type CatalogReview = {
  id: string
  name: string
  avatar: string
  rating: number
  text: string
  productId?: string | null
}

export type ReviewListResponse = {
  items: CatalogReview[]
  total: number
  productRating?: number
  reviewCount?: number
}
