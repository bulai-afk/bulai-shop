export type PhoneDialCode = '+375' | '+7'

const MAX_NATIONAL: Record<PhoneDialCode, number> = {
  '+375': 9,
  '+7': 10,
}

/** Максимум цифр в поле ввода: 375 + 9 (BY) или 7 + 10 (RU). */
export const PHONE_INPUT_MAX_DIGITS = 12

/** Ввод с «80» и кодом оператора BY (29, 33, 44, 25). */
const BY_TRUNK_PREFIXES = ['8029', '8033', '8044', '8025'] as const

/** Первые две цифры национальной части BY (моб.) без кода 375. */
const BY_NATIONAL_PREFIX = /^(29|25|33|44)/

export function nationalMaxLength(dial: PhoneDialCode): number {
  return MAX_NATIONAL[dial]
}

/** Набор кода 375 по одной цифре (ещё не «375» целиком и не национальная часть). */
export function is375DialTyping(digits: string): boolean {
  return digits.length >= 1 && digits.length <= 2 && '375'.startsWith(digits)
}

/** Только код страны +7, без национальной части (как одна «7» при наборе). */
export function is7DialTyping(digits: string): boolean {
  return digits === '7'
}

/** После «80» показываем хвост номера только если уже префикс 8029/8033/8044/8025 (не «802…»). */
export function shouldShowBy80NationalTail(digits: string): boolean {
  return (
    digits.startsWith('80') &&
    digits.length > 2 &&
    BY_TRUNK_PREFIXES.some((p) => digits.startsWith(p))
  )
}

export function composePhoneTel(dial: PhoneDialCode, nationalDigits: string): string {
  return dial + nationalDigits
}

/**
 * Визуальное форматирование (одинаковая логика шагов для BY и RU):
 * - BY: `+375` + 2 цифры кода оператора + хвост с дефисами (9 цифр национальной части).
 * - RU: `+7` + 3 цифры (код ABC) + тот же шаблон хвоста (10 цифр национальной части).
 * Без скобок у российского номера — как у белорусского, только первый блок 3 цифры вместо 2.
 */
export function composePhoneDisplay(dial: PhoneDialCode, nationalDigits: string): string {
  const d = nationalDigits
  if (dial === '+375') {
    if (!d) return dial
    const head = d.slice(0, 2)
    const r = d.slice(2)
    if (!r) return `${dial} ${head}`.trimEnd()
    if (r.length <= 3) return `${dial} ${head} ${r}`
    if (r.length <= 5) return `${dial} ${head} ${r.slice(0, 3)}-${r.slice(3)}`
    return `${dial} ${head} ${r.slice(0, 3)}-${r.slice(3, 5)}-${r.slice(5, 7)}`
  }
  if (dial === '+7') {
    if (!d) return dial
    const headLen = 3
    if (d.length <= headLen) return `${dial} ${d}`.trimEnd()
    const head = d.slice(0, headLen)
    const r = d.slice(headLen)
    if (!r) return `${dial} ${head}`.trimEnd()
    if (r.length <= 3) return `${dial} ${head} ${r}`
    if (r.length <= 5) return `${dial} ${head} ${r.slice(0, 3)}-${r.slice(3)}`
    return `${dial} ${head} ${r.slice(0, 3)}-${r.slice(3, 5)}-${r.slice(5, 7)}`
  }
  return dial
}

function inferFallbackDial(digits: string): PhoneDialCode {
  const c = digits[0]
  // Ведущая «8» разбирается отдельно (80… → BY, 8X… → RU), сюда не попадает.
  if (c === '7' || c === '9') return '+7'
  return '+375'
}

/**
 * Одна строка цифр: сам определяет BY (+375, 375, 80 29/33/44/25…) или RU (+7, 7, 8…, 9…).
 *
 * Ведущая 8: одна цифра — ещё неизвестно; 80… — белорусский «групповой» до 8029/8033/8044/8025;
 * 89…, 81… и т.д. (вторая не 0) — российская 8 с национальной частью без этой восьмёрки.
 */
