/** Базовая валюта магазина — белорусский рубль (BYN). */
export const STORE_CURRENCY_CODE = 'BYN' as const
export const STORE_CURRENCY_LABEL = 'бел. руб.'

/** Только число, без знака валюты (знак — компонент `BelarusRubleSign`). */
export function formatBelarusRubAmount(amount: number): string {
  const n = Math.max(0, amount)
  const hasFraction = Math.abs(n - Math.round(n)) > 1e-6
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n)
}

/** @deprecated Используйте `formatBelarusRubAmount` + `MoneyAmount` / `BelarusRubleSign`. */
export function formatBelarusRub(amount: number): string {
  return formatBelarusRubAmount(amount)
}

/** Подпись поля цены в админке. */
export function adminPriceFieldLabel(short = true): string {
  return short ? 'Цена, BYN' : `Цена (${STORE_CURRENCY_LABEL})`
}
