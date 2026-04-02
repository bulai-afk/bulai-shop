import {
  AcademicCapIcon,
  EnvelopeIcon,
  LifebuoyIcon,
  MoonIcon,
  PhoneIcon,
  ShareIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useId, type ComponentType, type SVGProps } from 'react'
import { Link } from 'react-router-dom'
import { BulaiLogo } from '../components/BulaiLogo'

type ValueIcon = ComponentType<SVGProps<SVGSVGElement>>

const HERO_BLOB_CLIP =
  'polygon(63.1% 29.5%, 100% 17.1%, 76.6% 3%, 48.4% 0%, 44.6% 4.7%, 54.5% 25.3%, 59.8% 49%, 55.2% 57.8%, 44.4% 57.2%, 27.8% 47.9%, 35.1% 81.5%, 0% 97.7%, 39.2% 100%, 35.2% 81.4%, 97.2% 52.8%, 63.1% 29.5%)'

const HERO_IMAGES = {
  a: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&h=528&q=80',
  b: 'https://images.unsplash.com/photo-1485217988980-11786ced9454?ixlib=rb-4.0.3&auto=format&fit=crop&h=528&q=80',
  c: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&auto=format&fit=crop&crop=focalpoint&fp-x=.4&w=396&h=528&q=80',
  d: 'https://images.unsplash.com/photo-1670272504528-790c24957dda?ixlib=rb-4.0.3&auto=format&fit=crop&crop=left&w=400&h=528&q=80',
  e: 'https://images.unsplash.com/photo-1670272505284-8faba1c31f7d?ixlib=rb-4.0.3&auto=format&fit=crop&h=528&q=80',
} as const

const BANNER_IMG =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=2832&q=80'

const CONTACT_EMAIL = 'hello@example.com'
const CONTACT_PHONE_DISPLAY = '+7 (000) 000-00-00'
const CONTACT_PHONE_TEL = '+70000000000'

/** Подставьте свои ссылки; сейчас заглушки как в футере */
const CONTACT_SOCIAL: { name: string; href: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  {
    name: 'Telegram',
    href: 'https://t.me/',
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 1.667-.715 2.01-1.05 2.242-1.05z" />
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    href: 'https://wa.me/70000000000',
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
  },
  {
    name: 'ВКонтакте',
    href: 'https://vk.com/',
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
        <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.491 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.644v4.675c0 .373.17.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.15-3.574 2.15-3.574.17-.254.322-.373.78-.373h1.744c.525 0 .644.27.525.644-.254 1.186-2.607 3.844-2.607 3.844-.203.254-.27.373 0 .644.203.254.88 1.033 1.338 1.744.372.593.744 1.033.744 1.338 0 .254-.136.491-.593.491z" />
      </svg>
    ),
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/',
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
]

const VALUES: { title: string; text: string; Icon: ValueIcon }[] = [
  {
    title: 'Быть лучшими в своём деле',
    text: 'Качество пошива, честные материалы и внимание к деталям — то, за что нас выбирают. Мы не идём на компромиссы там, где это заметно в носке.',
    Icon: SparklesIcon,
  },
  {
    title: 'Делиться опытом',
    text: 'Рассказываем о составах, посадке и уходе за вещами — чтобы вы покупали осознанно и носили дольше.',
    Icon: ShareIcon,
  },
  {
    title: 'Постоянно учиться',
    text: 'Следим за трендами и обратной связью клиентов, обновляем каталог и улучшаем сервис.',
    Icon: AcademicCapIcon,
  },
  {
    title: 'Поддерживать',
    text: 'Помогаем с размером, доставкой и возвратом. Команда поддержки на связи, если что-то пошло не так.',
    Icon: LifebuoyIcon,
  },
  {
    title: 'Брать ответственность',
    text: 'Признаём ошибки и исправляем их. Прозрачные условия заказа и оплаты — без сюрпризов.',
    Icon: ShieldCheckIcon,
  },
  {
    title: 'Ценить отдых',
    text: 'Сбалансированный ритм команды — залог вдумчивых решений и тёплого общения с вами.',
    Icon: MoonIcon,
  },
]

const IMG_OVERLAY = 'pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10'

