import type { ProductDictionaryValue } from '../admin/types/siteSettings'

export const CATEGORY_DICTIONARY_ID = 'category'

export function normalizeDictionaryValue(
  raw: Partial<ProductDictionaryValue> | undefined,
  id: string,
): ProductDictionaryValue {
  return {
    id,
    value: typeof raw?.value === 'string' ? raw.value : '',
    color:
      typeof raw?.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.color) ? raw.color : '',
    imageUrl: typeof raw?.imageUrl === 'string' ? raw.imageUrl : '',
    catalogSlug: typeof raw?.catalogSlug === 'string' ? raw.catalogSlug : '',
  }
}
