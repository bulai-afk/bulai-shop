import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowUpTrayIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  GiftIcon,
  HeartIcon,
  LockClosedIcon,
  MapPinIcon,
  PhotoIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TrashIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HomeHeroPreview } from '../../components/Hero'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import { createDefaultHomeHeroSlide } from '../data/siteSettingsDefaults'
import { AdminPromoDbSyncBanner } from '../components/AdminPromoDbSyncBanner'
import { useAdminPromoMaterialsForm } from '../hooks/useAdminPromoMaterialsForm'
import type {
  HomeAdvantagesForm,
  HomeFeaturesForm,
  HomeHeroSlideForm,
  HomeHeroTemplateId,
  PromoFeatureIconId,
} from '../types/siteSettings'

const HERO_TEMPLATE_OPTIONS: { id: HomeHeroTemplateId; label: string; hint: string }[] = [
  { id: 'gradient', label: 'Градиент', hint: 'Фон с блобами, текст по центру' },
  { id: 'splitLogo', label: 'Split + логотип', hint: 'Колонка текста и лого, фото справа' },
  { id: 'angledRight', label: 'Скос, фото справа', hint: 'Угол SVG, контент слева' },
  { id: 'angledLeft', label: 'Фото фоном', hint: 'Как градиент, по центру; вместо блобов — фото и затемнение' },
]

function heroTemplateShortLabel(id: HomeHeroTemplateId): string {
  return HERO_TEMPLATE_OPTIONS.find((o) => o.id === id)?.label ?? id
}

const inputClass =
  'mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'
const labelClass = 'block text-sm font-medium text-gray-300'
const hintClass = 'text-xs text-gray-500'

const FEATURE_ICON_OPTIONS: {
  id: PromoFeatureIconId
  label: string
  Icon: typeof TruckIcon
}[] = [
  { id: 'truck', label: 'Доставка', Icon: TruckIcon },
  { id: 'shield', label: 'Качество', Icon: ShieldCheckIcon },
  { id: 'refresh', label: 'Обмен', Icon: ArrowPathIcon },
  { id: 'lock', label: 'Оплата', Icon: LockClosedIcon },
  { id: 'sparkles', label: 'Акцент', Icon: SparklesIcon },
  { id: 'gift', label: 'Подарок', Icon: GiftIcon },
  { id: 'clock', label: 'Сроки', Icon: ClockIcon },
  { id: 'chat', label: 'Поддержка', Icon: ChatBubbleLeftRightIcon },
  { id: 'mapPin', label: 'Адрес', Icon: MapPinIcon },
  { id: 'star', label: 'Рейтинг', Icon: StarIcon },
  { id: 'heart', label: 'Забота', Icon: HeartIcon },
  { id: 'bolt', label: 'Скорость', Icon: BoltIcon },
]

