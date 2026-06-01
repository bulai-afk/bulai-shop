import { CATEGORY_QUERY_SLUG, type CategoryOption } from '../data/catalogProducts'

export type CatalogCategoryPromoSlug = 'novinki' | 'mayki' | 'rubashki' | 'bryuki'

const SLUG_TO_CATEGORY: Record<CatalogCategoryPromoSlug, CategoryOption> = {
  novinki: 'новинки',
  mayki: 'майки',
  rubashki: 'рубашки',
  bryuki: 'брюки',
}

/** Порядок плиток в мегаменю «Мужское». */
export const MEGA_MENU_CATEGORY_SLUG_ORDER: CatalogCategoryPromoSlug[] = [
  'novinki',
  'mayki',
  'rubashki',
  'bryuki',
]

/** Вкладки блока «Ключевые детали» на странице каталога (без «Новинки»). */
export const CATALOG_KEY_DETAILS_SLUG_ORDER: CatalogCategoryPromoSlug[] = ['rubashki', 'mayki', 'bryuki']

export function catalogHrefForPromoSlug(slug: CatalogCategoryPromoSlug): string {
  const cat = SLUG_TO_CATEGORY[slug]
  return `/catalog?category=${CATEGORY_QUERY_SLUG[cat]}`
}
