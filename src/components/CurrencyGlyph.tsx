import { useCurrency } from '../context/CurrencyContext'
import { BelarusRubleSign, BYN_SIGN_CLASS } from './BelarusRubleSign'

/** Символ выбранной валюты в шапке (BYN — «Б», RUB — ₽). */
export function CurrencyGlyph({ className }: { className?: string }) {
  const { currency } = useCurrency()
  if (currency === 'RUB') {
    return <span className={className}>₽</span>
  }
  return <BelarusRubleSign className={className ?? BYN_SIGN_CLASS} />
}
