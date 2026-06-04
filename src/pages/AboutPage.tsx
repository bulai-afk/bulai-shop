import {
  AcademicCapIcon,
  EnvelopeIcon,
  LifebuoyIcon,
  LinkIcon,
  MoonIcon,
  PhoneIcon,
  ShareIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useId, type ComponentType, type SVGProps } from 'react'
import { Link } from 'react-router-dom'
import type { PromoValueIconId } from '../admin/types/siteSettings'
import { BulaiLogo } from '../components/BulaiLogo'
import {
  useStorefrontPromoMaterials,
  useStorefrontSiteConfig,
} from '../context/StorefrontSettingsContext'
import { socialIconFromDraft } from '../utils/socialDraftIcons'

type ValueIcon = ComponentType<SVGProps<SVGSVGElement>>

const HERO_BLOB_CLIP =
  'polygon(63.1% 29.5%, 100% 17.1%, 76.6% 3%, 48.4% 0%, 44.6% 4.7%, 54.5% 25.3%, 59.8% 49%, 55.2% 57.8%, 44.4% 57.2%, 27.8% 47.9%, 35.1% 81.5%, 0% 97.7%, 39.2% 100%, 35.2% 81.4%, 97.2% 52.8%, 63.1% 29.5%)'

const VALUE_ICONS: Record<PromoValueIconId, ValueIcon> = {
  sparkles: SparklesIcon,
  share: ShareIcon,
  academic: AcademicCapIcon,
  lifebuoy: LifebuoyIcon,
  shield: ShieldCheckIcon,
  moon: MoonIcon,
}

const IMG_OVERLAY = 'pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10'

