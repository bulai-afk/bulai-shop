import { useCurrency } from '../context/CurrencyContext'
import { formatStoreMoneyForDisplay } from '../lib/storeMoneyDisplay'
import { BelarusRubleSign, BYN_SIGN_CLASS } from './BelarusRubleSign'
import { RubleSignChar } from './RubleSignChar'

/** Сумма из каталога (BYN) + знак валюты по выбору в шапке. */
export function MoneyAmount({
  amount,
  className = '',
  symbolClassName,
  /** В админке — всегда BYN, без пересчёта по переключателю витрины. */
  storeCurrencyOnly = false,
}: {
  amount: number | string
  className?: string
  symbolClassName?: string
  storeCurrencyOnly?: boolean
}) {
  const { currency, rubOutPer100 } = useCurrency()
  const displayCurrency = storeCurrencyOnly ? 'BYN' : currency
  const text = formatStoreMoneyForDisplay(amount, displayCurrency, rubOutPer100)

  return (
    <span className={`tabular-nums whitespace-nowrap ${className}`.trim()}>
      {text}
      {displayCurrency === 'RUB' ? (
        <RubleSignChar />
      ) : (
        <BelarusRubleSign className={symbolClassName ?? BYN_SIGN_CLASS} />
      )}
    </span>
  )
}
