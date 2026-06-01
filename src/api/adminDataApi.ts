import { publicApiUrl } from '../constants/apiBase'
import type { AdminClientRow } from '../admin/types/adminClients'
import type { AdminOrderRow } from '../admin/types/adminOrders'
import type { ProductsDictionariesDraft, ProductsInventoryDraft } from '../admin/types/siteSettings'

type DataResponse<T> = { data: T | null }

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(publicApiUrl(path), { cache: 'no-store' })
  if (!res.ok) throw new Error(`${path} get ${res.status}`)
  const body = (await res.json()) as DataResponse<T>
  return body.data ?? null
}

async function putJson(path: string, body: unknown): Promise<void> {
  const res = await fetch(publicApiUrl(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} put ${res.status}`)
}

export async function fetchAdminProductsInventoryFromApi(): Promise<ProductsInventoryDraft | null> {
  return getJson<ProductsInventoryDraft>('/api/admin/data/products-inventory')
}

export async function putAdminProductsInventoryToApi(draft: ProductsInventoryDraft): Promise<void> {
  await putJson('/api/admin/data/products-inventory', draft)
}

export async function fetchAdminProductsDictionariesFromApi(): Promise<ProductsDictionariesDraft | null> {
  return getJson<ProductsDictionariesDraft>('/api/admin/data/products-dictionaries')
}

export async function putAdminProductsDictionariesToApi(draft: ProductsDictionariesDraft): Promise<void> {
  await putJson('/api/admin/data/products-dictionaries', draft)
}

export async function fetchAdminClientsFromApi(): Promise<{ clients: AdminClientRow[] } | null> {
  return getJson<{ clients: AdminClientRow[] }>('/api/admin/data/clients')
}

export async function putAdminClientsToApi(clients: AdminClientRow[]): Promise<void> {
  await putJson('/api/admin/data/clients', { clients })
}

export async function fetchAdminOrdersFromApi(): Promise<{ orders: AdminOrderRow[] } | null> {
  return getJson<{ orders: AdminOrderRow[] }>('/api/admin/data/orders')
}

export async function putAdminOrdersToApi(orders: AdminOrderRow[]): Promise<void> {
  await putJson('/api/admin/data/orders', { orders })
}
