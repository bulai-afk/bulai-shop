import {
  ArrowDownTrayIcon,
  DocumentIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DocumentPreviewSurface,
  DocumentViewerDialog,
  isPdfEffectiveMime,
  normalizePreviewBlobForPreview,
} from '../../components/DocumentViewerDialog'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import type { AdminStoredDocumentMeta } from '../lib/adminDocumentsStorage'
import {
  ADMIN_DOCUMENTS_UPDATED_EVENT,
  addAdminDocument,
  getAdminDocumentBlob,
  listAdminDocuments,
  patchAdminDocument,
  removeAdminDocument,
} from '../lib/adminDocumentsStorage'
import { documentDisplayName } from '../../utils/documentDisplayName'

const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'
const visibilityCheckboxClass =
  'size-4 shrink-0 rounded border-white/25 bg-white/5 text-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-0 focus:ring-offset-transparent'
const inputBtnClass =
  'inline-flex cursor-pointer items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500'

function formatFileSizeRu(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10_485_760 ? 1 : 0)} МБ`
}

function formatUploadedAt(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return iso
  }
}

export function AdminDocumentsPage() {
  const [items, setItems] = useState<AdminStoredDocumentMeta[]>([])
  const [mounted, setMounted] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  })
  const [viewer, setViewer] = useState<{
    meta: AdminStoredDocumentMeta
    url: string
    effectiveMime: string
    pdfFile?: Blob
  } | null>(null)
  const [openingViewerId, setOpeningViewerId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    try {
      setLoadError(null)
      const list = await listAdminDocuments()
      setItems(list)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Не удалось прочитать список файлов.')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refresh()
      } finally {
        if (!cancelled) setMounted(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  useEffect(() => {
    const onUpdated = () => {
      void refresh()
    }
    window.addEventListener(ADMIN_DOCUMENTS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(ADMIN_DOCUMENTS_UPDATED_EVENT, onUpdated)
  }, [refresh])

  const uploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.size > 0)
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        await addAdminDocument(file)
      }
      await refresh()
      setToast({
        open: true,
        title: 'Готово',
        message:
          files.length === 1
            ? `Файл «${documentDisplayName(files[0].name)}» сохранён.`
            : `Сохранено файлов: ${files.length}.`,
      })
    } catch (e) {
      setToast({
        open: true,
        title: 'Ошибка',
        message: e instanceof Error ? e.message : 'Не удалось сохранить файл.',
      })
    } finally {
      setUploading(false)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (list?.length) void uploadFiles(list)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const list = e.dataTransfer.files
    if (list?.length) void uploadFiles(list)
  }

  const closeViewer = useCallback(() => {
    setViewer(null)
  }, [])

  useEffect(() => {
    const u = viewer?.url
    return () => {
      if (u) URL.revokeObjectURL(u)
    }
  }, [viewer?.url])

  const onView = async (meta: AdminStoredDocumentMeta) => {
    setOpeningViewerId(meta.id)
    try {
      const blob = await getAdminDocumentBlob(meta.id)
      if (!blob) {
        setToast({ open: true, title: 'Ошибка', message: 'Файл не найден в хранилище.' })
        return
      }
      const normalized = normalizePreviewBlobForPreview(meta.fileName, meta.mimeType, blob)
      const url = URL.createObjectURL(normalized)
      const effectiveMime = normalized.type || meta.mimeType || 'application/octet-stream'
      const pdfFile = isPdfEffectiveMime(effectiveMime, meta.fileName) ? normalized : undefined
      setViewer({ meta, url, effectiveMime, pdfFile })
    } catch (e) {
      setToast({
        open: true,
        title: 'Ошибка',
        message: e instanceof Error ? e.message : 'Не удалось открыть предпросмотр.',
      })
    } finally {
      setOpeningViewerId(null)
    }
  }

  const onDownload = async (meta: AdminStoredDocumentMeta) => {
    try {
      const blob = await getAdminDocumentBlob(meta.id)
      if (!blob) {
        setToast({ open: true, title: 'Ошибка', message: 'Файл не найден в хранилище.' })
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = meta.fileName
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      setToast({
        open: true,
        title: 'Ошибка',
        message: e instanceof Error ? e.message : 'Не удалось скачать файл.',
      })
    }
  }

  const onRemove = async (meta: AdminStoredDocumentMeta) => {
    if (!window.confirm(`Удалить «${documentDisplayName(meta.fileName)}»?`)) return
    try {
      await removeAdminDocument(meta.id)
      await refresh()
      setToast({ open: true, title: 'Готово', message: 'Файл удалён.' })
    } catch (e) {
      setToast({
        open: true,
        title: 'Ошибка',
        message: e instanceof Error ? e.message : 'Не удалось удалить файл.',
      })
    }
  }

  const onPatchVisibility = async (
    doc: AdminStoredDocumentMeta,
    patch: Partial<Pick<AdminStoredDocumentMeta, 'showInFooter' | 'showOnProductCards'>>,
  ) => {
    try {
      await patchAdminDocument(doc.id, patch)
      await refresh()
    } catch (e) {
      setToast({
        open: true,
        title: 'Ошибка',
        message: e instanceof Error ? e.message : 'Не удалось сохранить настройки отображения.',
      })
    }
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
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Архив</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Документы</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Загрузка файлов в браузер (IndexedDB). Данные хранятся только на этом устройстве; для обмена между
          компьютерами нужен сервер или экспорт. Включите показ на витрине — ссылки появятся в аккордеоне «Документы»
          на странице товара (после раздела «Уход»).
        </p>

        <section className={`${sectionClass} mt-8`}>
          <h2 className="text-sm font-semibold text-white">Загрузить файлы</h2>
          <p className="mt-1 text-xs text-gray-500">
            Перетащите файлы в область ниже или выберите с диска. Можно выбрать несколько за раз.
          </p>
          <div
            role="presentation"
            onDragEnter={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return
              setDragOver(false)
            }}
            onDrop={onDrop}
            className={`mt-4 flex min-h-[10rem] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
              dragOver
                ? 'border-indigo-500/70 bg-indigo-500/10'
                : 'border-white/15 bg-white/[0.02] hover:border-white/25'
            }`}
          >
            <DocumentIcon className="size-10 text-gray-500" aria-hidden />
            <p className="text-sm text-gray-400">
              {uploading ? 'Сохранение…' : 'Перетащите файлы сюда'}
            </p>
            <div>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="sr-only"
                aria-label="Выбрать файлы для загрузки"
                onChange={onInputChange}
                disabled={uploading}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className={inputBtnClass}
              >
                Выбрать файлы
              </button>
            </div>
          </div>
        </section>

        <section className={`${sectionClass} mt-6`}>
          <h2 className="text-sm font-semibold text-white">Сохранённые файлы</h2>
          {loadError ? (
            <p className="mt-2 text-sm text-rose-300">{loadError}</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Пока нет загруженных документов.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {items.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:flex-wrap sm:items-start"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <DocumentIcon className="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white" title={documentDisplayName(doc.fileName)}>
                        {documentDisplayName(doc.fileName)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatFileSizeRu(doc.sizeBytes)}
                        {doc.mimeType ? ` · ${doc.mimeType}` : null}
                        <span className="text-gray-600"> · {formatUploadedAt(doc.uploadedAtIso)}</span>
                      </p>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                          <input
                            type="checkbox"
                            checked={doc.showInFooter || doc.showOnProductCards}
                            onChange={(e) =>
                              void onPatchVisibility(doc, {
                                showInFooter: e.target.checked,
                                showOnProductCards: e.target.checked,
                              })
                            }
                            className={visibilityCheckboxClass}
                          />
                          <span>Показывать на странице товара (блок «Документы» под «Уход»)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <button
                      type="button"
                      disabled={openingViewerId === doc.id}
                      onClick={() => void onView(doc)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <EyeIcon className="size-4" aria-hidden />
                      {openingViewerId === doc.id ? 'Открытие…' : 'Просмотреть'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDownload(doc)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
                    >
                      <ArrowDownTrayIcon className="size-4" aria-hidden />
                      Скачать
                    </button>
                    <button
                      type="button"
                      onClick={() => void onRemove(doc)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-400 transition hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200"
                      aria-label={`Удалить ${documentDisplayName(doc.fileName)}`}
                    >
                      <TrashIcon className="size-4" aria-hidden />
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DocumentViewerDialog
        open={viewer != null}
        onClose={closeViewer}
        title={viewer ? `Просмотр: ${documentDisplayName(viewer.meta.fileName)}` : 'Просмотр'}
      >
        {viewer ? (
          <div className="flex min-h-0 flex-col">
            <DocumentPreviewSurface
              documentKey={viewer.meta.id}
              url={viewer.url}
              fileName={viewer.meta.fileName}
              effectiveMime={viewer.effectiveMime}
              pdfFile={viewer.pdfFile}
            />
            <p className="px-4 py-3 text-xs text-gray-500 sm:px-5">
              Просмотр через PDF.js на странице. Если не видно содержимое, нажмите «Скачать».
            </p>
          </div>
        ) : null}
      </DocumentViewerDialog>

      <ProfileSaveToast
        open={toast.open}
        onDismiss={() => setToast((t) => ({ ...t, open: false }))}
        title={toast.title || undefined}
        message={toast.message}
      />
    </div>
  )
}
