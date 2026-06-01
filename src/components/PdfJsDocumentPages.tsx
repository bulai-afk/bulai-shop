import { Document, Page } from 'react-pdf'
import { useCallback, useEffect, useRef, useState } from 'react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { DOCUMENT_VIEWER_DIALOG_BG } from '../constants/documentViewerTheme'
import '../lib/pdfJsWorker'

const shellStyle = { backgroundColor: DOCUMENT_VIEWER_DIALOG_BG } as const

type PdfJsDocumentPagesProps = {
  /** Стабильный ключ для смены документа */
  documentKey: string
  /** Резервный источник (blob: URL), если нет pdfFile */
  url: string
  title: string
  /** Нормализованный Blob из IndexedDB — быстрее, чем снова разбирать blob: URL */
  pdfFile?: Blob
}

/**
 * Рендер PDF через PDF.js — фон вокруг страниц задаётся нами (как у диалога),
 * в отличие от встроенного просмотрщика браузера в &lt;object&gt;/&lt;iframe&gt;.
 */
export function PdfJsDocumentPages({ documentKey, url, title, pdfFile }: PdfJsDocumentPagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const [pageWidth, setPageWidth] = useState(720)
  const [numPages, setNumPages] = useState<number | null>(null)

  useEffect(() => {
    setNumPages(null)
  }, [documentKey])

  const measure = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const cw = el.clientWidth
    if (cw <= 0) return
    const next = Math.max(160, Math.min(900, cw - 8))
    setPageWidth((prev) => (Math.abs(prev - next) >= 4 ? next : prev))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(() => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        measure()
      })
    })
    ro.observe(el)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [measure])

  return (
    <div
      ref={containerRef}
      className="flex min-h-[min(75dvh,800px)] min-w-0 flex-col items-center gap-4 py-3"
      style={shellStyle}
    >
      <Document
        key={documentKey}
        file={pdfFile ?? url}
        loading={
          <div
            className="flex min-h-[min(75dvh,800px)] w-full items-center justify-center"
            style={shellStyle}
            aria-busy="true"
            aria-label="Загрузка документа"
          >
            <span className="sr-only">Загрузка документа</span>
          </div>
        }
        error={
          <p className="px-4 py-10 text-center text-sm text-rose-300" style={shellStyle}>
            Не удалось открыть «{title}».
          </p>
        }
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
      >
        {numPages != null
          ? Array.from({ length: numPages }, (_, i) => (
              <Page
                key={i + 1}
                pageNumber={i + 1}
                width={pageWidth}
                className="!bg-transparent shadow-md shadow-black/40"
                renderTextLayer
                renderAnnotationLayer
              />
            ))
          : null}
      </Document>
    </div>
  )
}
