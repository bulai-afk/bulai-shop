import { InformationCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { fetchPromoCodesCatalogFromApi, putPromoCodesCatalogToApi } from '../../api/promoCodesCatalogApi'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import { PROMO_CODES_CATALOG_STORAGE_KEY } from '../../constants/promoCodesCatalogStorage'
import { isSiteConfigApiExpected } from '../../constants/apiBase'
import type { PromoCodeCatalogRow, PromoCodesCatalogDraft } from '../../types/promoCodesCatalog'
import {
  defaultPromoCodesCatalogDraft,
  mergePromoCodesCatalogDraft,
} from '../../utils/promoCodesCatalogForm'

const inputInlineClass =
  'block w-full flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'

function loadDraft(): PromoCodesCatalogDraft {
  try {
    const raw = localStorage.getItem(PROMO_CODES_CATALOG_STORAGE_KEY)
    if (!raw) return defaultPromoCodesCatalogDraft()
    return mergePromoCodesCatalogDraft(JSON.parse(raw) as unknown)
  } catch {
    return defaultPromoCodesCatalogDraft()
  }
}

function saveDraftLocal(data: PromoCodesCatalogDraft) {
  localStorage.setItem(PROMO_CODES_CATALOG_STORAGE_KEY, JSON.stringify(data))
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
      {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  )
}

export function AdminPromoCodesPage() {
  const [draft, setDraft] = useState<PromoCodesCatalogDraft>(() => defaultPromoCodesCatalogDraft())
  const [savedFlash, setSavedFlash] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDraft(loadDraft())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !isSiteConfigApiExpected()) return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchPromoCodesCatalogFromApi()
        if (cancelled || remote == null) return
        saveDraftLocal(remote)
        setDraft(remote)
      } catch {
        /* остаётся localStorage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mounted])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setApiError(null)
    saveDraftLocal(draft)
    if (isSiteConfigApiExpected()) {
      try {
        await putPromoCodesCatalogToApi(draft)
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'Не удалось сохранить в базу.')
        return
      }
    }
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  const updateCode = (index: number, patch: Partial<PromoCodeCatalogRow>) => {
    setDraft((prev) => ({
      ...prev,
      promoCodes: prev.promoCodes.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))
  }

  const removeCode = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      promoCodes: prev.promoCodes.filter((_, i) => i !== index),
    }))
  }

  const addCode = () => {
    setDraft((prev) => ({
      ...prev,
      promoCodes: [
        ...prev.promoCodes,
        { code: 'NEWCODE', note: '', validUntil: '', discountPercent: '' },
      ],
    }))
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
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Скидки и промокоды</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Промокоды</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Здесь редактируются промокоды для акций и маркетинговых кампаний. Список сохраняется в базе и
          используется в корзине и на оформлении заказа.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-indigo-500/20 bg-indigo-950/30 px-3 py-2.5 text-sm text-indigo-100/90">
          <InformationCircleIcon className="mt-0.5 size-5 shrink-0 text-indigo-400" aria-hidden />
          <p>Добавьте коды и краткие пояснения, чтобы команда видела актуальные промо-предложения.</p>
        </div>

        <form onSubmit={onSave} className="mt-8 space-y-8">
          <Section
            title="Список промокодов"
            description="Каждая строка: код, название, процент скидки и дата «действует до». Если дата не указана, период действия бессрочный."
          >
            <div
              className="hidden gap-2 text-xs font-medium text-gray-400 sm:grid sm:[grid-template-columns:minmax(0,1fr)_8.5rem_6rem_10.5rem_2.5rem]"
              aria-hidden
            >
              <span className="text-center">Название</span>
              <span className="text-center">Промокод</span>
              <span className="text-center">Скидка, %</span>
              <span className="text-center">Действует до</span>
              <span className="w-10" />
            </div>
            <ul className="space-y-3">
              {draft.promoCodes.map((row, index) => (
                <li
                  key={index}
                  className="grid gap-2 sm:[grid-template-columns:minmax(0,1fr)_8.5rem_6rem_10.5rem_2.5rem]"
                >
                  <input
                    type="text"
                    value={row.note}
                    onChange={(e) => updateCode(index, { note: e.target.value })}
                    className={inputInlineClass}
                    placeholder="Название промокода"
                    aria-label={`Название кода ${index + 1}`}
                  />
                  <input
                    type="text"
                    value={row.code}
                    onChange={(e) => updateCode(index, { code: e.target.value.toUpperCase() })}
                    className={inputInlineClass}
                    placeholder="PROMO10"
                    aria-label={`Код ${index + 1}`}
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={row.discountPercent}
                      onChange={(e) => updateCode(index, { discountPercent: e.target.value })}
                      className={`${inputInlineClass} pr-7 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                      placeholder="0"
                      aria-label={`Процент скидки для кода ${index + 1}`}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-400"
                    >
                      %
                    </span>
                  </div>
                  <input
                    type="date"
                    value={row.validUntil}
                    onChange={(e) => updateCode(index, { validUntil: e.target.value })}
                    className={inputInlineClass}
                    aria-label={`Действует до для кода ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeCode(index)}
                    className="size-10 shrink-0 rounded-md border border-white/10 p-2 text-gray-400 hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200"
                    aria-label="Удалить строку"
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addCode}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
            >
              <PlusIcon className="size-4" />
              Добавить строку
            </button>
          </Section>

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
        message="Список промокодов сохранён (в т.ч. в базе, если API доступен)."
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
