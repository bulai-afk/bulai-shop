import {
  ArrowUpTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon,
  PhotoIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type { FormEvent, ReactNode } from 'react'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import type { CatalogCategoryPromoSlug } from '../../constants/catalogCategoryPromo'
import { useAdminPromoMaterialsForm } from '../hooks/useAdminPromoMaterialsForm'
import type { CategoryVisualPromoForm } from '../types/siteSettings'

const inputClass =
  'mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'
const labelClass = 'block text-sm font-medium text-gray-300'
const hintClass = 'text-xs text-gray-500'

const SLUG_LABEL: Record<CatalogCategoryPromoSlug, string> = {
  novinki: 'Новинки',
  rubashki: 'Рубашки',
  mayki: 'Майки',
  bryuki: 'Брюки',
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

function ImageSlot({
  label,
  value,
  onFile,
  onClear,
}: {
  label: string
  value: string
  onFile: (f: File | undefined) => void
  onClear: () => void
}) {
  const id = `img-${label.replace(/\s/g, '-')}`
  return (
    <div>
      <p className="text-xs font-medium text-gray-300">{label}</p>
      <div className="relative mt-2 aspect-video overflow-hidden rounded-md bg-white/5">
        {value ? (
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <PhotoIcon className="size-8" aria-hidden />
          </div>
        )}
      </div>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/15 px-2 py-1.5 text-xs text-gray-200 hover:bg-white/5"
        >
          <ArrowUpTrayIcon className="size-3.5" aria-hidden />
          Загрузить
        </label>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5"
        >
          <TrashIcon className="size-3.5" aria-hidden />
          Очистить
        </button>
      </div>
    </div>
  )
}

export function AdminPromoCatalogPage() {
  const { promo, setPromo, mounted, save, savedFlash, setSavedFlash, apiError, setApiError } =
    useAdminPromoMaterialsForm()

  const onSubmit = async (e: FormEvent) => {
    await save(e)
  }

  const updateRow = (slug: CatalogCategoryPromoSlug, patch: Partial<CategoryVisualPromoForm>) => {
    setPromo((p) => ({
      ...p,
      categoryVisuals: p.categoryVisuals.map((row) => (row.slug === slug ? { ...row, ...patch } : row)),
    }))
  }

  const readImageFile = (file: File | undefined, cb: (dataUrl: string) => void) => {
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (dataUrl) cb(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const moveRow = (index: number, dir: -1 | 1) => {
    setPromo((p) => {
      const j = index + dir
      if (j < 0 || j >= p.categoryVisuals.length) return p
      const next = [...p.categoryVisuals]
      const t = next[index]!
      next[index] = next[j]!
      next[j] = t
      return { ...p, categoryVisuals: next }
    })
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
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Каталог</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Описания и три варианта фото для каждой категории: главная, мегаменю, блок «Ключевые детали» на
          `/catalog`. Порядок строк — порядок крупной карточки и колонки на главной (первая строка — большая
          плитка).
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-indigo-500/20 bg-indigo-950/30 px-3 py-2.5 text-sm text-indigo-100/90">
          <InformationCircleIcon className="mt-0.5 size-5 shrink-0 text-indigo-400" aria-hidden />
          <p>
            Для «Новинок» блок ключевых деталей на каталоге не показывается — поля можно оставить пустыми.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-8">
          <Section
            title="Блок «Ключевые детали»"
            description="Общий заголовок и вводный текст над вкладками на странице каталога."
          >
            <div>
              <label className={labelClass}>Заголовок</label>
              <input
                type="text"
                value={promo.catalogKeyDetailsSection.heading}
                onChange={(e) =>
                  setPromo((p) => ({
                    ...p,
                    catalogKeyDetailsSection: {
                      ...p.catalogKeyDetailsSection,
                      heading: e.target.value,
                    },
                  }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Вводный текст</label>
              <textarea
                rows={2}
                value={promo.catalogKeyDetailsSection.lead}
                onChange={(e) =>
                  setPromo((p) => ({
                    ...p,
                    catalogKeyDetailsSection: {
                      ...p.catalogKeyDetailsSection,
                      lead: e.target.value,
                    },
                  }))
                }
                className={inputClass}
              />
            </div>
          </Section>

          {promo.categoryVisuals.map((row, index) => (
            <section key={row.slug} className={sectionClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {SLUG_LABEL[row.slug]} <span className="text-gray-500">({row.slug})</span>
                  </h2>
                  <p className={`mt-1 ${hintClass}`}>
                    Подпись на сайте и ссылки фильтра задаются полем «Название для карточки».
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                    className="rounded-md border border-white/10 p-2 text-gray-300 hover:bg-white/5 disabled:opacity-30"
                    aria-label="Выше"
                  >
                    <ArrowUpIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === promo.categoryVisuals.length - 1}
                    className="rounded-md border border-white/10 p-2 text-gray-300 hover:bg-white/5 disabled:opacity-30"
                    aria-label="Ниже"
                  >
                    <ArrowDownIcon className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className={labelClass}>Название для карточки</label>
                  <input
                    type="text"
                    value={row.displayName}
                    onChange={(e) => updateRow(row.slug, { displayName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Описание на главной</label>
                  <textarea
                    rows={3}
                    value={row.descriptionHome}
                    onChange={(e) => updateRow(row.slug, { descriptionHome: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={row.featuredTitle}
                    onChange={(e) => updateRow(row.slug, { featuredTitle: e.target.checked })}
                    className="rounded border-white/20 bg-white/5"
                  />
                  Крупный заголовок карточки (как у избранных категорий)
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <ImageSlot
                    label="Фото: главная"
                    value={row.imageHome}
                    onFile={(f) =>
                      readImageFile(f, (url) => updateRow(row.slug, { imageHome: url }))
                    }
                    onClear={() => updateRow(row.slug, { imageHome: '' })}
                  />
                  <ImageSlot
                    label="Фото: мегаменю"
                    value={row.imageMegaMenu}
                    onFile={(f) =>
                      readImageFile(f, (url) => updateRow(row.slug, { imageMegaMenu: url }))
                    }
                    onClear={() => updateRow(row.slug, { imageMegaMenu: '' })}
                  />
                  <ImageSlot
                    label="Фото: ключевые детали"
                    value={row.imageKeyDetails}
                    onFile={(f) =>
                      readImageFile(f, (url) => updateRow(row.slug, { imageKeyDetails: url }))
                    }
                    onClear={() => updateRow(row.slug, { imageKeyDetails: '' })}
                  />
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm font-medium text-white">Текст во вкладке «Ключевые детали»</p>
                  <p className={`mt-1 ${hintClass}`}>Для рубашек, майки и брюк — отображается на `/catalog`.</p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className={labelClass}>Заголовок</label>
                      <input
                        type="text"
                        value={row.keyDetailsTitle}
                        onChange={(e) => updateRow(row.slug, { keyDetailsTitle: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Описание</label>
                      <textarea
                        rows={4}
                        value={row.keyDetailsBody}
                        onChange={(e) => updateRow(row.slug, { keyDetailsBody: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}

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
        message="Настройки категорий и ключевых деталей сохранены."
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
