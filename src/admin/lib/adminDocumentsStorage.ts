/** Метаданные файла в разделе «Документы» (сам файл — Blob в IndexedDB). */
export type AdminStoredDocumentMeta = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  uploadedAtIso: string
  /** Витрина: аккордеон «Документы» на странице товара (в админке синхронизируется с `showOnProductCards`). */
  showInFooter: boolean
  showOnProductCards: boolean
}

type StoredRecord = Omit<AdminStoredDocumentMeta, 'showInFooter' | 'showOnProductCards'> & {
  blob: Blob
  showInFooter?: boolean
  showOnProductCards?: boolean
}

const DB_NAME = 'bulai-shop-admin-documents-v1'
const STORE = 'documents'

export const ADMIN_DOCUMENTS_UPDATED_EVENT = 'bulai-shop-admin-documents-updated'

function dispatchUpdated() {
  window.dispatchEvent(new Event(ADMIN_DOCUMENTS_UPDATED_EVENT))
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
}

export async function listAdminDocuments(): Promise<AdminStoredDocumentMeta[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const rows = req.result as StoredRecord[]
      const meta = rows.map((row) => ({
        id: row.id,
        fileName: row.fileName,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        uploadedAtIso: row.uploadedAtIso,
        showInFooter: row.showInFooter === true,
        showOnProductCards: row.showOnProductCards === true,
      }))
      meta.sort((a, b) => b.uploadedAtIso.localeCompare(a.uploadedAtIso))
      resolve(meta)
    }
    req.onerror = () => reject(req.error ?? new Error('listAdminDocuments failed'))
  })
}

export async function getAdminDocumentBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => {
      const row = req.result as StoredRecord | undefined
      resolve(row?.blob)
    }
    req.onerror = () => reject(req.error ?? new Error('getAdminDocumentBlob failed'))
  })
}

export async function addAdminDocument(file: File): Promise<AdminStoredDocumentMeta> {
  const id = crypto.randomUUID()
  const record: StoredRecord = {
    id,
    fileName: file.name || 'файл',
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    uploadedAtIso: new Date().toISOString(),
    showInFooter: false,
    showOnProductCards: false,
    blob: file,
  }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('addAdminDocument failed'))
    const req = tx.objectStore(STORE).put(record)
    req.onerror = () => reject(req.error ?? new Error('put failed'))
  })
  dispatchUpdated()
  return {
    id: record.id,
    fileName: record.fileName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    uploadedAtIso: record.uploadedAtIso,
    showInFooter: record.showInFooter === true,
    showOnProductCards: record.showOnProductCards === true,
  }
}

export async function patchAdminDocument(
  id: string,
  patch: Partial<Pick<AdminStoredDocumentMeta, 'showInFooter' | 'showOnProductCards'>>,
): Promise<void> {
  const db = await openDb()
  const row = await new Promise<StoredRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as StoredRecord | undefined)
    req.onerror = () => reject(req.error ?? new Error('get failed'))
  })
  if (!row) throw new Error('Документ не найден')
  const next: StoredRecord = {
    ...row,
    showInFooter:
      patch.showInFooter !== undefined ? patch.showInFooter : row.showInFooter === true,
    showOnProductCards:
      patch.showOnProductCards !== undefined
        ? patch.showOnProductCards
        : row.showOnProductCards === true,
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('patchAdminDocument failed'))
    const req = tx.objectStore(STORE).put(next)
    req.onerror = () => reject(req.error ?? new Error('put failed'))
  })
  dispatchUpdated()
}

export async function removeAdminDocument(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('removeAdminDocument failed'))
    const req = tx.objectStore(STORE).delete(id)
    req.onerror = () => reject(req.error ?? new Error('delete failed'))
  })
  dispatchUpdated()
}
