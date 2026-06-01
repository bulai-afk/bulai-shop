import { ArrowPathIcon, MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import {
  fetchAdminProductsDictionariesFromApi,
  putAdminProductsDictionariesToApi,
} from '../../api/adminDataApi'
import { isSiteConfigApiExpected } from '../../constants/apiBase'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import { buildDefaultProductsDictionaries } from '../data/siteSettingsDefaults'
import { loadProductsDictionariesDraft, saveProductsDictionariesDraft } from '../lib/adminDraftStorage'
import type {
  ProductDictionaryRow,
  ProductDictionaryValue,
  ProductsDictionariesDraft,
} from '../types/siteSettings'
import { CATEGORY_DICTIONARY_ID, normalizeDictionaryValue } from '../../utils/productDictionaryValue'

const inputClass =
  'block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'
const COLOR_INPUT_FALLBACK = '#6366F1'

function SkuSourceCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
}) {
  return (
    <label className="relative inline-flex size-4 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        aria-label={ariaLabel}
      />
      <span className="size-4 rounded border border-white/25 bg-white/5 transition peer-checked:border-indigo-500/70 peer-checked:bg-indigo-500/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-500/60" />
      <CheckIcon className="pointer-events-none absolute size-3 text-indigo-300 opacity-0 transition peer-checked:opacity-100" />
    </label>
  )
}

