import type { CategoryVisualPromoForm } from '../admin/types/siteSettings'
import type { ProductsDictionariesDraft } from '../admin/types/siteSettings'
import {
  CATEGORY_QUERY_SLUG,
  type CategoryOption,
} from '../data/catalogProducts'
import {
  MEGA_MENU_CATEGORY_SLUG_ORDER,
  catalogHrefForPromoSlug,
  type CatalogCategoryPromoSlug,
} from '../constants/catalogCategoryPromo'
import { categoryVisualBySlug } from './categoryVisualsStorefront'
import { CATEGORY_DICTIONARY_ID } from './productDictionaryValue'

export type MegaMenuTile = {
  title: string
  href: string
  img: string
  alt: string
}

const LABEL_TO_CATEGORY: Record<string, CategoryOption> = {
  новинки: 'новинки',
  майки: 'майки',
  футболки: 'майки',
  худи: 'майки',
  рубашки: 'рубашки',
  брюки: 'брюки',
}

/** Slug для `?category=` из значения справочника. */
export function catalogSlugForDictionaryValue(value: string, catalogSlug?: string): string {
  const explicit = catalogSlug?.trim().toLowerCase()
  if (explicit) return explicit
  const key = value.trim().toLowerCase()
  const cat = LABEL_TO_CATEGORY[key]
  if (cat) return CATEGORY_QUERY_SLUG[cat]
  return key.replace(/\s+/g, '-')
}

function isPromoSlug(s: string): s is CatalogCategoryPromoSlug {
  return (MEGA_MENU_CATEGORY_SLUG_ORDER as string[]).includes(s)
}

function promoImageForSlug(
  categoryVisuals: CategoryVisualPromoForm[],
  slug: string,
): string {
  if (!isPromoSlug(slug)) return ''
  return categoryVisualBySlug(categoryVisuals, slug)?.imageMegaMenu?.trim() ?? ''
}

/** Плитки мегаменю: справочник «Категория» (порядок = порядок значений), иначе промо по фикс. slug. */
export function buildMegaMenuTiles(
  dictionaries: ProductsDictionariesDraft | null,
  categoryVisuals: CategoryVisualPromoForm[],
): MegaMenuTile[] {
  const categoryDict = dictionaries?.dictionaries.find((d) => d.id === CATEGORY_DICTIONARY_ID)
  const values = categoryDict?.values.filter((v) => v.value.trim()) ?? []

  if (values.length > 0) {
    return values.map((v) => {
      const title = v.value.trim()
      const slug = catalogSlugForDictionaryValue(title, v.catalogSlug)
      const img =
        v.imageUrl.trim() ||
        promoImageForSlug(categoryVisuals, slug) ||
        ''
      return {
        title,
        href: `/catalog?category=${encodeURIComponent(slug)}`,
        img,
        alt: title,
      }
    })
  }

  return MEGA_MENU_CATEGORY_SLUG_ORDER.map((slug) => {
    const row = categoryVisualBySlug(categoryVisuals, slug)
    return {
      title: row?.displayName ?? slug,
      href: catalogHrefForPromoSlug(slug),
      img: row?.imageMegaMenu ?? '',
      alt: row?.displayName ?? '',
    }
  })
}
