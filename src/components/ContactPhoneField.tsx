import { useLayoutEffect, useRef } from 'react'
import { PHONE_INPUT_MAX_DIGITS, parsePhoneTel, phoneDigitsFromTel } from '../admin/lib/phoneCountry'
import {
  checkoutPhoneFieldError,
  composePhonePreviewTel,
  contactPhoneError,
  countDigitsLeftOfIndex,
  indexAfterNthDigit,
  phoneCaretDigitCountForState,
  phoneCaretDigitIndexAfterDeletion,
  phoneInputDisplayedValue,
  phoneRegionLabel,
} from '../lib/contactPhoneInputDisplay'

const VARIANT_CLASS = {
  admin: {
    shell:
      'mt-1 flex min-w-0 items-center overflow-hidden rounded-md border border-white/10 bg-white/5 shadow-sm shadow-black/10 transition focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50',
    shellInvalid: 'border-red-500/40 focus-within:border-red-500/50 focus-within:ring-red-500/40',
    input:
      'min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none ring-0 focus:ring-0',
    region:
      'pointer-events-none shrink-0 select-none py-2 pr-3 pl-1 text-right text-sm tabular-nums leading-normal text-gray-500',
    error: 'mt-1 text-xs text-red-400',
    hint: 'mt-2 text-xs text-gray-500',
    hintMono: 'font-mono text-[11px] text-gray-400 sm:text-xs',
  },
  storefront: {
    shell:
      'mt-1 flex min-w-0 items-center overflow-hidden rounded-md border-0 bg-white/5 ring-1 ring-inset ring-white/10 transition focus-within:ring-2 focus-within:ring-indigo-500',
    shellInvalid: 'ring-red-500/50 focus-within:ring-red-500/50',
    input:
      'min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none ring-0 focus:ring-0',
    region:
      'pointer-events-none shrink-0 select-none py-2.5 pr-3 pl-1 text-right text-sm tabular-nums leading-normal text-gray-500',
    error: 'mt-1 text-xs text-red-400',
    hint: 'mt-2 text-xs text-gray-500',
    hintMono: 'font-mono text-[11px] text-gray-400 sm:text-xs',
  },
} as const

export type ContactPhoneFieldProps = {
  id: string
  /** Как `contact.phoneTel` в настройках: строка цифр (без маски). */
  valueTel: string
  onDigitsChange: (digits: string) => void
  variant?: keyof typeof VARIANT_CLASS
  showDialPreview?: boolean
  /** Атрибут `name` у input (автозаполнение формы). */
  name?: string
  /** Чекаут: после попытки отправить шаг — подсветка пустого/неполного номера. */
  checkoutSubmitAttempted?: boolean
}

export function ContactPhoneField({
  id,
  valueTel,
  onDigitsChange,
  variant = 'storefront',
  showDialPreview = false,
  name,
  checkoutSubmitAttempted = false,
}: ContactPhoneFieldProps) {
  const vc = VARIANT_CLASS[variant]
  const inputRef = useRef<HTMLInputElement>(null)
  const caretDigitsRef = useRef<number | null>(null)

  const phoneDialParsed = parsePhoneTel(valueTel)
  const phoneDigitsOnly = phoneDigitsFromTel(valueTel)
  const phoneDisplayValue = phoneInputDisplayedValue(valueTel, phoneDialParsed, phoneDigitsOnly)
  const phonePreviewTel = composePhonePreviewTel(phoneDialParsed, phoneDigitsOnly)
  const showPhoneTelPreview =
    Boolean(phoneDialParsed.nationalDigits) ||
    (phoneDialParsed.dial === '+375' && phoneDigitsOnly.startsWith('80')) ||
    (phoneDialParsed.dial === '+7' && phoneDigitsOnly.startsWith('8') && phoneDigitsOnly.length >= 2) ||
    (phoneDialParsed.dial === '+7' &&
      !phoneDialParsed.nationalDigits &&
      phoneDigitsOnly === '7')
  const phoneFieldError = checkoutSubmitAttempted
    ? checkoutPhoneFieldError(valueTel, true)
    : contactPhoneError(phoneDialParsed)
  const phoneRegionText = phoneRegionLabel(phoneDialParsed, phoneDigitsOnly)

  useLayoutEffect(() => {
    const n = caretDigitsRef.current
    const el = inputRef.current
    if (n === null || !el || document.activeElement !== el) return
    caretDigitsRef.current = null
    const digitsOnly = phoneDigitsFromTel(valueTel)
    const parsed = parsePhoneTel(valueTel)
    const display = phoneInputDisplayedValue(valueTel, parsed, digitsOnly)
    const pos = Math.min(indexAfterNthDigit(display, n), display.length)
    el.setSelectionRange(pos, pos)
  }, [valueTel])

  return (
    <div className="w-full min-w-0">
      <div className={`${vc.shell}${phoneFieldError ? ` ${vc.shellInvalid}` : ''}`}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="tel"
          autoComplete="tel"
          value={phoneDisplayValue}
          placeholder="Введите номер"
          onChange={(e) => {
            const el = e.target
            const raw = el.value
            const caret = el.selectionStart ?? raw.length
            const prevDigits = phoneDigitsFromTel(valueTel)
            let digits = raw.replace(/\D/g, '').slice(0, PHONE_INPUT_MAX_DIGITS)
            if (prevDigits === '80' && digits === '37') {
              digits = '8'
            }
            if (prevDigits === '89' && digits === '7') {
              digits = '8'
            }
            let n: number
            if (digits.length < prevDigits.length) {
              n = phoneCaretDigitIndexAfterDeletion(prevDigits, digits)
              n = Math.max(0, Math.min(n, digits.length))
              n = phoneCaretDigitCountForState(n, digits)
            } else {
              const digitsBefore = countDigitsLeftOfIndex(raw, caret)
              n = phoneCaretDigitCountForState(digitsBefore, digits)
            }
            caretDigitsRef.current = n
            onDigitsChange(digits)
          }}
          aria-invalid={phoneFieldError ? true : undefined}
          aria-describedby={
            [phoneFieldError ? `${id}-error` : null, phoneRegionText ? `${id}-region` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={vc.input}
        />
        <span
          id={`${id}-region`}
          className={vc.region}
          role={phoneRegionText ? 'status' : undefined}
          aria-live={phoneRegionText ? 'polite' : undefined}
          aria-hidden={phoneRegionText ? undefined : true}
        >
          {phoneRegionText}
        </span>
      </div>
      {phoneFieldError ? (
        <p id={`${id}-error`} className={vc.error} role="alert">
          {phoneFieldError}
        </p>
      ) : null}
      {showDialPreview ? (
        <p className={vc.hint}>
          Ссылка звонка:{' '}
          <span className={vc.hintMono}>
            {showPhoneTelPreview ? `tel:${phonePreviewTel}` : '—'}
          </span>
        </p>
      ) : null}
    </div>
  )
}
