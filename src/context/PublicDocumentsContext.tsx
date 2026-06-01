import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  DocumentPreviewSurface,
  DocumentViewerDialog,
  isPdfEffectiveMime,
  normalizePreviewBlobForPreview,
} from '../components/DocumentViewerDialog'
import { schedulePdfJsWarmup } from '../lib/schedulePdfJsWarmup'
import {
  ADMIN_DOCUMENTS_UPDATED_EVENT,
  getAdminDocumentBlob,
  listAdminDocuments,
} from '../admin/lib/adminDocumentsStorage'
import { documentDisplayName } from '../utils/documentDisplayName'

export type PublicDocumentLink = {
  id: string
  label: string
  href: string
  downloadName: string
  mimeType: string
  effectiveMime: string
  /** Для PDF: тот же Blob, что и у blob: URL — для быстрого открытия в PDF.js */
  pdfSource?: Blob
}

type PublicDocumentsContextValue = {
  /** Документы для аккордеона «Документы» на странице товара (флаги в админке). */
  productPageDocumentLinks: PublicDocumentLink[]
  openDocumentInViewer: (link: PublicDocumentLink) => void
}

const PublicDocumentsContext = createContext<PublicDocumentsContextValue | null>(null)

export function PublicDocumentsProvider({ children }: { children: ReactNode }) {
  const [productPageDocumentLinks, setProductPageDocumentLinks] = useState<PublicDocumentLink[]>([])
  const [viewerLink, setViewerLink] = useState<PublicDocumentLink | null>(null)
  const [tick, setTick] = useState(0)
  const linksRef = useRef<PublicDocumentLink[]>([])

  const openDocumentInViewer = useCallback((link: PublicDocumentLink) => {
    setViewerLink(link)
  }, [])

  const closeDocumentViewer = useCallback(() => {
    setViewerLink(null)
  }, [])

  const reload = useCallback(async () => {
    try {
      const list = await listAdminDocuments()
      const publicSubset = list.filter((d) => d.showInFooter || d.showOnProductCards)

      const links: PublicDocumentLink[] = []
      for (const d of publicSubset) {
        const blob = await getAdminDocumentBlob(d.id)
        if (!blob) continue
        const normalized = normalizePreviewBlobForPreview(d.fileName, d.mimeType, blob)
        const url = URL.createObjectURL(normalized)
        const effectiveMime =
          normalized.type?.trim() || d.mimeType?.trim() || 'application/octet-stream'
        links.push({
          id: d.id,
          label: documentDisplayName(d.fileName),
          href: url,
          downloadName: d.fileName,
          mimeType: d.mimeType,
          effectiveMime,
          pdfSource: isPdfEffectiveMime(effectiveMime, d.fileName) ? normalized : undefined,
        })
      }

      linksRef.current.forEach((l) => URL.revokeObjectURL(l.href))
      linksRef.current = links
      setProductPageDocumentLinks(links)
    } catch {
      linksRef.current.forEach((l) => URL.revokeObjectURL(l.href))
      linksRef.current = []
      setProductPageDocumentLinks([])
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload, tick])

  useEffect(() => {
    schedulePdfJsWarmup()
  }, [])

  useEffect(() => {
    const onDoc = () => setTick((t) => t + 1)
    window.addEventListener(ADMIN_DOCUMENTS_UPDATED_EVENT, onDoc)
    return () => window.removeEventListener(ADMIN_DOCUMENTS_UPDATED_EVENT, onDoc)
  }, [])

  useEffect(() => {
    return () => {
      linksRef.current.forEach((l) => URL.revokeObjectURL(l.href))
    }
  }, [])

  const value = useMemo(
    () => ({ productPageDocumentLinks, openDocumentInViewer }),
    [productPageDocumentLinks, openDocumentInViewer],
  )

  return (
    <PublicDocumentsContext.Provider value={value}>
      {children}
      <DocumentViewerDialog
        open={viewerLink != null}
        onClose={closeDocumentViewer}
        title={
          viewerLink ? `Просмотр: ${documentDisplayName(viewerLink.downloadName)}` : 'Просмотр'
        }
      >
        {viewerLink ? (
          <div className="flex min-h-0 flex-col">
            <DocumentPreviewSurface
              documentKey={viewerLink.id}
              url={viewerLink.href}
              fileName={viewerLink.downloadName}
              effectiveMime={viewerLink.effectiveMime}
              pdfFile={viewerLink.pdfSource}
            />
            <p className="px-4 py-3 text-xs text-gray-500 sm:px-5">
              Прокрутите вниз, чтобы просмотреть все страницы. Текст в документе можно выделять и
              копировать.
            </p>
          </div>
        ) : null}
      </DocumentViewerDialog>
    </PublicDocumentsContext.Provider>
  )
}

export function usePublicDocuments(): PublicDocumentsContextValue {
  const ctx = useContext(PublicDocumentsContext)
  if (!ctx) {
    return { productPageDocumentLinks: [], openDocumentInViewer: () => {} }
  }
  return ctx
}
