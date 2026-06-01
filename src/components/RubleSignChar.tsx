import {
  CURRENCY_SIGN_BOX_CLASS,
  CURRENCY_SIGN_GAP,
  RUB_SIGN_BOX_WIDTH_CLASS,
} from './currencySignLayout'

/** Текстовый ₽ — высота и выравнивание как у цифр в строке. */
export function RubleSignChar() {
  return (
    <>
      {CURRENCY_SIGN_GAP}
      <span
        className={`${CURRENCY_SIGN_BOX_CLASS} ${RUB_SIGN_BOX_WIDTH_CLASS}`.trim()}
        aria-hidden
      >
        <span className="text-[1em] leading-none">₽</span>
      </span>
    </>
  )
}
