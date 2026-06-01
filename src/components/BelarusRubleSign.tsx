import {
  BYN_SIGN_BOX_WIDTH_CLASS,
  BYN_SIGN_GLYPH_HEIGHT_CLASS,
  CURRENCY_SIGN_BOX_CLASS,
  CURRENCY_SIGN_GAP,
} from './currencySignLayout'

const SIGN_MASK = '/currency/belarus-ruble-sign.png'

/** Класс по умолчанию — та же высота и baseline, что у `RubleSignChar`. */
export const BYN_SIGN_CLASS = `${CURRENCY_SIGN_BOX_CLASS} ${BYN_SIGN_BOX_WIDTH_CLASS}`

/**
 * Знак белорусского рубля по эталону: «Б» + черта слева от ножки.
 */
export function BelarusRubleSign({
  className = BYN_SIGN_CLASS,
  title = 'белорусский рубль',
  decorative = false,
}: {
  className?: string
  title?: string
  decorative?: boolean
}) {
  return (
    <>
      {decorative ? null : CURRENCY_SIGN_GAP}
      <span
        role={decorative ? undefined : 'img'}
        aria-hidden={decorative ? true : undefined}
        aria-label={decorative ? undefined : title}
        className={className}
      >
        <span
          className={`block w-full max-w-full ${decorative ? 'size-full' : BYN_SIGN_GLYPH_HEIGHT_CLASS}`}
          style={{
            backgroundColor: 'currentColor',
            WebkitMaskImage: `url(${SIGN_MASK})`,
            maskImage: `url(${SIGN_MASK})`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
      </span>
    </>
  )
}