export function AboutPage() {
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

        <div className="mx-auto max-w-7xl px-6 pb-20 pt-10 sm:pb-28 sm:pt-12 lg:flex lg:items-center lg:gap-x-12 lg:px-8 lg:pt-14 lg:pb-24 xl:gap-x-16">
          <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl">
            <div className="mt-5 sm:mt-12 lg:mt-0">
              <h1 className="text-pretty text-5xl font-semibold tracking-tight text-white sm:text-7xl">
                Мы делаем ваш образ удобным
              </h1>
              <p className="mt-8 text-pretty text-lg font-medium text-gray-400 sm:text-xl/8">
                BULAI — это удобная и стильная одежда из качественных материалов: лён, хлопок, вискоза и другие ткани,
                подобранные с заботой об экологии и комфорте к телу. Комфортный крой и лаконичный дизайн — чтобы образ
                собирался быстро и смотрелся дорого без лишних усилий. Честные описания и аккуратный пошив — чтобы вы
                носили вещи долго и с удовольствием, а не «на один сезон».
              </p>
            </div>
          </div>

          {/* Три колонки со смещением вверх/вниз (шахматная раскладка), фиксированные ширины — без w-auto */}
          <div className="mt-10 w-full min-w-0 shrink-0 sm:mt-14 lg:mt-0 lg:max-w-xl lg:flex-1 xl:max-w-2xl">
            <div className="mx-auto flex max-w-md items-start justify-center gap-2.5 sm:max-w-lg sm:gap-4 lg:mx-0 lg:ml-auto lg:max-w-none lg:justify-end lg:gap-5">
              {/* Колонка 1 — чуть вверх */}
              <div className="flex w-[32%] max-w-[9rem] shrink-0 -translate-y-2 flex-col gap-2 sm:max-w-[10.5rem] sm:-translate-y-3 sm:gap-3 lg:w-44 lg:max-w-none lg:-translate-y-4 lg:gap-4 xl:w-52">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 shadow-xl">
                  <img alt="" src={HERO_IMAGES.b} className="absolute inset-0 size-full object-cover" />
                  <div className={IMG_OVERLAY} />
                </div>
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 shadow-xl">
                  <img alt="" src={HERO_IMAGES.c} className="absolute inset-0 size-full object-cover" />
                  <div className={IMG_OVERLAY} />
                </div>
              </div>
              {/* Колонка 2 — смещена вниз */}
              <div className="flex w-[32%] max-w-[9rem] shrink-0 translate-y-6 flex-col gap-2 sm:max-w-[10.5rem] sm:translate-y-10 sm:gap-3 lg:w-44 lg:max-w-none lg:translate-y-14 lg:gap-4 xl:w-52">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 shadow-xl">
                  <img alt="" src={HERO_IMAGES.d} className="absolute inset-0 size-full object-cover" />
                  <div className={IMG_OVERLAY} />
                </div>
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 shadow-xl">
                  <img alt="" src={HERO_IMAGES.e} className="absolute inset-0 size-full object-cover" />
                  <div className={IMG_OVERLAY} />
                </div>
              </div>
              {/* Колонка 3 — одно высокое фото, последняя, чуть вверх */}
              <div className="w-[32%] max-w-[9rem] shrink-0 -translate-y-1 sm:max-w-[10.5rem] sm:-translate-y-2 lg:w-44 lg:max-w-none lg:-translate-y-3 xl:w-52">
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-white/5 shadow-xl">
                  <img alt="" src={HERO_IMAGES.a} className="absolute inset-0 size-full object-cover" />
                  <div className={IMG_OVERLAY} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Горизонтальная линия между hero и блоком «Наша миссия» (на всю ширину) */}
      <div className="border-t border-white/10" aria-hidden />

      {/* Наша миссия: текст + лого + полноширинное фото */}
      <section aria-labelledby="about-mission-heading">
        <div className="mx-auto max-w-7xl px-6 pt-10 sm:pt-12 lg:px-8 lg:pt-14">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2
              id="about-mission-heading"
              className="text-pretty text-4xl font-semibold tracking-tight text-white sm:text-5xl"
            >
              Наша миссия
            </h2>
          </div>
          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:mt-10 lg:mx-0 lg:max-w-none lg:grid-cols-12 lg:mt-12">
            <div className="lg:col-span-7">
              <p className="text-base/7 text-gray-300">
                Наша миссия проста:{' '}
                <span className="text-white">
                  давать вам качественный, экологически чистый товар по доступной цене
                </span>
                . Мы считаем, что натуральные ткани, аккуратный пошив и честный состав не должны быть
                роскошью — их можно носить каждый день без переплаты за лишний шум вокруг бренда.
              </p>
              <p className="mt-6 text-base/7 text-gray-400">
                Отбираем поставщиков и модели с упором на лён, хлопок и безопасные для кожи материалы,
                проверяем соотношение цены и качества и держим ассортимент понятным: вы видите, за что платите,
                и получаете вещь, которой не стыдно пользоваться долго.
              </p>
            </div>
            <div className="flex justify-center border-t border-white/10 pt-10 sm:pt-16 lg:col-span-5 lg:flex lg:items-center lg:justify-start lg:self-stretch lg:border-t-0 lg:border-l lg:border-white/10 lg:pl-10 lg:pt-0">
              <Link
                to="/"
                className="inline-flex shrink-0 text-violet-400 transition-opacity hover:opacity-90"
                aria-label="Bulai Shop — на главную"
              >
                <BulaiLogo className="h-14 w-auto max-w-[min(100%,340px)] sm:h-16 lg:h-[4.75rem] xl:h-20 xl:max-w-[min(100%,420px)]" />
              </Link>
            </div>
          </div>
        </div>

        <figure className="relative mt-16 w-full overflow-hidden sm:mt-20 lg:mt-24">
          <img
            alt=""
            src={BANNER_IMG}
            className="aspect-[16/6] w-full object-cover object-center md:aspect-[21/9]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent" />
        </figure>
      </section>

      {/* Values */}
      <div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-24 lg:mt-32 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-pretty text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Наши ценности
          </h2>
          <p className="mt-6 text-lg/8 text-gray-400">
            Принципы, на которых держится команда и сервис — от склада до поддержки.
          </p>
        </div>
        <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-14 text-base/7 sm:grid-cols-2 sm:gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {VALUES.map(({ title, text, Icon }) => (
            <div key={title}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-400/25">
                <Icon className="size-6 text-indigo-400" aria-hidden />
              </div>
              <dt className="mt-4 font-semibold text-white">{title}</dt>
              <dd className="mt-2 text-gray-400">{text}</dd>
            </div>
          ))}
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
          <h2 className="mx-auto max-w-4xl text-pretty text-center text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Пишите на почту или звоните — мы на связи и с радостью поможем!
          </h2>
          <div className="mx-auto mt-12 flex w-full max-w-4xl flex-col items-center gap-8 sm:mt-14 sm:gap-10">
            <div className="flex w-full flex-col items-center gap-10 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-14 sm:gap-y-8 lg:gap-x-20">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                aria-label={`Написать на ${CONTACT_EMAIL}`}
                className="group flex min-w-0 max-w-full items-center gap-4 text-xl font-semibold text-white transition-colors hover:text-indigo-300 sm:max-w-[min(100%,28rem)] sm:text-2xl lg:text-3xl"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-400/25 transition group-hover:ring-indigo-400/40">
                  <EnvelopeIcon className="size-8 text-indigo-400" aria-hidden />
                </span>
                <span className="min-w-0 break-all sm:break-normal">{CONTACT_EMAIL}</span>
              </a>
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                aria-label={`Позвонить: ${CONTACT_PHONE_DISPLAY}`}
                className="group flex shrink-0 items-center gap-4 text-xl font-semibold text-white transition-colors hover:text-indigo-300 sm:text-2xl lg:text-3xl"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-400/25 transition group-hover:ring-indigo-400/40">
                  <PhoneIcon className="size-8 text-indigo-400" aria-hidden />
                </span>
                <span className="whitespace-nowrap tabular-nums">{CONTACT_PHONE_DISPLAY}</span>
              </a>
            </div>
            <ul
              className="flex w-full flex-wrap justify-center gap-3"
              aria-label="Мессенджеры и соцсети"
            >
              {CONTACT_SOCIAL.map(({ name, href, Icon }) => (
                <li key={name}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    className="group inline-flex"
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-400/25 transition group-hover:ring-indigo-400/40">
                      <Icon className="size-8 text-indigo-400" aria-hidden />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
