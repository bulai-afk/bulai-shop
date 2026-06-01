import { publicApiUrl } from '../constants/apiBase'
import type { PromoCodesCatalogDraft } from '../types/promoCodesCatalog'
import { mergePromoCodesCatalogDraft } from '../utils/promoCodesCatalogForm'

type GetPromoCodesResponse = { promoCodes: PromoCodesCatalogDraft['promoCodes'] | null }

/** GET /api/promo-codes — null, если в БД ещё нет строки. */
export async function fetchPromoCodesCatalogFromApi(): Promise<PromoCodesCatalogDraft | null> {
  const res = await fetch(publicApiUrl('/api/promo-codes'), { cache: 'no-store' })
  if (!res.ok) throw new Error(`promo-codes get ${res.status}`)
  const body = (await res.json()) as GetPromoCodesResponse
  if (body.promoCodes == null) return null
  return mergePromoCodesCatalogDraft({ promoCodes: body.promoCodes })
}

export async function putPromoCodesCatalogToApi(draft: PromoCodesCatalogDraft): Promise<void> {
  const res = await fetch(publicApiUrl('/api/promo-codes'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
  if (!res.ok) throw new Error(`promo-codes put ${res.status}`)
}
