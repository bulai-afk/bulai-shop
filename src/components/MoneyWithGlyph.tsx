import { useCurrency } from '../context/CurrencyContext'
import { formatStoreMoneyForDisplay } from '../lib/storeMoneyDisplay'
import { BelarusRubleSign, BYN_SIGN_CLASS } from './BelarusRubleSign'
import { RubleSignChar } from './RubleSignChar'

/** Сумма из корзины (цифры в BYN) + знак выбранной валюты. */
export function MoneyWithGlyph({
  amount,
  className = '',
  prefix,
}: {
  amount: string
  className?: string
  prefix?: string
}) {
  const { currency, rubOutPer100 } = useCurrency()
  const text = formatStoreMoneyForDisplay(amount, currency, rubOutPer100)

  return (
    <span className={`tabular-nums whitespace-nowrap ${className}`.trim()}>
      {prefix ? <span>{prefix}</span> : null}
      {text}
      {currency === 'RUB' ? <RubleSignChar /> : <BelarusRubleSign className={BYN_SIGN_CLASS} />}
    </span>
  )
}
