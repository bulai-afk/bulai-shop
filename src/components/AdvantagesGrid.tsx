import { forwardRef } from 'react'
import { PhotoIcon } from '@heroicons/react/24/outline'
import type { HomeAdvantagesForm } from '../admin/types/siteSettings'

const SECTION_TONE_CLASS: Record<'primary' | 'secondary', string> = {
  primary: 'bg-gray-900',
  secondary: 'border-t border-white/5 bg-gray-950',
}

type AdvantagesGridProps = {
  block: HomeAdvantagesForm
  headingId: string
  revealProgress?: number
  tone?: 'primary' | 'secondary'
}

/** Секция «наши преимущества»: карточки с фото (URL) вместо иконок. */
export const AdvantagesGrid = forwardRef<HTMLElement, AdvantagesGridProps>(function AdvantagesGrid(
  { block, headingId, revealProgress = 1, tone = 'secondary' },
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
          {block.eyebrow.trim() ? (
            <p className="text-base/7 font-semibold text-indigo-400">{block.eyebrow}</p>
          ) : null}
          <h2
            id={headingId}
            className={`text-center text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl lg:text-balance ${
              block.eyebrow.trim() ? 'mt-2' : ''
            }`}
          >
            {block.title}
          </h2>
          {block.subtitle.trim() ? (
            <p className="mt-4 text-lg/8 text-gray-300">{block.subtitle}</p>
          ) : null}
        </div>
        <div className="mx-auto mt-10 w-full max-w-2xl sm:mt-12 lg:mt-14 lg:max-w-4xl">
          <dl className="mx-auto grid max-w-xl grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-1 sm:gap-x-8 sm:gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {block.items.map((item) => {
              const src = item.imageUrl.trim()
              return (
                <div
                  key={item.name}
                  className="flex min-w-0 flex-col items-center gap-3 text-center"
                >
                  <dt className="flex flex-col items-center gap-3 text-sm/6 font-semibold text-white sm:text-base/7">
                    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 p-2 ring-1 ring-white/10 sm:size-24 sm:p-3">
                      {src ? (
                        <img
                          src={src}
                          alt=""
                          className="max-h-full max-w-full object-contain object-center"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div
                          className="flex size-full items-center justify-center text-white/25"
                          aria-hidden
                        >
                          <PhotoIcon className="size-8" />
                        </div>
                      )}
                    </div>
                    {item.name}
                  </dt>
                  <dd className="min-w-0 text-xs/5 text-pretty text-gray-400 sm:text-base/7">
                    {item.description}
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
