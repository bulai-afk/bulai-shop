export type PromoCodeCatalogRow = {
  code: string
  note: string
  validUntil: string
  discountPercent: string
}

export type PromoCodesCatalogDraft = {
  promoCodes: PromoCodeCatalogRow[]
}
