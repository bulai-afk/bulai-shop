import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, type ReactNode } from 'react'
import { DOCUMENT_VIEWER_DIALOG_BG } from '../constants/documentViewerTheme'
import { documentDisplayName } from '../utils/documentDisplayName'
import { getPageScrollElement } from '../utils/getPageScrollElement'
import { PdfJsDocumentPages } from './PdfJsDocumentPages'

const dialogBgStyle = { backgroundColor: DOCUMENT_VIEWER_DIALOG_BG } as const

/** block + border-0 убирает зазор под iframe; фон дублируем inline в разметке превью. */
const previewFrameClass =
  'm-0 block h-[min(75dvh,800px)] w-full min-h-[16rem] border-0 p-0 outline-none'

/** Без корректного MIME Chrome/Firefox часто не встраивают PDF из blob: URL. */
export function normalizePreviewBlobForPreview(
  fileName: string,
  declaredMime: string,
  blob: Blob,
): Blob {
  const t = blob.type?.trim().toLowerCase()
  if (t && t !== 'application/octet-stream') return blob
  const fromMeta = declaredMime?.trim().toLowerCase()
  if (fromMeta && fromMeta !== 'application/octet-stream') {
    return new Blob([blob], { type: fromMeta })
  }
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return new Blob([blob], { type: 'application/pdf' })
  return blob
}

export function isPdfEffectiveMime(mime: string, fileName: string): boolean {
  const m = mime.toLowerCase()
  if (m === 'application/pdf' || m === 'application/x-pdf') return true
  return fileName.toLowerCase().endsWith('.pdf')
}

export function DocumentPreviewSurface({
  documentKey,
  url,
  fileName,
  effectiveMime,
  pdfFile,
}: {
  documentKey: string
  url: string
  fileName: string
  effectiveMime: string
  /** Для PDF: исходный Blob с витрины/админки — ускоряет открытие */
  pdfFile?: Blob
}) {
  const pdf = isPdfEffectiveMime(effectiveMime, fileName)
  const label = documentDisplayName(fileName)
  if (pdf) {
    return (
      <div className="min-w-0" style={dialogBgStyle}>
        <PdfJsDocumentPages
          documentKey={documentKey}
          url={url}
          title={label}
          pdfFile={pdfFile}
        />
      </div>
    )
  }
  return (
    <div className="min-w-0" style={dialogBgStyle}>
      <iframe title={label} src={url} className={previewFrameClass} style={dialogBgStyle} />
    </div>
  )
}

/**
 * Модалка просмотра документа (как в админке «Документы»): без transform/filter на панели —
 * иначе встроенный PDF в Chrome часто пустой.
 */
export function DocumentViewerDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const el = getPageScrollElement()
    const prevOverflow = el.style.overflow
    el.style.overflow = 'hidden'
    return () => {
      el.style.overflow = prevOverflow
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[130]">
      <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      {/* items-start: иначе при подгрузке PDF высота панели растёт и flex перецентрирует — визуально «дёргается». */}
      <div className="fixed inset-0 flex min-h-0 items-start justify-center overflow-hidden overscroll-none px-3 pb-3 pt-8 sm:px-4 sm:pb-4 sm:pt-12">
        <DialogPanel
          className="relative flex max-h-[min(92dvh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-[#0d1b2a] shadow-2xl shadow-black/50 ring-1 ring-white/10 outline-none"
          style={{ transform: 'none', filter: 'none', perspective: 'none', ...dialogBgStyle }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-[1] rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <XMarkIcon className="size-5" aria-hidden />
          </button>
          <DialogTitle className="min-w-0 shrink-0 px-4 pt-4 pr-14 text-lg font-semibold tracking-tight text-white sm:px-5 sm:pt-5 sm:text-xl">
            {title}
          </DialogTitle>
          <div
            className="min-h-0 min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable]"
            style={dialogBgStyle}
          >
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
