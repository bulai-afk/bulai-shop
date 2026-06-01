import { config } from '../config.js'

export type BelarusbankFilialRate = {
  RUB_in?: string
  RUB_out?: string
  filial_id?: string
  filials_text?: string
  name?: string
  name_type?: string
}

export type RubExchangeSnapshot = {
  city: string
  /** Сколько BYN банк берёт за 100 RUB (продажа RUB клиенту). */
  rubOutPer100: number
  /** Сколько BYN банк платит за 100 RUB (покупка RUB у клиента). */
  rubInPer100: number
  filialSample: string | null
  fetchedAt: string
}

const CACHE_TTL_MS = 60 * 60 * 1000
let cache: { at: number; data: RubExchangeSnapshot } | null = null

function parseRate(raw: string | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = Number.parseFloat(String(raw).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function pickRubRates(rows: BelarusbankFilialRate[]): { in100: number; out100: number } | null {
  for (const row of rows) {
    const out100 = parseRate(row.RUB_out)
    const in100 = parseRate(row.RUB_in)
    if (out100 != null && in100 != null) {
      return { in100, out100 }
    }
  }
  return null
}

export async function fetchBelarusbankRubRates(): Promise<RubExchangeSnapshot> {
  const city = config.belarusbankKursCity
  const url = new URL('https://belarusbank.by/api/kursExchange')
  url.searchParams.set('city', city)

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    throw new Error(`belarusbank kursExchange ${res.status}`)
  }

  const rows = (await res.json()) as BelarusbankFilialRate[]
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('belarusbank kursExchange: empty list')
  }

  const picked = pickRubRates(rows)
  if (!picked) {
    throw new Error('belarusbank kursExchange: RUB rates not found')
  }

  const sample = rows.find((r) => r.RUB_out && r.filials_text)

  return {
    city,
    rubOutPer100: picked.out100,
    rubInPer100: picked.in100,
    filialSample: sample?.filials_text?.trim() ?? null,
    fetchedAt: new Date().toISOString(),
  }
}

export async function getBelarusbankRubRatesCached(): Promise<RubExchangeSnapshot> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.data
  }
  const data = await fetchBelarusbankRubRates()
  cache = { at: now, data }
  return data
}