export function parsePhoneDigitsAuto(digits: string): { dial: PhoneDialCode; nationalDigits: string } {
  if (!digits) {
    return { dial: '+375', nationalDigits: '' }
  }
  if (is375DialTyping(digits)) {
    return { dial: '+375', nationalDigits: '' }
  }
  if (digits.startsWith('375')) {
    return { dial: '+375', nationalDigits: digits.slice(3).slice(0, MAX_NATIONAL['+375']) }
  }
  if (digits === '7') {
    return { dial: '+7', nationalDigits: '' }
  }
  if (digits.startsWith('7') && digits.length >= 2 && digits.length <= 10) {
    return { dial: '+7', nationalDigits: digits.slice(1).slice(0, MAX_NATIONAL['+7']) }
  }
  if (digits === '8') {
    return { dial: '+375', nationalDigits: '' }
  }
  if (digits.startsWith('80')) {
    for (const p of BY_TRUNK_PREFIXES) {
      if (digits.startsWith(p)) {
        return { dial: '+375', nationalDigits: digits.slice(2).slice(0, MAX_NATIONAL['+375']) }
      }
    }
    return { dial: '+375', nationalDigits: '' }
  }
  if (digits.startsWith('8') && digits.length >= 2) {
    return { dial: '+7', nationalDigits: digits.slice(1).slice(0, MAX_NATIONAL['+7']) }
  }
  if (digits.startsWith('7') && digits.length >= 11) {
    return { dial: '+7', nationalDigits: digits.slice(1, 11) }
  }
  if (digits.length === 10 && digits[0] === '9') {
    return { dial: '+7', nationalDigits: digits.slice(0, 10) }
  }
  if (digits.length === 9 && BY_NATIONAL_PREFIX.test(digits)) {
    return { dial: '+375', nationalDigits: digits.slice(0, 9) }
  }
  const dial = inferFallbackDial(digits)
  const max = MAX_NATIONAL[dial]
  return { dial, nationalDigits: digits.slice(0, max) }
}

/**
 * `phoneTel` из строки только цифр (поле ввода в админке).
 */
export function phoneTelFromDigits(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, PHONE_INPUT_MAX_DIGITS)
  if (!d) return ''
  if (d === '3' || d === '37') return d
  const p = parsePhoneDigitsAuto(d)
  return composePhoneTel(p.dial, p.nationalDigits)
}

export function parseLoosePhoneInput(raw: string): { dial: PhoneDialCode; nationalDigits: string } {
  return parsePhoneTel(phoneTelFromDigits(raw))
}

/** Цифры для поля ввода из сохранённого `phoneTel`. */
export function phoneDigitsFromTel(phoneTel: string): string {
  return phoneTel.replace(/\D/g, '')
}

export function parsePhoneTel(phoneTel: string): { dial: PhoneDialCode; nationalDigits: string } {
  const t = phoneTel.trim()
  if (t === '') {
    return { dial: '+375', nationalDigits: '' }
  }
  if (t === '3' || t === '37') {
    return { dial: '+375', nationalDigits: '' }
  }
  if (t === '+') {
    return { dial: '+7', nationalDigits: '' }
  }
  if (t === '+3' || t === '+37') {
    return { dial: '+375', nationalDigits: '' }
  }
  if (t.startsWith('+375')) {
    const national = t.slice(4).replace(/\D/g, '').slice(0, MAX_NATIONAL['+375'])
    return { dial: '+375', nationalDigits: national }
  }
  if (t.startsWith('+7')) {
    const national = t.slice(2).replace(/\D/g, '').slice(0, MAX_NATIONAL['+7'])
    return { dial: '+7', nationalDigits: national }
  }
  const digits = phoneTel.replace(/\D/g, '')
  if (!digits) {
    return { dial: '+375', nationalDigits: '' }
  }
  return parsePhoneDigitsAuto(digits)
}
