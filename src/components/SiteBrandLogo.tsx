import { BulaiLogo } from './BulaiLogo'

type SiteBrandLogoProps = {
  logoUrl: string
  logoColor: string
  layout?: 'navbar' | 'default'
  /** Размеры для растрового лого и для Bulai; у варианта с mask базовые размеры свои, этот класс их дополняет/переопределяет. */
  className?: string
}

/** Дефолт как в навбаре для `<img>` и Bulai, если `className` не передан. */
const DEFAULT_LOGO_VISUAL_CLASS = 'h-8 w-auto max-w-[min(100%,200px)] sm:h-8'

/**
 * Логотип из черновика: свой файл и/или цвет. Цвет на картинке с альфой — через CSS mask + заливка.
 */
export function SiteBrandLogo({
  logoUrl,
  logoColor,
  layout = 'navbar',
  className = '',
}: SiteBrandLogoProps) {
  const url = logoUrl.trim()
  const tint = logoColor.trim()
  const maskSrc = tint && url ? `url(${JSON.stringify(url)})` : ''

  const visualClass =
    className != null && className.trim() !== ''
      ? className.trim()
      : DEFAULT_LOGO_VISUAL_CLASS

  if (!url) {
    return (
      <span
        className={tint ? 'inline-flex' : 'inline-flex text-violet-400'}
        style={tint ? { color: tint } : undefined}
      >
        <BulaiLogo layout={layout} className={visualClass} />
      </span>
    )
  }

  if (tint) {
    /**
     * База для шапки: высота 2rem, ширина из пропорций viewBox (как у Bulai), max 200px / 100% контейнера.
     * `className` после базы — для превью в админке (`!h-auto`, `w-full`, `aspect-ratio` и т.д.).
     */
    const maskBaseClass =
      'box-border block h-8 max-h-8 w-[calc(2rem*601.85/82.3)] max-w-[min(100%,200px)] shrink-0 sm:h-8'

    return (
      <span
        className={`${maskBaseClass} ${className}`.trim()}
        style={{
          backgroundColor: tint,
          WebkitMaskImage: maskSrc,
          maskImage: maskSrc,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
        aria-hidden
      />
    )
  }

  return <img src={url} alt="" className={visualClass} />
}
