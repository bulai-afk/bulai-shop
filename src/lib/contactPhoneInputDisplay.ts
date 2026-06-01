import {
  composePhoneDisplay,
  composePhoneTel,
  is375DialTyping,
  is7DialTyping,
  nationalMaxLength,
  parsePhoneTel,
  phoneDigitsFromTel,
  shouldShowBy80NationalTail,
  type PhoneDialCode,
} from '../admin/lib/phoneCountry'

/** Подпись страны справа от поля; пока регион не ясен — пусто (без тире). */
export function phoneRegionLabel(
  parsed: { dial: PhoneDialCode; nationalDigits: string },
  digitsOnly: string,
): string {
  if (!digitsOnly) return ''
  if (digitsOnly === '8') return ''
  if (parsed.dial === '+7') return 'RU'
  if (parsed.dial === '+375') return 'BY'
  return ''
}

/**
 * Текст для превью tel: пока номер вводят — в т.ч. после «80» до полного префикса 8029/8033/…,
 * когда `nationalDigits` ещё пустые, но уже есть цифры национальной части после «80».
 */
export function composePhonePreviewTel(
  parsed: { dial: PhoneDialCode; nationalDigits: string },
  digitsOnly: string,
): string {
  const { dial, nationalDigits } = parsed
  if (nationalDigits) {
    return composePhoneTel(dial, nationalDigits)
  }
  if (dial === '+7' && is7DialTyping(digitsOnly)) {
    return '+7'
  }
  if (dial === '+375' && is375DialTyping(digitsOnly)) {
    return `+${digitsOnly}`
  }
  if (dial === '+7' && digitsOnly.startsWith('8') && digitsOnly.length > 1) {
    const maxNat = nationalMaxLength('+7')
    return `+7${digitsOnly.slice(1, 1 + maxNat)}`
  }
  if (dial === '+7' && digitsOnly.startsWith('7') && digitsOnly.length > 1) {
    const maxNat = nationalMaxLength('+7')
    return `+7${digitsOnly.slice(1, 1 + maxNat)}`
  }
  if (dial === '+375' && shouldShowBy80NationalTail(digitsOnly)) {
    const maxNat = nationalMaxLength('+375')
    return `+375${digitsOnly.slice(2, 2 + maxNat)}`
  }
  if (dial === '+375' && digitsOnly.startsWith('375') && digitsOnly.length > 3) {
    const maxNat = nationalMaxLength('+375')
    return `+375${digitsOnly.slice(3, 3 + maxNat)}`
  }
  return composePhoneTel(dial, nationalDigits)
}

/** Национальная часть для маски и tel:, в т.ч. пока добирают 80… / 375… */
export function phoneEffectiveNationalDigits(
  parsed: { dial: PhoneDialCode; nationalDigits: string },
  digitsOnly: string,
): string {
  if (parsed.nationalDigits) return parsed.nationalDigits
  if (parsed.dial === '+375' && shouldShowBy80NationalTail(digitsOnly)) {
    return digitsOnly.slice(2, 2 + nationalMaxLength('+375'))
  }
  if (parsed.dial === '+375' && digitsOnly.startsWith('375') && digitsOnly.length > 3) {
    return digitsOnly.slice(3, 3 + nationalMaxLength('+375'))
  }
  return ''
}

export function countDigitsLeftOfIndex(s: string, index: number): number {
  const end = Math.max(0, Math.min(index, s.length))
  return s.slice(0, end).replace(/\D/g, '').length
}

export function indexAfterNthDigit(s: string, n: number): number {
  if (n <= 0) return 0
  let seen = 0
  for (let i = 0; i < s.length; i++) {
    if (/\d/.test(s[i])) {
      seen++
      if (seen === n) return i + 1
    }
  }
  return s.length
}

export function phoneInputDisplayedValue(
  rawTel: string,
  parsed: { dial: PhoneDialCode; nationalDigits: string },
  digitsOnly: string,
): string {
  if (!phoneRegionLabel(parsed, digitsOnly)) {
    return rawTel
  }
  const effNat = phoneEffectiveNationalDigits(parsed, digitsOnly)
  if (parsed.dial === '+375' && !effNat && is375DialTyping(digitsOnly)) {
    return `+${digitsOnly}`
  }
  if (parsed.dial === '+7' && !effNat && is7DialTyping(digitsOnly)) {
    return '+7'
  }
  return composePhoneDisplay(parsed.dial, effNat)
}

/** После «80» в маске три цифры +375, а ввели две — без этого курсор оказывается после «7». */
export function phoneCaretDigitCountForState(digitsBeforeCaret: number, digitsStored: string): number {
  let n = Math.min(digitsBeforeCaret, digitsStored.length)
  if (digitsStored === '80') {
    const p = parsePhoneTel(digitsStored)
    const disp = phoneInputDisplayedValue(digitsStored, p, digitsStored)
    n = Math.max(n, disp.replace(/\D/g, '').length)
  }
  if (digitsStored === '89') {
    const p = parsePhoneTel(digitsStored)
    const disp = phoneInputDisplayedValue(digitsStored, p, digitsStored)
    n = Math.max(n, disp.replace(/\D/g, '').length)
  }
  return n
}

/** Индекс цифры для каретки после удаления: React в onChange часто даёт selectionStart = 0. */
export function phoneCaretDigitIndexAfterDeletion(prevDigits: string, nextDigits: string): number {
  let i = 0
  const len = Math.min(prevDigits.length, nextDigits.length)
  while (i < len && prevDigits[i] === nextDigits[i]) i++
  return i
}

export function contactPhoneError(parsed: { dial: PhoneDialCode; nationalDigits: string }): string | null {
  if (!parsed.nationalDigits) return null
  const n = nationalMaxLength(parsed.dial)
  if (parsed.nationalDigits.length === n) return null
  return parsed.dial === '+375'
    ? 'Номер неполный: после +375 нужно 9 цифр.'
    : 'Номер неполный: после +7 нужно 10 цифр.'
}

/** Полный номер BY/RU для валидации шага (хранение как `phoneTel` в настройках). */
export function isCompleteStoredPhoneDigits(valueTel: string): boolean {
  const p = parsePhoneTel(valueTel)
  if (!p.nationalDigits) return false
  return contactPhoneError(p) === null && p.nationalDigits.length === nationalMaxLength(p.dial)
}

/** Чекаут: после «Продолжить» — пустой или неполный номер. */
export function checkoutPhoneFieldError(valueTel: string, submitAttempted: boolean): string | null {
  const parsed = parsePhoneTel(valueTel)
  const inc = contactPhoneError(parsed)
  if (inc) return inc
  if (!submitAttempted) return null
  if (isCompleteStoredPhoneDigits(valueTel)) return null
  const digits = phoneDigitsFromTel(valueTel)
  if (digits.length === 0) return 'Введите номер.'
  return 'Укажите полный номер телефона.'
}

/** Строка для сводки в аккордеоне чекаута. */
export function formatPhoneForSummaryLine(valueTel: string): string {
  const digits = phoneDigitsFromTel(valueTel)
  const p = parsePhoneTel(valueTel)
  if (isCompleteStoredPhoneDigits(valueTel)) {
    return composePhoneDisplay(p.dial, p.nationalDigits)
  }
  const shown = phoneInputDisplayedValue(valueTel, p, digits).trim()
  return shown || '—'
}
