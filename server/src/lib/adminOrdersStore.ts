import { loadSnapshotDoc, saveSnapshotDoc } from './adminSnapshotStore.js'

const TABLE = 'admin_orders_snapshot'

export async function loadOrdersDoc(): Promise<{ orders: unknown[] }> {
  const payload = await loadSnapshotDoc(TABLE)
  if (payload == null || typeof payload !== 'object' || payload === null) {
    return { orders: [] }
  }
  const o = (payload as { orders?: unknown }).orders
  if (!Array.isArray(o)) return { orders: [] }
  return { orders: o }
}

export async function saveOrdersDoc(doc: { orders: unknown[] }): Promise<void> {
  await saveSnapshotDoc(TABLE, doc, 'orders', `orders=${doc.orders.length}`)
}
