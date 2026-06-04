import { loadSnapshotDoc, saveSnapshotDoc } from './adminSnapshotStore.js'

const TABLE = 'admin_clients_snapshot'

export async function loadClientsDoc(): Promise<{ clients: unknown[] }> {
  const payload = await loadSnapshotDoc(TABLE)
  if (payload == null || typeof payload !== 'object' || payload === null) {
    return { clients: [] }
  }
  const c = (payload as { clients?: unknown }).clients
  if (!Array.isArray(c)) return { clients: [] }
  return { clients: c }
}

export async function saveClientsDoc(doc: { clients: unknown[] }): Promise<void> {
  await saveSnapshotDoc(
    TABLE,
    doc,
    'clients',
    `clients=${doc.clients.length} (storefront profile)`,
  )
}

export function normalizeEmail(e: string): string {
  return e.trim().toLowerCase()
}

export function findClientIndexByEmail(clients: unknown[], email: string): number {
  const n = normalizeEmail(email)
  return clients.findIndex(
    (c) =>
      c != null &&
      typeof c === 'object' &&
      typeof (c as { email?: unknown }).email === 'string' &&
      normalizeEmail((c as { email: string }).email) === n,
  )
}

export function clientIdFromDoc(clients: unknown[], email: string): string | undefined {
  const idx = findClientIndexByEmail(clients, email)
  if (idx < 0) return undefined
  const row = clients[idx] as { id?: unknown }
  return typeof row.id === 'string' ? row.id : undefined
}
