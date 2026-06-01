import type { CatalogCategoryPromoSlug } from '../constants/catalogCategoryPromo'
import type { CategoryVisualPromoForm } from '../admin/types/siteSettings'

export function categoryVisualBySlug(
  rows: CategoryVisualPromoForm[],
  slug: CatalogCategoryPromoSlug,
): CategoryVisualPromoForm | undefined {
  return rows.find((r) => r.slug === slug)
}
