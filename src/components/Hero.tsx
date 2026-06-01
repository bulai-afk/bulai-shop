import { Link } from 'react-router-dom'
import type { HomeHeroSlideForm } from '../admin/types/siteSettings'
import { useStorefrontPromoMaterials } from '../context/StorefrontSettingsContext'

export type HomeHeroContent = HomeHeroSlideForm

const DEFAULT_HERO_LOGO =
  'https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500'
const DEFAULT_HERO_IMAGE_SPLIT =
  'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2102&q=80'
const DEFAULT_HERO_IMAGE_ANGLED =
  'https://images.unsplash.com/photo-1483389127117-b6a2102724ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=1587&q=80'

function resolveLogoUrl(hero: HomeHeroContent) {
  return hero.logoUrl.trim() || DEFAULT_HERO_LOGO
}

function resolveImageUrl(hero: HomeHeroContent, kind: 'split' | 'angled') {
  if (hero.imageUrl.trim()) return hero.imageUrl.trim()
  return kind === 'split' ? DEFAULT_HERO_IMAGE_SPLIT : DEFAULT_HERO_IMAGE_ANGLED
}

function heroSectionShell(isFrame: boolean, isPage: boolean) {
  if (isFrame) {
    return 'flex min-h-[640px] flex-col bg-gray-900 sm:min-h-[720px]'
  }
  return `flex min-h-[calc(100dvh-6.5rem)] flex-col bg-gray-900 sm:min-h-[calc(100dvh-10rem)]${isPage ? ' flex-1' : ''}`
}

function HeroBadgePill({
  hero,
  className = '',
  centered = false,
}: {
  hero: HomeHeroContent
  className?: string
  centered?: boolean
}) {
  const badgeText = hero.badgeText.trim()
  const linkLabel = hero.badgeLinkLabel.trim()
  const linkHref = hero.badgeLinkHref.trim()
  if (!badgeText && !linkLabel) return null

  return (
    <div
      className={`relative max-w-lg rounded-full px-4 py-1 text-sm/6 text-gray-400 ring-1 ring-white/10 transition hover:ring-white/20 sm:inline-flex ${centered ? 'mx-auto justify-center' : ''} ${className}`}
    >
      {badgeText ? (
        <>
          {badgeText}
          {linkLabel ? ' ' : null}
        </>
      ) : null}
      {linkLabel ? (
        linkHref ? (
          <Link to={linkHref} className="font-semibold text-indigo-400">
            <span aria-hidden className="absolute inset-0" />
            {linkLabel} <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span className="font-semibold text-indigo-400">
            {linkLabel} <span aria-hidden="true">→</span>
          </span>
        )
      ) : null}
    </div>
  )
}

/** Центрированный блок: пилюля, заголовок, подзаголовок, CTA (как в градиентном hero). */
function HeroCenterStack({
  hero,
  headingId,
  TitleTag,
}: {
  hero: HomeHeroContent
  headingId: string
  TitleTag: 'h1' | 'h2'
}) {
  return (
    <div className="mx-auto w-full max-w-2xl py-8 sm:py-10">
      <div className="mb-8 hidden justify-center sm:flex">
        <HeroBadgePill hero={hero} />
      </div>
      <div className="text-center">
        <TitleTag
          id={headingId}
          className="text-center text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl md:text-6xl lg:text-7xl"
        >
          <span className="block">{hero.title}</span>
        </TitleTag>
        <p className="mt-8 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">{hero.subtitle}</p>
        <HeroCtaRow hero={hero} justify="center" secondaryStyle="button" />
      </div>
    </div>
  )
}

