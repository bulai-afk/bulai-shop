import { useId } from 'react'
import type { CurrencyCode } from '../context/CurrencyContext'

type FlagCircleProps = {
  code: CurrencyCode
  variant?: 'onDark' | 'onLight'
  size?: 'sm' | 'md' | 'lg'
}

/** Россия: триколор (viewBox 0 0 1 1). */
function FlagFillRu() {
  return (
    <>
      <rect width="1" height="0.333333" fill="#fff" />
      <rect y="0.333333" width="1" height="0.333333" fill="#0039a6" />
      <rect y="0.666666" width="1" height="0.333334" fill="#d52b1e" />
    </>
  )
}

/**
 * Беларусь: полоса узора у древка чуть шире (лучше видно в круге), справа — красное 2/3, зелёное 1/3.
 * Орнамент в локальных координатах 0…1 по ширине полосы, затем scale(ho, 1).
 */
function FlagFillBy() {
  /** Доля ширины флага под узор — больше, чем канонические 1/9, чтобы узор читался в круге */
  const ho = 0.17
  const g = '#4AA657'
  const r = '#C8313E'
  return (
    <>
      <rect x={ho} y="0" width={1 - ho} height={2 / 3} fill={r} />
      <rect x={ho} y={2 / 3} width={1 - ho} height={1 / 3} fill={g} />
      <rect x="0" y="0" width={ho} height="1" fill="#fff" />
      <rect x="0" y="0" width={ho * 0.055} height="1" fill={r} />
      <g transform={`scale(${ho}, 1)`}>
        {/* x ∈ [0,1]: два столбца крупных шестиугольников */}
        <path
          fill={r}
          d="
            M 0.06 0.05 L 0.22 0.18 L 0.06 0.31 L 0.38 0.31 L 0.54 0.18 L 0.38 0.05 Z
            M 0.06 0.36 L 0.22 0.49 L 0.06 0.62 L 0.38 0.62 L 0.54 0.49 L 0.38 0.36 Z
            M 0.06 0.67 L 0.22 0.80 L 0.06 0.93 L 0.38 0.93 L 0.54 0.80 L 0.38 0.67 Z
          "
        />
        <path
          fill={r}
          fillOpacity={0.88}
          d="
            M 0.56 0.05 L 0.72 0.18 L 0.56 0.31 L 0.88 0.31 L 0.96 0.18 L 0.88 0.05 Z
            M 0.56 0.36 L 0.72 0.49 L 0.56 0.62 L 0.88 0.62 L 0.96 0.49 L 0.88 0.36 Z
            M 0.56 0.67 L 0.72 0.80 L 0.56 0.93 L 0.88 0.93 L 0.96 0.80 L 0.88 0.67 Z
          "
        />
      </g>
    </>
  )
}

export function FlagCircle({ code, variant = 'onLight', size = 'sm' }: FlagCircleProps) {
  const uid = useId().replace(/:/g, '')
  const clipId = `flag-clip-${uid}`

  const shell =
    variant === 'onDark'
      ? 'shadow-sm ring-1 ring-white/40'
      : 'shadow-sm ring-1 ring-gray-200/90'

  const outer =
    size === 'lg'
      ? 'h-8 w-8 sm:h-9 sm:w-9'
      : size === 'md'
        ? 'h-6 w-6 sm:h-7 sm:w-7'
        : 'h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]'

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full ${shell} ${outer}`}
      aria-hidden
    >
      <svg viewBox="0 0 1 1" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <clipPath id={clipId}>
            <circle cx="0.5" cy="0.5" r="0.5" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>{code === 'RUB' ? <FlagFillRu /> : <FlagFillBy />}</g>
      </svg>
    </span>
  )
}
