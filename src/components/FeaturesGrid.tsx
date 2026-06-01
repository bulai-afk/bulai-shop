import { forwardRef, type ComponentType, type SVGProps } from 'react'
import {
  ArrowPathIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  GiftIcon,
  HeartIcon,
  LockClosedIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import type { HomeFeaturesForm, PromoFeatureIconId } from '../admin/types/siteSettings'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const FEATURE_ICONS: Record<PromoFeatureIconId, IconComponent> = {
  truck: TruckIcon,
  shield: ShieldCheckIcon,
  refresh: ArrowPathIcon,
  lock: LockClosedIcon,
  sparkles: SparklesIcon,
  gift: GiftIcon,
  clock: ClockIcon,
  chat: ChatBubbleLeftRightIcon,
  mapPin: MapPinIcon,
  star: StarIcon,
  heart: HeartIcon,
  bolt: BoltIcon,
}

const SECTION_TONE_CLASS: Record<'primary' | 'secondary', string> = {
  primary: 'bg-gray-900',
  secondary: 'border-t border-white/5 bg-gray-950',
}

type FeaturesGridProps = {
  block: HomeFeaturesForm
  /** id элемента h2 — для aria-labelledby и якорей */
  headingId: string
  /** 0–1: на главной привязка к прокрутке hero; по умолчанию 1 (без анимации). */
  revealProgress?: number
  /** Визуальное отличие второй секции на главной */
  tone?: 'primary' | 'secondary'
}

/** Секция с заголовком по центру и сеткой карточек (иконка + название + текст). */
export const FeaturesGrid = forwardRef<HTMLElement, FeaturesGridProps>(function FeaturesGrid(
  { block, headingId, revealProgress = 1, tone = 'primary' },
  ref,
) {
  const p = Math.min(1, Math.max(0, revealProgress))
  const lift = (1 - p) * 2.25
  const opacity = 0.35 + 0.65 * p
  const toneClass = SECTION_TONE_CLASS[tone]

  return (
    <section
      ref={ref}
      className={`scroll-mt-[6.5rem] py-14 sm:py-16 lg:py-20 ${toneClass}`}
      style={{
        transform: `translate3d(0, ${lift}rem, 0)`,
        opacity,
        willChange: p < 1 ? 'transform, opacity' : 'auto',
      }}
      aria-labelledby={headingId}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-base/7 font-semibold text-indigo-400">{block.eyebrow}</p>
          <h2
            id={headingId}
            className="mt-2 text-center text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl lg:text-balance"
          >
            {block.title}
          </h2>
          <p className="mt-4 text-lg/8 text-gray-300">{block.subtitle}</p>
        </div>
        <div className="mx-auto mt-10 w-full max-w-2xl sm:mt-12 lg:mt-14 lg:max-w-4xl">
          <dl className="mx-auto grid max-w-xl grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-1 sm:gap-x-8 sm:gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {block.items.map((feature) => {
              const Icon = FEATURE_ICONS[feature.iconId] ?? TruckIcon
              return (
                <div
                  key={feature.name}
                  className="flex min-w-0 flex-col items-center gap-3 text-center"
                >
                  <dt className="flex flex-col items-center gap-3 text-sm/6 font-semibold text-white sm:text-base/7">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500">
                      <Icon aria-hidden className="size-6 text-white" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="min-w-0 text-xs/5 text-pretty text-gray-400 sm:text-base/7">
                    {feature.description}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      </div>
    </section>
  )
})