function HeroCtaRow({
  hero,
  justify = 'center',
  secondaryStyle = 'button',
}: {
  hero: HomeHeroContent
  justify?: 'start' | 'center'
  /** `link` — как в split/angled (текст + стрелка); `button` — как в градиентном hero. */
  secondaryStyle?: 'button' | 'link'
}) {
  const primaryLabel = hero.primaryCtaLabel.trim()
  const primaryHref = hero.primaryCtaHref.trim()
  const secondaryLabel = hero.secondaryCtaLabel.trim()
  const secondaryHref = hero.secondaryCtaHref.trim()
  if (!primaryLabel && !secondaryLabel) return null

  const row =
    justify === 'start'
      ? 'mt-10 flex flex-wrap items-center gap-x-6 gap-y-4'
      : 'mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4'

  const primaryClass =
    'rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500'
  const secondaryLinkClass =
    secondaryStyle === 'link'
      ? 'text-sm/6 font-semibold text-white hover:text-indigo-300'
      : 'rounded-md border border-white/20 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10'

  return (
    <div className={row}>
      {primaryLabel ? (
        primaryHref ? (
          <Link to={primaryHref} className={primaryClass}>
            {primaryLabel}
          </Link>
        ) : (
          <span className={primaryClass}>{primaryLabel}</span>
        )
      ) : null}
      {secondaryLabel ? (
        secondaryHref ? (
          <Link to={secondaryHref} className={secondaryLinkClass}>
            {secondaryLabel}
            {secondaryStyle === 'link' ? <span aria-hidden="true"> →</span> : null}
          </Link>
        ) : (
          <span className={secondaryLinkClass}>
            {secondaryLabel}
            {secondaryStyle === 'link' ? <span aria-hidden="true"> →</span> : null}
          </span>
        )
      ) : null}
    </div>
  )
}

function HomeHeroGradient({
  hero,
  sectionClass,
  headingId,
  TitleTag,
}: {
  hero: HomeHeroContent
  sectionClass: string
  headingId: string
  TitleTag: 'h1' | 'h2'
}) {
  return (
    <section className={sectionClass} aria-labelledby={headingId}>
      <div className="relative isolate flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-16 pt-12 sm:pb-20 sm:pt-16 lg:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>

        <HeroCenterStack hero={hero} headingId={headingId} TitleTag={TitleTag} />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 top-1/2 -z-10 transform-gpu overflow-hidden blur-3xl"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          />
        </div>
      </div>
    </section>
  )
}

/** Как градиентный hero по сетке, но фон — фото (`imageUrl`) + затемнение вместо блобов. */
function HomeHeroPhotoBackdrop({
  hero,
  sectionClass,
  headingId,
  TitleTag,
}: {
  hero: HomeHeroContent
  sectionClass: string
  headingId: string
  TitleTag: 'h1' | 'h2'
}) {
  const img = resolveImageUrl(hero, 'angled')
  return (
    <section className={sectionClass} aria-labelledby={headingId}>
      <div className="relative isolate flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-16 pt-12 sm:pb-20 sm:pt-16 lg:px-8">
        <img
          src={img}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 size-full object-cover object-center"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-gray-950/88 via-gray-950/72 to-gray-950/88"
        />
        <HeroCenterStack hero={hero} headingId={headingId} TitleTag={TitleTag} />
      </div>
    </section>
  )
}

/** Split: логотип, пилюля, заголовок слева; фото справа (как в Tailwind Plus). */
function HomeHeroSplitLogo({
  hero,
  sectionClass,
  headingId,
  TitleTag,
}: {
  hero: HomeHeroContent
  sectionClass: string
  headingId: string
  TitleTag: 'h1' | 'h2'
}) {
  const img = resolveImageUrl(hero, 'split')
  const logo = resolveLogoUrl(hero)
  return (
    <section className={sectionClass} aria-labelledby={headingId}>
      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20">
          <Link to="/" className="mb-8 inline-block w-fit">
            <img src={logo} alt="" className="h-10 w-auto sm:h-11" />
          </Link>
          <div className="mb-8">
            <HeroBadgePill hero={hero} />
          </div>
          <TitleTag
            id={headingId}
            className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {hero.title}
          </TitleTag>
          <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">{hero.subtitle}</p>
          <HeroCtaRow hero={hero} justify="start" secondaryStyle="link" />
        </div>
        <div className="relative min-h-64 lg:min-h-0">
          <img src={img} alt="" className="absolute inset-0 size-full object-cover" />
        </div>
      </div>
    </section>
  )
}

