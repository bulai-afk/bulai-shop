import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type CurrencyCode = 'RUB' | 'BYN'

const STORAGE_KEY = 'bulai-shop-currency'

export const CURRENCY_OPTIONS = [
  { code: 'RUB' as const, symbol: '₽' },
  { code: 'BYN' as const, symbol: 'Br' },
] as const

type CurrencyContextValue = {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
  symbol: string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

function readStored(): CurrencyCode {
  try {
    const s = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null
    if (s === 'RUB' || s === 'BYN') return s
  } catch {
    /* ignore */
  }
  return 'RUB'
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(readStored)

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
    }),
    [currency, setCurrency, meta.symbol],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
