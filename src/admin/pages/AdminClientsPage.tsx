import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchAdminClientsFromApi, putAdminClientsToApi } from '../../api/adminDataApi'
import { isSiteConfigApiExpected } from '../../constants/apiBase'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import { ProfileSettingsDialog } from '../../components/ProfileSettingsDialog'
import { ProfileForm, profileExtrasFromClientTableRow } from '../../pages/ProfilePage'
import {
  CLIENTS_UPDATED_EVENT,
  loadClientsDraft,
  saveClientsDraft,
} from '../lib/adminDraftStorage'
import type { AdminClientRow } from '../types/adminClients'

const inputClass =
  'block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'

const COLUMN_DEFS = [
  { id: 'firstName' as const, label: 'Имя' },
  { id: 'lastName' as const, label: 'Фамилия' },
  { id: 'phone' as const, label: 'Телефон' },
  { id: 'email' as const, label: 'Email' },
]

function newClientId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `c-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }
}

function TableCheckbox({
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

function ColumnVisibilityCheckbox({
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

function rowMatchesSearch(row: AdminClientRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hit = (s: string) => s.toLowerCase().includes(q)
  if (hit(row.firstName)) return true
  if (hit(row.lastName)) return true
  if (hit(row.email)) return true
  if (hit(row.phone)) return true
  return false
}

function clientRowToProfileExtras(row: AdminClientRow) {
  return profileExtrasFromClientTableRow(row)
}

function compareClients(
  a: AdminClientRow,
  b: AdminClientRow,
  columnId: string,
  direction: 'asc' | 'desc',
): number {
  const va =
    columnId === 'firstName'
      ? a.firstName
      : columnId === 'lastName'
        ? a.lastName
        : columnId === 'email'
          ? a.email
          : a.phone
  const vb =
    columnId === 'firstName'
      ? b.firstName
      : columnId === 'lastName'
        ? b.lastName
        : columnId === 'email'
          ? b.email
          : b.phone
  const cmp = String(va).localeCompare(String(vb), 'ru', { numeric: true, sensitivity: 'base' })
  return direction === 'asc' ? cmp : -cmp
}

export function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientRow[]>([])
  const [savedFlash, setSavedFlash] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [previewClientId, setPreviewClientId] = useState<string | null>(null)
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([])
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumnId, setSortColumnId] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const columnsMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setClients(loadClientsDraft())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isSiteConfigApiExpected()) return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchAdminClientsFromApi()
        if (cancelled || remote == null || !Array.isArray(remote.clients)) return
        saveClientsDraft(remote.clients)
        setClients(loadClientsDraft())
      } catch {
        /* остаётся черновик из localStorage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const sync = () => setClients(loadClientsDraft())
    window.addEventListener('storage', sync)
    window.addEventListener(CLIENTS_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(CLIENTS_UPDATED_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    if (!columnsMenuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (columnsMenuRef.current && target && !columnsMenuRef.current.contains(target)) {
        setColumnsMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [columnsMenuOpen])

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients
    return clients.filter((row) => rowMatchesSearch(row, searchQuery))
  }, [clients, searchQuery])

  const filteredIdSet = useMemo(() => new Set(filteredClients.map((r) => r.id)), [filteredClients])

  const visibleColumnDefs = useMemo(
    () => COLUMN_DEFS.filter((c) => !hiddenColumnIds.includes(c.id)),
    [hiddenColumnIds],
  )

  const displayedClients = useMemo(() => {
    if (!sortColumnId) return filteredClients
    const next = [...filteredClients]
    next.sort((a, b) => compareClients(a, b, sortColumnId, sortDirection))
    return next
  }, [filteredClients, sortColumnId, sortDirection])

  const tableGridTemplate = useMemo(() => {
    const cols = visibleColumnDefs.map(() => 'minmax(10rem,1fr)').join(' ')
    return `auto ${cols} auto`
  }, [visibleColumnDefs])

  const tableMinWidth = 'min-w-[52rem]'

  const previewClient = previewClientId ? clients.find((c) => c.id === previewClientId) : undefined

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setApiError(null)
    saveClientsDraft(clients)
    if (isSiteConfigApiExpected()) {
      try {
        await putAdminClientsToApi(clients)
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'Не удалось сохранить в базу.')
        return
      }
    }
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  const onColumnSortClick = (columnId: string) => {
    if (sortColumnId === columnId) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumnId(columnId)
      setSortDirection('asc')
    }
  }

  const toggleColumnVisibility = (columnId: string, visible: boolean) => {
    setHiddenColumnIds((prev) => {
      if (!visible && prev.length >= COLUMN_DEFS.length - 1 && !prev.includes(columnId)) {
        return prev
      }
      return visible ? prev.filter((id) => id !== columnId) : [...new Set([...prev, columnId])]
    })
  }

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))
  }

  const addRow = () => {
    const row: AdminClientRow = { id: newClientId(), firstName: '', lastName: '', email: '', phone: '' }
    setClients((prev) => [...prev, row])
    setSelectedIds([row.id])
  }

  const duplicateSelectedRows = () => {
    if (selectedIds.length !== 1) return
    const src = clients.find((c) => c.id === selectedIds[0])
    if (!src) return
    const copy: AdminClientRow = { ...src, id: newClientId() }
    setClients((prev) => [...prev, copy])
    setSelectedIds([copy.id])
  }

  const removeSelectedRows = () => {
    if (selectedIds.length === 0) return
    const remove = new Set(selectedIds)
    setClients((prev) => prev.filter((c) => !remove.has(c.id)))
    setSelectedIds([])
    setPreviewClientId((id) => (id && remove.has(id) ? null : id))
  }

  const updateRow = (id: string, patch: Partial<AdminClientRow>) => {
    setClients((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
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
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Клиенты</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Список клиентов</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Те же поля, что в «Настройки профиля» на сайте: по строке открывается полный профиль (основное, адрес,
          уведомления). Чтобы записать список в черновик, нажмите «Сохранить» внизу.
        </p>

        <form onSubmit={onSave} className="mt-8 space-y-8">
          <section className={sectionClass}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-medium text-gray-200">Панель управления</p>
              <p className="text-xs text-gray-400">Выбрано: {selectedIds.length}</p>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
              <div className="relative min-w-0 w-full max-w-md flex-1">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени, фамилии, телефону, email…"
                  className={`${inputClass} pl-9`}
                  aria-label="Поиск клиентов"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
                >
                  <PlusIcon className="size-4" />
                  Добавить клиента
                </button>
                <button
                  type="button"
                  onClick={duplicateSelectedRows}
                  disabled={selectedIds.length !== 1}
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <DocumentDuplicateIcon className="size-4" />
                  Копировать
                </button>
                <button
                  type="button"
                  onClick={removeSelectedRows}
                  disabled={selectedIds.length === 0}
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <TrashIcon className="size-4" />
                  Удалить
                </button>
                <div ref={columnsMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setColumnsMenuOpen((v) => !v)}
                    className="flex size-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                    aria-label="Настроить отображение столбцов"
                    aria-expanded={columnsMenuOpen}
                  >
                    <Cog6ToothIcon className="size-4" />
                  </button>
                  {columnsMenuOpen ? (
                    <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-white/15 bg-gray-900/95 p-3 shadow-xl backdrop-blur">
                      <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                        Отображение столбцов
                      </p>
                      <ul className="space-y-1.5">
                        {COLUMN_DEFS.map((column) => (
                          <li key={column.id} className="flex items-center gap-2">
                            <ColumnVisibilityCheckbox
                              checked={!hiddenColumnIds.includes(column.id)}
                              onChange={(checked) => toggleColumnVisibility(column.id, checked)}
                              ariaLabel={`Показать столбец ${column.label}`}
                            />
                            <span className="text-sm text-gray-200">{column.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="stable-scroll-x-purple overflow-x-auto">
              <div
                className="hidden gap-2 text-xs font-medium text-gray-400 sm:grid"
                style={{ gridTemplateColumns: tableGridTemplate, minWidth: tableMinWidth }}
              >
                <div className="flex items-center justify-center">
                  <TableCheckbox
                    checked={
                      filteredClients.length > 0 &&
                      filteredClients.every((row) => selectedIds.includes(row.id))
                    }
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredClients.map((r) => r.id)])))
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)))
                      }
                    }}
                    ariaLabel="Выбрать всех клиентов в текущей выдаче"
                  />
                </div>
                {visibleColumnDefs.map((column) => (
                  <div key={column.id} className="flex min-w-0 items-center justify-center">
                    <button
                      type="button"
                      onClick={() => onColumnSortClick(column.id)}
                      className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-0.5 truncate rounded px-1 py-0.5 text-center transition select-none hover:bg-white/10 hover:text-gray-200 ${
                        sortColumnId === column.id ? 'text-indigo-200' : ''
                      }`}
                      title="Клик — сортировка А→Я / Я→А"
                      aria-sort={
                        sortColumnId === column.id
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <span className="truncate">{column.label}</span>
                      {sortColumnId === column.id ? (
                        sortDirection === 'asc' ? (
                          <ChevronUpIcon className="size-3.5 shrink-0 text-indigo-300" aria-hidden />
                        ) : (
                          <ChevronDownIcon className="size-3.5 shrink-0 text-indigo-300" aria-hidden />
                        )
                      ) : null}
                    </button>
                  </div>
                ))}
                <span />
              </div>

              <ul className="mt-3 space-y-2">
                {filteredClients.length === 0 && clients.length > 0 ? (
                  <li className="rounded-md border border-dashed border-white/15 bg-white/[0.02] py-8 text-center text-sm text-gray-500">
                    Ничего не найдено. Измените запрос поиска.
                  </li>
                ) : null}
                {clients.length === 0 ? (
                  <li className="rounded-md border border-dashed border-white/15 bg-white/[0.02] py-8 text-center text-sm text-gray-500">
                    В базе пока нет клиентов. Нажмите «Добавить клиента».
                  </li>
                ) : null}
                {displayedClients.map((row) => (
                  <li
                    key={row.id}
                    className="grid gap-2"
                    style={{ gridTemplateColumns: tableGridTemplate, minWidth: tableMinWidth }}
                  >
                    <div className="flex items-center justify-center">
                      <TableCheckbox
                        checked={selectedIds.includes(row.id)}
                        onChange={(checked) => toggleRowSelection(row.id, checked)}
                        ariaLabel={`Выбрать клиента ${[row.firstName, row.lastName].filter(Boolean).join(' ') || row.email || row.phone || row.id}`}
                      />
                    </div>
                    {visibleColumnDefs.map((column) => {
                      if (column.id === 'firstName') {
                        return (
                          <input
                            key={column.id}
                            type="text"
                            value={row.firstName}
                            onChange={(e) => updateRow(row.id, { firstName: e.target.value })}
                            className={inputClass}
                            aria-label="Имя"
                          />
                        )
                      }
                      if (column.id === 'lastName') {
                        return (
                          <input
                            key={column.id}
                            type="text"
                            value={row.lastName}
                            onChange={(e) => updateRow(row.id, { lastName: e.target.value })}
                            className={inputClass}
                            aria-label="Фамилия"
                          />
                        )
                      }
                      if (column.id === 'phone') {
                        return (
                          <input
                            key={column.id}
                            type="text"
                            value={row.phone}
                            onChange={(e) => updateRow(row.id, { phone: e.target.value })}
                            className={inputClass}
                            aria-label="Телефон"
                          />
                        )
                      }
                      return (
                        <input
                          key={column.id}
                          type="email"
                          value={row.email}
                          onChange={(e) => updateRow(row.id, { email: e.target.value })}
                          className={inputClass}
                          aria-label="Email"
                        />
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => setPreviewClientId(row.id)}
                      className="inline-flex size-10 items-center justify-center rounded-md border border-white/10 p-2 text-gray-400 hover:border-white/25 hover:bg-white/5 hover:text-white"
                      aria-label="Открыть профиль клиента"
                    >
                      <MagnifyingGlassIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
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

      <ProfileSettingsDialog open={previewClientId != null} onClose={() => setPreviewClientId(null)}>
        {previewClient ? (
          <ProfileForm
            key={previewClient.id}
            adminDraft={{
              clientId: previewClient.id,
              initialExtras: clientRowToProfileExtras(previewClient),
              onPersist: (extras) => {
                updateRow(previewClient.id, {
                  profile: extras,
                  email: extras.email,
                  phone: extras.phone,
                  firstName: extras.firstName,
                  lastName: extras.lastName,
                })
              },
            }}
            onSaveSuccess={() => {
              setPreviewClientId(null)
              setSavedFlash(true)
              window.setTimeout(() => setSavedFlash(false), 2200)
            }}
          />
        ) : null}
      </ProfileSettingsDialog>

      <ProfileSaveToast
        open={savedFlash}
        onDismiss={() => setSavedFlash(false)}
        message="Спасибо, что обновили базу клиентов — изменения сохранены."
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