/**
 * Скос + фото справа: скос задаётся на фото — левая граница кадра от нижнего левого угла фото
 * к верхней части (крупнее, чем узкий SVG между колонками).
 */
function HomeHeroAngledRight({
  hero,
  sectionClass,
  headingId,
  TitleTag,
}: {
  hero: HomeHeroContent
  sectionClass: string
  headingId: string
  TitleTag: 'h1' | 'h2'
}) {
  const img = resolveImageUrl(hero, 'angled')
  /** Меньший X — меньше вырезаемый клин слева, больше видно верхней кромки фото. */
  const rightPhotoClip = 'polygon(0% 100%, 100% 100%, 100% 0%, 32% 0%)'

  const content = (
    <div className="relative z-10 flex flex-col justify-center bg-gray-950 px-6 py-16 sm:px-10 lg:py-24 xl:px-16 lg:pr-10">
      <div className="mb-8 max-w-lg">
        <HeroBadgePill hero={hero} />
      </div>
      <TitleTag
        id={headingId}
        className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl md:text-6xl"
      >
        {hero.title}
      </TitleTag>
      <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">{hero.subtitle}</p>
      <HeroCtaRow hero={hero} justify="start" secondaryStyle="link" />
    </div>
  )

  const imageBlock = (
    <div className="relative min-h-72 overflow-hidden bg-gray-950 lg:min-h-0">
      <img
        src={img}
        alt=""
        className="absolute inset-0 size-full object-cover object-right-bottom lg:object-[85%_100%]"
        style={{ clipPath: rightPhotoClip }}
      />
    </div>
  )

  return (
    <section className={sectionClass} aria-labelledby={headingId}>
      <div className="relative isolate flex min-h-0 flex-1 overflow-hidden bg-gray-950">
        <div className="grid w-full flex-1 lg:grid-cols-2 lg:items-stretch">
          {content}
          {imageBlock}
        </div>
      </div>
    </section>
  )
}

type HomeHeroPreviewProps = {
  hero: HomeHeroContent
  layout?: 'page' | 'follow' | 'frame'
  headingId?: string
  headingLevel?: 'h1' | 'h2'
}

/** Разметка hero главной по данным промо (витрина и превью в админке). */
export function HomeHeroPreview({
  hero,
  layout = 'page',
  headingId = 'home-hero-title',
  headingLevel = 'h1',
}: HomeHeroPreviewProps) {
  const isFrame = layout === 'frame'
  const isPage = layout === 'page'
  const sectionClass = heroSectionShell(isFrame, isPage)
  const TitleTag = headingLevel === 'h2' ? 'h2' : 'h1'
  const tpl = hero.template

  if (tpl === 'splitLogo') {
    return (
      <HomeHeroSplitLogo hero={hero} sectionClass={sectionClass} headingId={headingId} TitleTag={TitleTag} />
    )
  }
  if (tpl === 'angledRight') {
    return (
      <HomeHeroAngledRight hero={hero} sectionClass={sectionClass} headingId={headingId} TitleTag={TitleTag} />
    )
  }
  if (tpl === 'angledLeft') {
    return (
      <HomeHeroPhotoBackdrop hero={hero} sectionClass={sectionClass} headingId={headingId} TitleTag={TitleTag} />
    )
  }

  return (
    <HomeHeroGradient hero={hero} sectionClass={sectionClass} headingId={headingId} TitleTag={TitleTag} />
  )
}

/** Один или несколько hero-блоков главной. */
export function Hero() {
  const { homeHeroes } = useStorefrontPromoMaterials()
  return (
    <>
      {homeHeroes.map((hero, index) => (
        <HomeHeroPreview
          key={index}
          hero={hero}
          layout={index === 0 ? 'page' : 'follow'}
          headingId={`home-hero-title-${index}`}
          headingLevel={index === 0 ? 'h1' : 'h2'}
        />
      ))}
    </>
  )
}
