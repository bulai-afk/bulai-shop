import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchBelarusbankRubRates } from '../api/exchangeRatesApi'
import { FALLBACK_RUB_OUT_PER_100 } from '../lib/storeMoneyDisplay'

export type CurrencyCode = 'RUB' | 'BYN'

/** v2: дефолт BYN для витрины bulai.by (старый ключ с RUB не подхватываем). */
const STORAGE_KEY = 'bulai-shop-currency-v2'
export const DEFAULT_CURRENCY: CurrencyCode = 'BYN'

const RATES_REFRESH_MS = 60 * 60 * 1000

export const CURRENCY_OPTIONS = [
  { code: 'BYN' as const, symbol: 'BYN' },
  { code: 'RUB' as const, symbol: '₽' },
] as const

type CurrencyContextValue = {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
  symbol: string
  /** BYN за 100 RUB (курс продажи Беларусбанка). */
  rubOutPer100: number
  rubRatesLoading: boolean
  rubRatesCity: string | null
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

function readStored(): CurrencyCode {
  try {
    const s = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null
    if (s === 'BYN' || s === 'RUB') return s
    localStorage.setItem(STORAGE_KEY, DEFAULT_CURRENCY)
  } catch {
    /* ignore */
  }
  return DEFAULT_CURRENCY
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(readStored)
  const [rubOutPer100, setRubOutPer100] = useState(FALLBACK_RUB_OUT_PER_100)
  const [rubRatesLoading, setRubRatesLoading] = useState(true)
  const [rubRatesCity, setRubRatesCity] = useState<string | null>(null)

  const loadRates = useCallback(async () => {
    const data = await fetchBelarusbankRubRates()
    if (data) {
      setRubOutPer100(data.rubOutPer100)
      setRubRatesCity(data.city)
    }
    setRubRatesLoading(false)
  }, [])

  useEffect(() => {
    void loadRates()
    const id = window.setInterval(() => {
      void loadRates()
    }, RATES_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [loadRates])

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c)
    try {
      localStorage.setItem(STORAGE_KEY, c)
    } catch {
      /* ignore */
    }
  }, [])

  const meta = useMemo(() => {
    const o = CURRENCY_OPTIONS.find((x) => x.code === currency)!
    return { symbol: o.symbol }
  }, [currency])

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      symbol: meta.symbol,
      rubOutPer100,
      rubRatesLoading,
      rubRatesCity,
    }),
    [currency, setCurrency, meta.symbol, rubOutPer100, rubRatesLoading, rubRatesCity],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
