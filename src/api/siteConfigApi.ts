import { publicApiUrl } from '../constants/apiBase'
import type { SiteConfigForm } from '../admin/types/siteSettings'
import { mergeSiteConfigForm } from '../utils/siteConfigForm'

type GetSiteConfigResponse = { config: SiteConfigForm | null }

/** GET /api/site-config — null, если в БД ещё нет строки. */
export async function fetchSiteConfigFromApi(): Promise<SiteConfigForm | null> {
  const res = await fetch(publicApiUrl('/api/site-config'), { cache: 'no-store' })
  if (!res.ok) throw new Error(`site-config get ${res.status}`)
  const body = (await res.json()) as GetSiteConfigResponse
  if (body.config == null) return null
  return mergeSiteConfigForm(body.config)
}

export async function putSiteConfigToApi(config: SiteConfigForm): Promise<void> {
  const res = await fetch(publicApiUrl('/api/site-config'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error(`site-config put ${res.status}`)
}