function FeatureIconPicker({
  value,
  onChange,
  labelledBy,
}: {
  value: PromoFeatureIconId
  onChange: (id: PromoFeatureIconId) => void
  labelledBy?: string
}) {
  return (
    <div
      className="mt-2 flex flex-wrap gap-2"
      role="group"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : 'Иконка карточки'}
    >
      {FEATURE_ICON_OPTIONS.map(({ id, label, Icon }) => {
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            title={label}
            className={`flex min-w-[4.75rem] flex-col items-center gap-1.5 rounded-lg border px-2.5 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
              selected
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100 shadow-[0_0_0_1px_rgba(129,140,248,0.35)]'
                : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-gray-200'
            }`}
          >
            <Icon className="size-7 shrink-0" aria-hidden />
            <span className="max-w-[5rem] text-center text-[10px] font-medium leading-tight">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className={sectionClass}>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {description ? <p className={`mt-1 ${hintClass}`}>{description}</p> : null}
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  )
}

function HomePromoImageCardsSection({
  title,
  description,
  block,
  setBlock,
}: {
  title: string
  description: string
  block: HomeAdvantagesForm
  setBlock: (fn: (prev: HomeAdvantagesForm) => HomeAdvantagesForm) => void
}) {
  const setItemImageFromFile = (index: number, file: File | null | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      setBlock((b) => {
        const items = [...b.items]
        items[index] = { ...items[index], imageUrl: dataUrl }
        return { ...b, items }
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <Section title={title} description={description}>
      <div>
        <label className={labelClass}>Надзаголовок (eyebrow)</label>
        <input
          type="text"
          value={block.eyebrow}
          onChange={(e) => setBlock((b) => ({ ...b, eyebrow: e.target.value }))}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Заголовок</label>
        <input
          type="text"
          value={block.title}
          onChange={(e) => setBlock((b) => ({ ...b, title: e.target.value }))}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Подзаголовок</label>
        <textarea
          rows={2}
          value={block.subtitle}
          onChange={(e) => setBlock((b) => ({ ...b, subtitle: e.target.value }))}
          className={inputClass}
        />
      </div>
      <div className="space-y-4">
        <p className={`text-sm ${hintClass}`}>
          Карточки (порядок как на сайте). Изображения загружаются файлом, как фото в промо «О компании».
        </p>
        {block.items.map((item, index) => {
          const fileInputId = `home-advantage-image-${index}`
          return (
            <div
              key={index}
              className="space-y-3 rounded-md border border-white/10 bg-white/[0.02] p-4"
            >
              <p className="text-xs font-medium text-gray-500">Карточка {index + 1}</p>
              <div>
                <label className={labelClass}>Заголовок</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    setBlock((b) => {
                      const items = [...b.items]
                      items[index] = { ...items[index], name: e.target.value }
                      return { ...b, items }
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Текст</label>
                <textarea
                  rows={3}
                  value={item.description}
                  onChange={(e) =>
                    setBlock((b) => {
                      const items = [...b.items]
                      items[index] = { ...items[index], description: e.target.value }
                      return { ...b, items }
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Изображение</label>
                <p className={`mt-0.5 ${hintClass}`}>PNG, JPEG, WebP, SVG.</p>
                <div className="relative mt-2 aspect-square w-28 max-w-full overflow-hidden rounded-md bg-white/5">
                  {item.imageUrl.trim() ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <PhotoIcon className="size-7" aria-hidden />
                    </div>
                  )}
                </div>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="sr-only"
                  onChange={(e) => setItemImageFromFile(index, e.target.files?.[0])}
                />
                <div className="mt-2 flex w-28 max-w-full items-center justify-between">
                  <label
                    htmlFor={fileInputId}
                    className="inline-flex cursor-pointer items-center rounded-md p-1.5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                    aria-label={`Загрузить изображение карточки ${index + 1}`}
                  >
                    <ArrowUpTrayIcon className="size-4" aria-hidden />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setBlock((b) => {
                        const items = [...b.items]
                        items[index] = { ...items[index], imageUrl: '' }
                        return { ...b, items }
                      })
                    }
                    className="inline-flex items-center rounded-md p-1.5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                    aria-label={`Удалить изображение карточки ${index + 1}`}
                  >
                    <TrashIcon className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function HomePromoIconCardsSection({
  title,
  description,
  block,
  setBlock,
  idPrefix,
}: {
  title: string
  description: string
  block: HomeFeaturesForm
  setBlock: (fn: (prev: HomeFeaturesForm) => HomeFeaturesForm) => void
  idPrefix: string
}) {
  return (
    <Section title={title} description={description}>
      <div>
        <label className={labelClass}>Надзаголовок (eyebrow)</label>
        <input
          type="text"
          value={block.eyebrow}
          onChange={(e) => setBlock((b) => ({ ...b, eyebrow: e.target.value }))}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Заголовок</label>
        <input
          type="text"
          value={block.title}
          onChange={(e) => setBlock((b) => ({ ...b, title: e.target.value }))}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Подзаголовок</label>
        <textarea
          rows={2}
          value={block.subtitle}
          onChange={(e) => setBlock((b) => ({ ...b, subtitle: e.target.value }))}
          className={inputClass}
        />
      </div>
      <div className="space-y-4">
        <p className={`text-sm ${hintClass}`}>Карточки (порядок как на сайте)</p>
        {block.items.map((item, index) => (
          <div
            key={index}
            className="space-y-3 rounded-md border border-white/10 bg-white/[0.02] p-4"
          >
            <p className="text-xs font-medium text-gray-500">Карточка {index + 1}</p>
            <div>
              <label className={labelClass}>Заголовок</label>
              <input
                type="text"
                value={item.name}
                onChange={(e) =>
                  setBlock((b) => {
                    const items = [...b.items]
                    items[index] = { ...items[index], name: e.target.value }
                    return { ...b, items }
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Текст</label>
              <textarea
                rows={3}
                value={item.description}
                onChange={(e) =>
                  setBlock((b) => {
                    const items = [...b.items]
                    items[index] = { ...items[index], description: e.target.value }
                    return { ...b, items }
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <p id={`${idPrefix}-icon-label-${index}`} className={labelClass}>
                Иконка
              </p>
              <FeatureIconPicker
                labelledBy={`${idPrefix}-icon-label-${index}`}
                value={item.iconId}
                onChange={(iconId) =>
                  setBlock((b) => {
                    const items = [...b.items]
                    items[index] = { ...items[index], iconId }
                    return { ...b, items }
                  })
                }
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function AdminPromoHomePage() {
  const { promo, setPromo, mounted, save, savedFlash, setSavedFlash, apiError, setApiError, dbPromoEmpty } =
    useAdminPromoMaterialsForm()
  const [heroEditIndex, setHeroEditIndex] = useState<number | null>(null)

  const onSubmit = async (e: FormEvent) => {
    await save(e)
  }

  const patchHomeHeroAt = (index: number, patch: Partial<HomeHeroSlideForm>) => {
    setPromo((prev) => ({
      ...prev,
      homeHeroes: prev.homeHeroes.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    }))
  }

  const setHomeHeroColumnImageFromFile = (index: number, file: File | null | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      patchHomeHeroAt(index, { imageUrl: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  const moveHomeHero = (index: number, dir: -1 | 1) => {
    const j = index + dir
    setPromo((prev) => {
      if (j < 0 || j >= prev.homeHeroes.length) return prev
      const next = [...prev.homeHeroes]
      ;[next[index], next[j]] = [next[j], next[index]]
      return { ...prev, homeHeroes: next }
    })
    setHeroEditIndex((cur) => {
      if (cur == null) return null
      if (cur === index) return j
      if (cur === j) return index
      return cur
    })
  }

  const removeHomeHeroAt = (index: number) => {
    setPromo((prev) => {
      if (prev.homeHeroes.length <= 1) return prev
      return { ...prev, homeHeroes: prev.homeHeroes.filter((_, i) => i !== index) }
    })
    setHeroEditIndex((cur) => {
      if (cur == null) return null
      if (cur === index) return null
      if (cur > index) return cur - 1
      return cur
    })
  }

  const heroDialogSlide = heroEditIndex != null ? promo.homeHeroes[heroEditIndex] : null

  if (!mounted) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-400">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Промо материалы</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Главная</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Лента в шапке, hero, блок «Почему мы». Карточки категорий и фото для мегаменю настраиваются в разделе{' '}
          <Link to="/admin/promo-materials/catalog" className="text-indigo-300 underline hover:text-indigo-200">
            Каталог
          </Link>
          .
        </p>

        <AdminPromoDbSyncBanner show={dbPromoEmpty} />

        <form onSubmit={onSubmit} className="mt-8 space-y-8">
          <Section title="Лента" description="Сообщения в индиго-полоске над навбаром.">
            <ul className="space-y-3">
              {promo.tickerMessages.map((line, index) => (
                <li key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={line}
                    onChange={(e) =>
                      setPromo((p) => ({
                        ...p,
                        tickerMessages: p.tickerMessages.map((t, i) => (i === index ? e.target.value : t)),
                      }))
                    }
                    className={`${inputClass} mt-0 flex-1`}
                    aria-label={`Сообщение ленты ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPromo((p) => ({
                        ...p,
                        tickerMessages: p.tickerMessages.filter((_, i) => i !== index),
                      }))
                    }
                    className="shrink-0 rounded-md border border-white/10 p-2 text-gray-400 hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200"
                    aria-label="Удалить строку"
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() =>
                setPromo((p) => ({
                  ...p,
                  tickerMessages: [...p.tickerMessages, 'Новое сообщение ленты'],
                }))
              }
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
            >
              <PlusIcon className="size-4" />
              Добавить строку
            </button>
          </Section>

          <section className={sectionClass}>
            <h2 className="text-base font-semibold text-white">Hero главной</h2>
            <p className={`mt-1 ${hintClass}`}>
              Один или несколько полноэкранных блоков вверху `/`. Порядок — как при прокрутке. Превью и кнопка с ключом у каждого блока.
            </p>
            <ul className="mt-6 space-y-6">
              {promo.homeHeroes.map((slide, index) => {
                const last = index === promo.homeHeroes.length - 1
                return (
                  <li
                    key={index}
                    className="overflow-hidden rounded-xl border border-white/10 ring-1 ring-white/5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.02] px-3 py-2.5">
                      <div>
                        <span className="text-sm font-medium text-gray-300">Блок {index + 1}</span>
                        <span className="ml-2 text-xs text-gray-500">· {heroTemplateShortLabel(slide.template)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveHomeHero(index, -1)}
                          disabled={index === 0}
                          className="rounded-md border border-white/10 p-2 text-gray-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                          aria-label="Переместить вверх"
                        >
                          <ArrowUpIcon className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveHomeHero(index, 1)}
                          disabled={last}
                          className="rounded-md border border-white/10 p-2 text-gray-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                          aria-label="Переместить вниз"
                        >
                          <ArrowDownIcon className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHomeHeroAt(index)}
                          disabled={promo.homeHeroes.length <= 1}
                          className="rounded-md border border-white/10 p-2 text-gray-400 transition hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200 disabled:pointer-events-none disabled:opacity-30"
                          aria-label="Удалить блок"
                        >
                          <TrashIcon className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeroEditIndex(index)}
                          className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-gray-950/90 p-2 text-indigo-200 shadow-sm transition hover:border-indigo-500/40 hover:bg-indigo-950/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                          aria-label={`Настроить hero-блок ${index + 1}`}
                        >
                          <WrenchScrewdriverIcon className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="relative h-[340px] overflow-hidden sm:h-[380px] md:h-[400px]">
                      <div
                        className="pointer-events-none absolute top-0 left-1/2 w-[1280px] max-w-none"
                        style={{
                          transform: 'translateX(-50%) scale(0.48)',
                          transformOrigin: 'top center',
                        }}
                      >
                        <HomeHeroPreview
                          hero={slide}
                          layout="frame"
                          headingId={`admin-hero-preview-title-${index}`}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={() =>
                setPromo((p) => ({ ...p, homeHeroes: [...p.homeHeroes, createDefaultHomeHeroSlide()] }))
              }
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
            >
              <PlusIcon className="size-4" />
              Добавить hero-блок
            </button>
          </section>

          <Dialog
            open={heroEditIndex !== null && heroDialogSlide != null}
            onClose={() => setHeroEditIndex(null)}
            className="relative z-[120]"
          >
            <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <DialogPanel className="relative max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl bg-[#0d1b2a] px-4 py-6 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:px-5">
                <button
                  type="button"
                  onClick={() => setHeroEditIndex(null)}
                  className="absolute top-4 right-4 rounded-md px-2 py-1 text-sm text-gray-400 transition hover:bg-white/10 hover:text-white"
                >
                  Закрыть
                </button>
                <DialogTitle className="pr-16 text-lg font-semibold tracking-tight text-white">
                  Настройки hero-блока {heroEditIndex != null ? heroEditIndex + 1 : ''}
                </DialogTitle>
                <p className={`mt-1 text-sm ${hintClass}`}>Поля этого блока на главной.</p>
                {heroEditIndex != null && heroDialogSlide ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className={labelClass}>Шаблон</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {HERO_TEMPLATE_OPTIONS.map((opt) => {
                          const selected = heroDialogSlide.template === opt.id
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => patchHomeHeroAt(heroEditIndex, { template: opt.id })}
                              className={`rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                                selected
                                  ? 'border-indigo-400/70 bg-indigo-500/15 text-indigo-50'
                                  : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:bg-white/[0.06]'
                              }`}
                            >
                              <span className="block text-sm font-medium text-white">{opt.label}</span>
                              <span className="mt-0.5 block text-xs text-gray-500">{opt.hint}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {heroDialogSlide.template === 'splitLogo' ? (
                      <div className="sm:col-span-2">
                        <label className={labelClass}>URL логотипа (над заголовком)</label>
                        <input
                          type="text"
                          value={heroDialogSlide.logoUrl}
                          onChange={(e) => patchHomeHeroAt(heroEditIndex, { logoUrl: e.target.value })}
                          className={inputClass}
                          placeholder="Пусто — маркер по умолчанию"
                        />
                      </div>
                    ) : null}
                    {heroDialogSlide.template !== 'gradient' ? (
                      <div className="sm:col-span-2">
                        <p className={labelClass}>Фото колонки</p>
                        <p className={`mt-0.5 ${hintClass}`}>
                          Нажмите на миниатюру, чтобы выбрать файл (PNG, JPEG, WebP, GIF, SVG). Пусто — демо для
                          шаблона.
                        </p>
                        <div className="mt-2 flex flex-wrap items-start gap-3">
                          <input
                            id={`admin-hero-column-photo-${heroEditIndex}`}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            className="sr-only"
                            onChange={(e) => {
                              setHomeHeroColumnImageFromFile(heroEditIndex, e.target.files?.[0])
                              e.target.value = ''
                            }}
                          />
                          <label
                            htmlFor={`admin-hero-column-photo-${heroEditIndex}`}
                            className="group relative aspect-[4/5] w-32 max-w-full cursor-pointer overflow-hidden rounded-lg border border-white/15 bg-white/5 shadow-sm transition hover:border-indigo-400/40 hover:bg-white/[0.07] focus-within:ring-2 focus-within:ring-indigo-500/50"
                          >
                            <span className="sr-only">Выбрать фото колонки</span>
                            {heroDialogSlide.imageUrl.trim() ? (
                              <>
                                <img
                                  src={heroDialogSlide.imageUrl}
                                  alt=""
                                  className="absolute inset-0 size-full object-cover"
                                />
                                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1.5 text-center text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                                  Заменить
                                </span>
                              </>
                            ) : (
                              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-gray-500">
                                <PhotoIcon className="size-8" aria-hidden />
                                <span className="px-2 text-center text-[10px] leading-tight">Добавить фото</span>
                              </span>
                            )}
                          </label>
                          {heroDialogSlide.imageUrl.trim() ? (
                            <button
                              type="button"
                              onClick={() => patchHomeHeroAt(heroEditIndex, { imageUrl: '' })}
                              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-2 text-xs font-medium text-gray-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                            >
                              <TrashIcon className="size-4 shrink-0" aria-hidden />
                              Убрать
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Текст в пилюле</label>
                      <input
                        type="text"
                        value={heroDialogSlide.badgeText}
                        onChange={(e) => patchHomeHeroAt(heroEditIndex, { badgeText: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Подпись ссылки в пилюле</label>
                      <input
                        type="text"
                        value={heroDialogSlide.badgeLinkLabel}
                        onChange={(e) => patchHomeHeroAt(heroEditIndex, { badgeLinkLabel: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Ссылка из пилюли</label>
                      <input
                        type="text"
                        value={heroDialogSlide.badgeLinkHref}
                        onChange={(e) => patchHomeHeroAt(heroEditIndex, { badgeLinkHref: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Заголовок</label>
                      <input
                        type="text"
                        value={heroDialogSlide.title}
                        onChange={(e) => patchHomeHeroAt(heroEditIndex, { title: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Описание</label>
                      <textarea
                        rows={3}
                        value={heroDialogSlide.subtitle}
                        onChange={(e) => patchHomeHeroAt(heroEditIndex, { subtitle: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Основная кнопка — текст</label>
                      <input
                        type="text"
                        value={heroDialogSlide.primaryCtaLabel}
                        onChange={(e) => patchHomeHeroAt(heroEditIndex, { primaryCtaLabel: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Основная кнопка — ссылка</label>
                      <input
                        type="text"
                        value={heroDialogSlide.primaryCtaHref}
                        onChange={(e) => patchHomeHeroAt(heroEditIndex, { primaryCtaHref: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Доп. кнопка — текст</label>
                      <input
                        type="text"
                        value={heroDialogSlide.secondaryCtaLabel}
                        onChange={(e) => patchHomeHeroAt(heroEditIndex, { secondaryCtaLabel: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Доп. кнопка — ссылка</label>
                      <input
                        type="text"
                        value={heroDialogSlide.secondaryCtaHref}
                        onChange={(e) => patchHomeHeroAt(heroEditIndex, { secondaryCtaHref: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="mt-6 flex justify-end border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setHeroEditIndex(null)}
                    className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  >
                    Готово
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>

          <HomePromoIconCardsSection
            title="Почему мы"
            description="Заголовок секции и четыре карточки преимуществ."
            block={promo.homeFeatures}
            setBlock={(fn) => setPromo((p) => ({ ...p, homeFeatures: fn(p.homeFeatures) }))}
            idPrefix="home-feature"
          />
          <HomePromoImageCardsSection
            title="Наши преимущества"
            description="Четыре карточки с картинками по URL. На главной — сразу под блоком «Популярные товары»."
            block={promo.homeAdvantages}
            setBlock={(fn) => setPromo((p) => ({ ...p, homeAdvantages: fn(p.homeAdvantages) }))}
          />

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-6">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
      <ProfileSaveToast
        open={savedFlash}
        onDismiss={() => setSavedFlash(false)}
        message="Настройки главной страницы сохранены."
      />
      <ProfileSaveToast
        open={apiError != null}
        onDismiss={() => setApiError(null)}
        title="Ошибка"
        message={apiError ?? ''}
      />
    </div>
  )
}