export function AboutPage() {
  const { aboutHero, aboutMission, aboutValues } = useStorefrontPromoMaterials()
  const site = useStorefrontSiteConfig()
  const contactEmail = site.contact.email.trim() || 'hello@example.com'
  const contactPhoneTel = site.contact.phoneTel.trim()
  const contactPhoneDisplay =
    site.contact.phoneDisplay.trim() || contactPhoneTel
  const contactSocialLinks = site.socialLinks.filter((l) => l.href.trim())
  const uid = useId().replace(/:/g, '')
  const heroPatternId = `about-hero-grid-${uid}`
  const logoPatternId = `about-logo-grid-${uid}`

  return (
    <main className="isolate overflow-hidden bg-gray-900 text-gray-100">
      {/* Hero */}
      <div className="relative isolate overflow-hidden pt-9 sm:pt-10">
        <svg
          aria-hidden
          className="absolute inset-0 -z-10 h-full w-full stroke-white/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
        >
          <defs>
            <pattern
              id={heroPatternId}
              width={200}
              height={200}
              x="50%"
              y={-1}
              patternUnits="userSpaceOnUse"
            >
              <path d="M.5 200V.5H200" fill="none" />
            </pattern>
          </defs>
          <svg x="50%" y={-1} className="overflow-visible">
            <path
              d="M-200 0h201v201h-201ZM600 0h201v201h-201ZM-400 600h201v201h-201ZM200 800h201v201h-201Z"
              strokeWidth={0}
              className="fill-indigo-500/15"
            />
          </svg>
          <rect width="100%" height="100%" fill={`url(#${heroPatternId})`} strokeWidth={0} />
        </svg>

        <div
          aria-hidden
          className="absolute top-0 right-0 -z-10 -translate-y-12 translate-x-12 transform-gpu blur-3xl sm:-translate-y-24 sm:translate-x-24 lg:-translate-y-32 lg:translate-x-32"
        >
          <div
            className="aspect-[1108/632] w-[40rem] bg-gradient-to-br from-indigo-500/35 via-purple-500/25 to-transparent opacity-90 sm:w-[56rem]"
            style={{ clipPath: HERO_BLOB_CLIP }}
          />
        </div>

        <div className="mx-auto flex max-w-7xl flex-col-reverse gap-y-10 px-6 pb-20 pt-10 sm:gap-y-14 sm:pb-28 sm:pt-12 lg:flex-row lg:items-center lg:gap-x-12 lg:gap-y-0 lg:px-8 lg:pt-14 lg:pb-24 xl:gap-x-16">
          <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl">
            <div className="text-center lg:mt-0 lg:text-left">
              <h1 className="text-pretty text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {aboutHero.title}
              </h1>
              <p className="mt-6 text-pretty text-base/7 text-gray-300 lg:mt-8">
                {aboutHero.description}
              </p>
            </div>
          </div>

          {/* Три колонки со смещением вверх/вниз (шахматная раскладка), фиксированные ширины — без w-auto */}
          <div className="w-full min-w-0 shrink-0 lg:max-w-xl lg:flex-1 xl:max-w-2xl">
            <div className="mx-auto flex max-w-md items-start justify-center gap-2.5 sm:max-w-lg sm:gap-4 lg:mx-0 lg:ml-auto lg:max-w-none lg:justify-end lg:gap-5">
              {/* Колонка 1 — чуть вверх */}
              <div className="flex w-[32%] max-w-[9rem] shrink-0 -translate-y-2 flex-col gap-2 sm:max-w-[10.5rem] sm:-translate-y-3 sm:gap-3 lg:w-44 lg:max-w-none lg:-translate-y-4 lg:gap-4 xl:w-52">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 shadow-xl">
                  <img alt="" src={aboutHero.imageB} className="absolute inset-0 size-full object-cover" />
                  <div className={IMG_OVERLAY} />
                </div>
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 shadow-xl">
                  <img alt="" src={aboutHero.imageC} className="absolute inset-0 size-full object-cover" />
                  <div className={IMG_OVERLAY} />
                </div>
              </div>
              {/* Колонка 2 — смещена вниз */}
              <div className="flex w-[32%] max-w-[9rem] shrink-0 translate-y-6 flex-col gap-2 sm:max-w-[10.5rem] sm:translate-y-10 sm:gap-3 lg:w-44 lg:max-w-none lg:translate-y-14 lg:gap-4 xl:w-52">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 shadow-xl">
                  <img alt="" src={aboutHero.imageD} className="absolute inset-0 size-full object-cover" />
                  <div className={IMG_OVERLAY} />
                </div>
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 shadow-xl">
                  <img alt="" src={aboutHero.imageE} className="absolute inset-0 size-full object-cover" />
                  <div className={IMG_OVERLAY} />
                </div>
              </div>
              {/* Колонка 3 — одно высокое фото, последняя, чуть вверх */}
              <div className="w-[32%] max-w-[9rem] shrink-0 -translate-y-1 sm:max-w-[10.5rem] sm:-translate-y-2 lg:w-44 lg:max-w-none lg:-translate-y-3 xl:w-52">
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-white/5 shadow-xl">
                  <img alt="" src={aboutHero.imageA} className="absolute inset-0 size-full object-cover" />
                  <div className={IMG_OVERLAY} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Горизонтальная линия между hero и блоком «Наша миссия» (на всю ширину) */}
      <div className="border-t border-white/10" aria-hidden />

      {/* Наша миссия: на мобиле сначала лого, затем заголовок и текст; на lg — текст слева, лого справа */}
      <section aria-labelledby="about-mission-heading">
        <div className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12 lg:px-8 lg:pt-14">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-10 sm:gap-y-12 lg:mx-0 lg:mt-2 lg:max-w-none lg:grid-cols-12 lg:gap-y-0">
            <div className="order-1 flex w-full min-w-0 flex-col items-center justify-center pb-2 lg:order-2 lg:col-span-5 lg:self-stretch lg:border-l lg:border-white/10 lg:px-10 lg:pb-0">
              <Link
                to="/"
                className="inline-flex shrink-0 text-violet-400 transition-opacity hover:opacity-90"
                aria-label="Bulai Shop — на главную"
              >
                <BulaiLogo className="mx-auto block h-14 w-auto max-w-[min(100%,340px)] sm:h-16 lg:h-[4.75rem] xl:h-20 xl:max-w-[min(100%,420px)]" />
              </Link>
            </div>
            <div className="order-2 text-center lg:order-1 lg:col-span-7 lg:text-left">
              <h2
                id="about-mission-heading"
                className="text-pretty text-4xl font-semibold tracking-tight text-white sm:text-5xl"
              >
                {aboutMission.heading}
              </h2>
              <p className="mt-6 text-base/7 text-gray-300 lg:mt-8">{aboutMission.paragraph1}</p>
              <p className="mt-6 text-base/7 text-gray-400">{aboutMission.paragraph2}</p>
            </div>
          </div>
        </div>

        <figure className="relative mt-16 w-full overflow-hidden sm:mt-20 lg:mt-24">
          <img
            alt=""
            src={aboutMission.bannerImage}
            className="aspect-[16/6] w-full object-cover object-center md:aspect-[21/9]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent" />
        </figure>
      </section>

      {/* Values */}
      <div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-24 lg:mt-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
          <h2 className="text-pretty text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {aboutValues.heading}
          </h2>
          <p className="mt-6 text-lg/8 text-gray-400">{aboutValues.subtitle}</p>
        </div>
        <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-14 text-base/7 sm:grid-cols-2 sm:gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {aboutValues.items.map(({ title, text, iconId }) => {
            const Icon = VALUE_ICONS[iconId] ?? SparklesIcon
            return (
              <div key={title} className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-400/25">
                  <Icon className="size-6 text-indigo-400" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="font-semibold text-white">{title}</dt>
                  <dd className="mt-2 text-gray-400">{text}</dd>
                </div>
              </div>
            )
          })}
        </dl>
      </div>

      {/* Контакты / вопросы */}
      <div className="relative isolate mx-auto mt-32 max-w-7xl px-6 pb-24 sm:mt-40 sm:pb-28 lg:mt-48 lg:px-8 lg:pb-32">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 to-gray-900"
        >
          <svg
            className="absolute inset-0 h-full w-full stroke-white/10 [mask-image:radial-gradient(100%_100%_at_center,white,transparent)]"
          >
            <defs>
              <pattern
                id={logoPatternId}
                width={200}
                height={200}
                x="50%"
                y="50%"
                patternUnits="userSpaceOnUse"
                patternTransform="translate(-100 0)"
              >
                <path d="M.5 200V.5H200" fill="none" />
              </pattern>
            </defs>
            <svg x="50%" y="50%" className="overflow-visible">
              <path
                d="M-300 0h201v201h-201ZM300 200h201v201h-201Z"
                strokeWidth={0}
                className="fill-indigo-500/10"
              />
            </svg>
            <rect width="100%" height="100%" fill={`url(#${logoPatternId})`} strokeWidth={0} />
          </svg>
        </div>

        <div className="relative overflow-hidden px-6 py-20 sm:px-10 sm:py-24 lg:px-16 lg:py-28">
          <div className="mx-auto w-full max-w-4xl text-center">
            <h2 className="text-pretty text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Напишите или позвоните — мы на связи
            </h2>
          </div>
          <div className="mx-auto mt-12 flex w-full max-w-4xl flex-col items-center gap-8 sm:mt-14 sm:gap-10">
            <div className="flex w-full flex-col items-center gap-10 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-14 sm:gap-y-8 lg:gap-x-20">
              <a
                href={`mailto:${contactEmail}`}
                aria-label={`Написать на ${contactEmail}`}
                className="group flex w-full min-w-0 max-w-full items-center justify-center gap-4 text-xl font-semibold text-white transition-colors hover:text-indigo-300 sm:w-auto sm:max-w-[min(100%,28rem)] sm:justify-start sm:text-2xl lg:text-3xl"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-400/25 transition group-hover:ring-indigo-400/40">
                  <EnvelopeIcon className="size-8 text-indigo-400" aria-hidden />
                </span>
                <span className="min-w-0 break-all text-center sm:break-normal sm:text-left">
                  {contactEmail}
                </span>
              </a>
              {contactPhoneTel ? (
                <a
                  href={`tel:${contactPhoneTel}`}
                  aria-label={`Позвонить: ${contactPhoneDisplay}`}
                  className="group flex w-full shrink-0 items-center justify-center gap-4 text-xl font-semibold text-white transition-colors hover:text-indigo-300 sm:w-auto sm:justify-start sm:text-2xl lg:text-3xl"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-400/25 transition group-hover:ring-indigo-400/40">
                    <PhoneIcon className="size-8 text-indigo-400" aria-hidden />
                  </span>
                  <span className="whitespace-nowrap tabular-nums">{contactPhoneDisplay}</span>
                </a>
              ) : null}
            </div>
            {contactSocialLinks.length > 0 ? (
              <ul
                className="flex w-full flex-wrap items-center justify-center gap-3"
                aria-label="Мессенджеры и соцсети"
              >
                {contactSocialLinks.map((item) => {
                  const href = item.href.trim()
                  const IconFn = socialIconFromDraft(item.id, item.name)
                  const external = href.startsWith('http')
                  return (
                    <li key={`${item.id}-${item.name}`}>
                      <a
                        href={href}
                        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        aria-label={item.name}
                        className="group inline-flex"
                      >
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-400/25 transition group-hover:ring-indigo-400/40">
                          {IconFn ? (
                            <IconFn className="size-8 text-indigo-400" aria-hidden />
                          ) : (
                            <LinkIcon className="size-8 text-indigo-400" aria-hidden />
                          )}
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
