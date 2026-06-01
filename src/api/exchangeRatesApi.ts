import { publicApiUrl } from '../constants/apiBase'

export type BelarusbankRubRates = {
  city: string
  rubOutPer100: number
  rubInPer100: number
  filialSample: string | null
  fetchedAt: string
}

type Response = { ok: boolean; data?: BelarusbankRubRates }

export async function fetchBelarusbankRubRates(): Promise<BelarusbankRubRates | null> {
  try {
    const res = await fetch(publicApiUrl('/api/exchange-rates/belarusbank/rub'), {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const body = (await res.json()) as Response
    if (!body.ok || body.data == null) return null
    const { rubOutPer100 } = body.data
    if (!Number.isFinite(rubOutPer100) || rubOutPer100 <= 0) return null
    return body.data
  } catch {
    return null
  }
}
