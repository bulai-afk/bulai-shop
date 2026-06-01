import { ArrowUpTrayIcon, InformationCircleIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { FormEvent, ReactNode } from 'react'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import { useAdminPromoMaterialsForm } from '../hooks/useAdminPromoMaterialsForm'
import type { PromoValueIconId } from '../types/siteSettings'

const inputClass =
  'mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'
const labelClass = 'block text-sm font-medium text-gray-300'
const hintClass = 'text-xs text-gray-500'

const aboutHeroImageFields = [
  { key: 'imageA', label: 'Фото A' },
  { key: 'imageB', label: 'Фото B' },
  { key: 'imageC', label: 'Фото C' },
  { key: 'imageD', label: 'Фото D' },
  { key: 'imageE', label: 'Фото E' },
] as const

const VALUE_ICON_OPTIONS: { id: PromoValueIconId; label: string }[] = [
  { id: 'sparkles', label: 'Блёстки' },
  { id: 'share', label: 'Поделиться' },
  { id: 'academic', label: 'Учёба' },
  { id: 'lifebuoy', label: 'Поддержка' },
  { id: 'shield', label: 'Щит' },
  { id: 'moon', label: 'Луна' },
]

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

export function AdminPromoAboutPage() {
  const { promo, setPromo, mounted, save, savedFlash, setSavedFlash, apiError, setApiError } =
    useAdminPromoMaterialsForm()

  const onSubmit = async (e: FormEvent) => {
    await save(e)
  }

  const setAboutHero = (patch: Partial<typeof promo.aboutHero>) => {
    setPromo((prev) => ({ ...prev, aboutHero: { ...prev.aboutHero, ...patch } }))
  }

  const setAboutHeroImage = (
    key: (typeof aboutHeroImageFields)[number]['key'],
    file: File | null | undefined,
  ) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      setAboutHero({ [key]: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  const setBannerImage = (file: File | null | undefined) => {
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      setPromo((p) => ({
        ...p,
        aboutMission: { ...p.aboutMission, bannerImage: dataUrl },
      }))
    }
    reader.readAsDataURL(file)
  }

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
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">О компании</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Hero с фотографиями, блок «Миссия» и «Ценности» на странице `/about`.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-indigo-500/20 bg-indigo-950/30 px-3 py-2.5 text-sm text-indigo-100/90">
          <InformationCircleIcon className="mt-0.5 size-5 shrink-0 text-indigo-400" aria-hidden />
          <p>Блок с телефоном и соцсетями внизу страницы «О компании» пока задаётся в коде страницы.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-8">
          <Section title="Hero" description="Заголовок, текст и пять фото в верхнем блоке.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Заголовок</label>
                <input
                  type="text"
                  value={promo.aboutHero.title}
                  onChange={(e) => setAboutHero({ title: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Описание</label>
                <textarea
                  rows={4}
                  value={promo.aboutHero.description}
                  onChange={(e) => setAboutHero({ description: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Фотографии (5 карточек)</label>
                <p className={`mt-0.5 ${hintClass}`}>PNG, JPEG, WebP. Можно вставить URL вручную в поле ниже при необходимости.</p>
                <div className="mt-2 overflow-x-auto">
                  <div className="flex min-w-max gap-2">
                    {aboutHeroImageFields.map(({ key, label }) => {
                      const value = promo.aboutHero[key]
                      const inputId = `about-hero-${key}`
                      return (
                        <div key={key} className="w-28 shrink-0">
                          <p className="text-xs font-medium text-gray-300">{label}</p>
                          <div className="relative mt-2 aspect-[3/4] overflow-hidden rounded-md bg-white/5">
                            {value ? (
                              <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                <PhotoIcon className="size-7" aria-hidden />
                              </div>
                            )}
                          </div>
                          <input
                            id={inputId}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            className="sr-only"
                            onChange={(e) => setAboutHeroImage(key, e.target.files?.[0])}
                          />
                          <div className="mt-2 flex items-center justify-between">
                            <label
                              htmlFor={inputId}
                              className="inline-flex cursor-pointer items-center rounded-md p-1.5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                              aria-label={`Загрузить ${label}`}
                            >
                              <ArrowUpTrayIcon className="size-4" aria-hidden />
                            </label>
                            <button
                              type="button"
                              onClick={() => setAboutHero({ [key]: '' })}
                              className="inline-flex items-center rounded-md p-1.5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                              aria-label={`Удалить ${label}`}
                            >
                              <TrashIcon className="size-4" aria-hidden />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Миссия" description="Текст и широкое фото под hero.">
            <div>
              <label className={labelClass}>Заголовок секции</label>
              <input
                type="text"
                value={promo.aboutMission.heading}
                onChange={(e) =>
                  setPromo((p) => ({
                    ...p,
                    aboutMission: { ...p.aboutMission, heading: e.target.value },
                  }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Первый абзац</label>
              <textarea
                rows={4}
                value={promo.aboutMission.paragraph1}
                onChange={(e) =>
                  setPromo((p) => ({
                    ...p,
                    aboutMission: { ...p.aboutMission, paragraph1: e.target.value },
                  }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Второй абзац</label>
              <textarea
                rows={4}
                value={promo.aboutMission.paragraph2}
                onChange={(e) =>
                  setPromo((p) => ({
                    ...p,
                    aboutMission: { ...p.aboutMission, paragraph2: e.target.value },
                  }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Фото под текстом</label>
              <div className="relative mt-2 aspect-[21/9] max-h-48 overflow-hidden rounded-md bg-white/5">
                {promo.aboutMission.bannerImage ? (
                  <img
                    src={promo.aboutMission.bannerImage}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <PhotoIcon className="size-10" aria-hidden />
                  </div>
                )}
              </div>
              <input
                id="about-mission-banner"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="sr-only"
                onChange={(e) => setBannerImage(e.target.files?.[0])}
              />
              <div className="mt-2 flex gap-2">
                <label
                  htmlFor="about-mission-banner"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
                >
                  <ArrowUpTrayIcon className="size-4" aria-hidden />
                  Загрузить
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setPromo((p) => ({
                      ...p,
                      aboutMission: { ...p.aboutMission, bannerImage: '' },
                    }))
                  }
                  className="rounded-md border border-white/15 px-3 py-2 text-sm text-gray-300 hover:bg-white/5"
                >
                  Очистить
                </button>
              </div>
            </div>
          </Section>

          <Section title="Ценности" description="Заголовок, подзаголовок и список карточек.">
            <div>
              <label className={labelClass}>Заголовок</label>
              <input
                type="text"
                value={promo.aboutValues.heading}
                onChange={(e) =>
                  setPromo((p) => ({
                    ...p,
                    aboutValues: { ...p.aboutValues, heading: e.target.value },
                  }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Подзаголовок</label>
              <textarea
                rows={2}
                value={promo.aboutValues.subtitle}
                onChange={(e) =>
                  setPromo((p) => ({
                    ...p,
                    aboutValues: { ...p.aboutValues, subtitle: e.target.value },
                  }))
                }
                className={inputClass}
              />
            </div>
            <div className="space-y-4">
              {promo.aboutValues.items.map((item, index) => (
                <div key={index} className="rounded-md border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500">Ценность {index + 1}</p>
                  <div>
                    <label className={labelClass}>Заголовок</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        setPromo((p) => {
                          const items = [...p.aboutValues.items]
                          items[index] = { ...items[index], title: e.target.value }
                          return { ...p, aboutValues: { ...p.aboutValues, items } }
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Текст</label>
                    <textarea
                      rows={3}
                      value={item.text}
                      onChange={(e) =>
                        setPromo((p) => {
                          const items = [...p.aboutValues.items]
                          items[index] = { ...items[index], text: e.target.value }
                          return { ...p, aboutValues: { ...p.aboutValues, items } }
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Иконка</label>
                    <select
                      value={item.iconId}
                      onChange={(e) =>
                        setPromo((p) => {
                          const items = [...p.aboutValues.items]
                          items[index] = {
                            ...items[index],
                            iconId: e.target.value as PromoValueIconId,
                          }
                          return { ...p, aboutValues: { ...p.aboutValues, items } }
                        })
                      }
                      className={inputClass}
                    >
                      {VALUE_ICON_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-6">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
      <ProfileSaveToast
        open={savedFlash}
        onDismiss={() => setSavedFlash(false)}
        message="Страница «О компании» сохранена."
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
