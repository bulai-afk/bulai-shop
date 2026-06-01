import type { CurrencyCode } from '../context/CurrencyContext'
import { formatBelarusRubAmount } from './formatMoney'

/**
 * Запасной курс, если API недоступен: BYN за 100 RUB (продажа), ~как у Беларусбанка.
 * Пересчёт: rub = byn × 100 / rubOutPer100
 */
export const FALLBACK_RUB_OUT_PER_100 = 3.83

export function parseStoreMoneyDigits(value: string | number): number {
  if (typeof value === 'number') return Math.max(0, value)
  return parseInt(String(value).replace(/\D/g, ''), 10) || 0
}

/** BYN → сумма в выбранной валюте (для RUB — по курсу продажи RUB банком). */
export function convertBynToDisplay(
  byn: number,
  currency: CurrencyCode,
  rubOutPer100: number,
): number {
  const n = Math.max(0, byn)
  if (currency === 'BYN') return n
  const rate = rubOutPer100 > 0 ? rubOutPer100 : FALLBACK_RUB_OUT_PER_100
  return Math.round((n * 100) / rate)
}

export function formatStoreMoneyForDisplay(
  value: string | number,
  currency: CurrencyCode,
  rubOutPer100: number,
): string {
  const byn = parseStoreMoneyDigits(value)
  return formatBelarusRubAmount(convertBynToDisplay(byn, currency, rubOutPer100))
}
