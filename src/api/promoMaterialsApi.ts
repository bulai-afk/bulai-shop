import { publicApiUrl } from '../constants/apiBase'
import type { PromoMaterialsForm } from '../admin/types/siteSettings'
import { mergePromoMaterialsForm } from '../utils/promoMaterialsForm'

type GetPromoMaterialsResponse = { promo: PromoMaterialsForm | null }

/** GET /api/promo-materials — null, если в БД ещё нет строки. */
export async function fetchPromoMaterialsFromApi(): Promise<PromoMaterialsForm | null> {
  const res = await fetch(publicApiUrl('/api/promo-materials'), { cache: 'no-store' })
  if (!res.ok) throw new Error(`promo-materials get ${res.status}`)
  const body = (await res.json()) as GetPromoMaterialsResponse
  if (body.promo == null) return null
  return mergePromoMaterialsForm(body.promo)
}

export async function putPromoMaterialsToApi(promo: PromoMaterialsForm): Promise<void> {
  const res = await fetch(publicApiUrl('/api/promo-materials'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(promo),
  })
  if (!res.ok) throw new Error(`promo-materials put ${res.status}`)
}