export function AdminProductsDictionariesPage() {
  const [draft, setDraft] = useState<ProductsDictionariesDraft>(() => buildDefaultProductsDictionaries())
  const [savedFlash, setSavedFlash] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [activeDictionaryId, setActiveDictionaryId] = useState('')

  useEffect(() => {
    const loadedDraft = loadProductsDictionariesDraft()
    setDraft(loadedDraft)
    setActiveDictionaryId(loadedDraft.dictionaries[0]?.id ?? '')
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isSiteConfigApiExpected()) return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchAdminProductsDictionariesFromApi()
        if (cancelled || remote == null) return
        saveProductsDictionariesDraft(remote)
        const loaded = loadProductsDictionariesDraft()
        setDraft(loaded)
        setActiveDictionaryId(loaded.dictionaries[0]?.id ?? '')
      } catch {
        /* остаётся черновик из localStorage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!draft.dictionaries.length) {
      setActiveDictionaryId('')
      return
    }
    if (!draft.dictionaries.some((row) => row.id === activeDictionaryId)) {
      setActiveDictionaryId(draft.dictionaries[0].id)
    }
  }, [activeDictionaryId, draft.dictionaries])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setApiError(null)
    saveProductsDictionariesDraft(draft)
    if (isSiteConfigApiExpected()) {
      try {
        await putAdminProductsDictionariesToApi(draft)
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'Не удалось сохранить в базу.')
        return
      }
    }
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  const updateRow = (id: string, patch: Partial<ProductDictionaryRow>) => {
    setDraft((prev) => ({
      ...prev,
      dictionaries: prev.dictionaries.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }))
  }

  const toggleSkuSourceDictionary = (id: string, checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      skuSourceDictionaryIds: checked
        ? [...new Set([...prev.skuSourceDictionaryIds, id])]
        : prev.skuSourceDictionaryIds.filter((sourceId) => sourceId !== id),
    }))
  }

  const addRow = () => {
    const newId = `dict-${Date.now()}`
    setDraft((prev) => ({
      ...prev,
      dictionaries: [
        ...prev.dictionaries,
        {
          id: newId,
          name: 'Новый справочник',
          values: [],
        },
      ],
    }))
    setActiveDictionaryId(newId)
  }

  const removeRow = (id: string) => {
    setDraft((prev) => {
      const idx = prev.dictionaries.findIndex((row) => row.id === id)
      const nextRows = prev.dictionaries.filter((row) => row.id !== id)
      const fallbackId = nextRows[idx]?.id ?? nextRows[idx - 1]?.id ?? ''
      if (id === activeDictionaryId) setActiveDictionaryId(fallbackId)
      return {
        ...prev,
        dictionaries: nextRows,
        skuSourceDictionaryIds: prev.skuSourceDictionaryIds.filter((sourceId) => sourceId !== id),
      }
    })
  }

  const activeDictionary = draft.dictionaries.find((row) => row.id === activeDictionaryId) ?? null
  const activeValues = activeDictionary?.values ?? []
  const isCategoryDictionary = activeDictionaryId === CATEGORY_DICTIONARY_ID

  const setActiveValues = (values: ProductDictionaryValue[]) => {
    if (!activeDictionary) return
    updateRow(activeDictionary.id, { values })
  }

  const addValueRow = () => {
    setActiveValues([
      ...activeValues,
      normalizeDictionaryValue(
        { value: '', color: '', imageUrl: '', catalogSlug: '' },
        `${activeDictionaryId}-value-${Date.now()}`,
      ),
    ])
  }

  const updateValueRow = (index: number, value: string) => {
    const next = [...activeValues]
    next[index] = { ...next[index], value }
    setActiveValues(next)
  }

  const updateValueColor = (index: number, color: string) => {
    const next = [...activeValues]
    next[index] = { ...next[index], color }
    setActiveValues(next)
  }

  const patchValueRow = (index: number, patch: Partial<ProductDictionaryValue>) => {
    const next = [...activeValues]
    next[index] = { ...next[index], ...patch }
    setActiveValues(next)
  }

  const removeValueRow = (index: number) => {
    const next = activeValues.filter((_, i) => i !== index)
    setActiveValues(next)
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
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Товары</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Справочники</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Слева кнопки справочников, справа таблица значений выбранного справочника. Мегаменю «Мужское» в
          шапке берёт категории из справочника <strong className="font-medium text-gray-300">Категория</strong>{' '}
          (название, фото, slug для ссылки в каталог).
        </p>

        <form onSubmit={onSave} className="mt-8 flex min-h-[calc(100dvh-15rem)] flex-col gap-8">
          <section className={`${sectionClass} flex min-h-0 flex-1 flex-col`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-300">
                Нажмите на справочник слева, чтобы открыть его значения. Чекбокс слева включает справочник в
                формирование SKU.
              </p>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <div className="flex min-h-0 flex-col rounded-md border border-white/10 bg-white/[0.03] p-2">
                <ul className="max-h-full flex-1 space-y-1 overflow-y-auto">
                  {draft.dictionaries.map((row) => (
                    <li key={row.id}>
                      <div
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition ${
                          row.id === activeDictionaryId
                            ? 'bg-indigo-500/20 text-indigo-200'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <SkuSourceCheckbox
                          checked={draft.skuSourceDictionaryIds.includes(row.id)}
                          onChange={(checked) => toggleSkuSourceDictionary(row.id, checked)}
                          ariaLabel={`Использовать справочник ${row.name || row.id} для SKU`}
                        />
                        <button
                          type="button"
                          onClick={() => setActiveDictionaryId(row.id)}
                          className="min-w-0 flex-1 truncate text-left text-sm"
                        >
                          {row.name.trim() || 'Без названия'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/10 pt-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
                    aria-label="Добавить справочник"
                    title="Добавить справочник"
                  >
                    <PlusIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => activeDictionary && removeRow(activeDictionary.id)}
                    disabled={!activeDictionary}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Удалить выбранный справочник"
                    title="Удалить выбранный справочник"
                  >
                    <MinusIcon className="size-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 rounded-md border border-white/10 bg-white/[0.03] p-3">
                {activeDictionary ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <input
                        type="text"
                        value={activeDictionary.name}
                        onChange={(e) => updateRow(activeDictionary.id, { name: e.target.value })}
                        placeholder="Название справочника"
                        className={`${inputClass} max-w-sm`}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={addValueRow}
                          className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
                        >
                          <PlusIcon className="size-4" />
                          Добавить значение
                        </button>
                      </div>
                    </div>

                    {isCategoryDictionary ? (
                      <>
                        <div className="grid grid-cols-[4rem_minmax(0,1fr)_7rem_minmax(0,1.2fr)_2.5rem] gap-2 text-xs font-medium text-gray-400">
                          <span className="text-center">№</span>
                          <span>Название в меню</span>
                          <span>Slug</span>
                          <span>Фото мегаменю (URL)</span>
                          <span />
                        </div>
                        <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                          {activeValues.map((item, index) => (
                            <li
                              key={item.id}
                              className="grid grid-cols-[4rem_minmax(0,1fr)_7rem_minmax(0,1.2fr)_2.5rem] gap-2"
                            >
                              <div className="flex items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-sm text-gray-300">
                                {String(index + 1).padStart(3, '0')}
                              </div>
                              <input
                                type="text"
                                value={item.value}
                                onChange={(e) => updateValueRow(index, e.target.value)}
                                className={inputClass}
                                placeholder="Новинки, Майки…"
                              />
                              <input
                                type="text"
                                value={item.catalogSlug}
                                onChange={(e) => patchValueRow(index, { catalogSlug: e.target.value })}
                                className={inputClass}
                                placeholder="novinki"
                                title="Параметр ?category= в каталоге"
                              />
                              <input
                                type="url"
                                value={item.imageUrl}
                                onChange={(e) => patchValueRow(index, { imageUrl: e.target.value })}
                                className={inputClass}
                                placeholder="https://…"
                              />
                              <button
                                type="button"
                                onClick={() => removeValueRow(index)}
                                className="size-10 rounded-md border border-white/10 p-2 text-gray-400 hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200"
                                aria-label="Удалить значение"
                              >
                                <TrashIcon className="size-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-[4rem_minmax(0,1fr)_14rem_2.5rem] gap-2 text-xs font-medium text-gray-400">
                          <span className="text-center">№</span>
                          <span className="text-center">Значение</span>
                          <span className="text-center">Цвет</span>
                          <span />
                        </div>
                        <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                          {activeValues.map((item, index) => (
                            <li
                              key={item.id}
                              className="grid grid-cols-[4rem_minmax(0,1fr)_14rem_2.5rem] gap-2"
                            >
                              <div className="flex items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-sm text-gray-300">
                                {String(index + 1).padStart(3, '0')}
                              </div>
                              <input
                                type="text"
                                value={item.value}
                                onChange={(e) => updateValueRow(index, e.target.value)}
                                className={inputClass}
                                placeholder="Введите значение"
                              />
                              <div className="flex h-11 items-center gap-2">
                                <label className="relative flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-gray-200 hover:border-indigo-500/40 hover:bg-indigo-950/20">
                                  <input
                                    type="color"
                                    value={/^#[0-9A-Fa-f]{6}$/.test(item.color) ? item.color : COLOR_INPUT_FALLBACK}
                                    onChange={(e) => updateValueColor(index, e.target.value)}
                                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-[0.015]"
                                    aria-label={`Выбрать цвет для значения ${item.value || index + 1}`}
                                  />
                                  {/^#[0-9A-Fa-f]{6}$/.test(item.color) ? (
                                    <span
                                      aria-hidden
                                      className="size-4 shrink-0 rounded-sm border border-white/25"
                                      style={{ backgroundColor: item.color }}
                                    />
                                  ) : (
                                    <span
                                      aria-hidden
                                      className="size-4 shrink-0 rounded-sm border border-white/25 bg-white/5"
                                    />
                                  )}
                                  <span className="pointer-events-none text-xs font-medium text-gray-300">
                                    {/^#[0-9A-Fa-f]{6}$/.test(item.color)
                                      ? item.color.toUpperCase()
                                      : 'Задать цвет'}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  disabled={!/^#[0-9A-Fa-f]{6}$/.test(item.color)}
                                  onClick={() => updateValueColor(index, '')}
                                  aria-label={`Сбросить цвет для значения ${item.value || index + 1}`}
                                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  <ArrowPathIcon className="size-4 shrink-0" aria-hidden />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeValueRow(index)}
                                className="size-10 rounded-md border border-white/10 p-2 text-gray-400 hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200"
                                aria-label="Удалить значение"
                              >
                                <TrashIcon className="size-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Справочников пока нет. Добавьте первый справочник.</p>
                )}
              </div>
            </div>
          </section>

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
        message="Спасибо, что обновили справочники — изменения сохранены."
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
