import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAdminClientsFromApi, fetchAdminOrdersFromApi, putAdminClientsToApi, putAdminOrdersToApi } from '../../api/adminDataApi'
import { isSiteConfigApiExpected } from '../../constants/apiBase'
import { AdminOperationsCalendar } from '../components/AdminOperationsCalendar'
import { AdminOrderPreviewDialog } from '../components/AdminOrderPreviewDialog'
import {
  CLIENTS_UPDATED_EVENT,
  loadClientsDraft,
  loadOrdersDraft,
  loadProductsInventoryDraft,
  ORDERS_UPDATED_EVENT,
  PRODUCTS_INVENTORY_UPDATED_EVENT,
  saveClientsDraft,
  saveOrdersDraft,
} from '../lib/adminDraftStorage'
import type { AdminClientRow } from '../types/adminClients'
import type { AdminOrderRow } from '../types/adminOrders'
import type { ProductsInventoryDraft } from '../types/siteSettings'

const sectionClass =
  'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'

export function AdminCalendarPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [clients, setClients] = useState<AdminClientRow[]>([])
  const [draft, setDraft] = useState<ProductsInventoryDraft>(() => loadProductsInventoryDraft())
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const persistOrdersFromPreview = useCallback((next: AdminOrderRow[]) => {
    saveOrdersDraft(next)
    if (isSiteConfigApiExpected()) {
      void putAdminOrdersToApi(next).catch(() => {
        /* фоновая синхронизация */
      })
    }
  }, [])

  const persistClientsFromPreview = useCallback((next: AdminClientRow[]) => {
    if (isSiteConfigApiExpected()) {
      void putAdminClientsToApi(next).catch(() => {
        /* фоновая синхронизация */
      })
    }
  }, [])

  useEffect(() => {
    setOrders(loadOrdersDraft())
    setClients(loadClientsDraft())
    setDraft(loadProductsInventoryDraft())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isSiteConfigApiExpected()) return
    let cancelled = false
    ;(async () => {
      try {
        const [remoteOrders, remoteClients] = await Promise.all([
          fetchAdminOrdersFromApi(),
          fetchAdminClientsFromApi(),
        ])
        if (cancelled) return
        if (remoteOrders != null && Array.isArray(remoteOrders.orders)) {
          saveOrdersDraft(remoteOrders.orders)
          setOrders(loadOrdersDraft())
        }
        if (remoteClients != null && Array.isArray(remoteClients.clients)) {
          saveClientsDraft(remoteClients.clients)
          setClients(loadClientsDraft())
        }
      } catch {
        /* остаётся черновик из localStorage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const syncOrders = () => setOrders(loadOrdersDraft())
    const syncDraft = () => setDraft(loadProductsInventoryDraft())
    const syncClients = () => setClients(loadClientsDraft())
    window.addEventListener('storage', syncOrders)
    window.addEventListener('storage', syncDraft)
    window.addEventListener('storage', syncClients)
    window.addEventListener(ORDERS_UPDATED_EVENT, syncOrders)
    window.addEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, syncDraft)
    window.addEventListener(CLIENTS_UPDATED_EVENT, syncClients)
    return () => {
      window.removeEventListener('storage', syncOrders)
      window.removeEventListener('storage', syncDraft)
      window.removeEventListener('storage', syncClients)
      window.removeEventListener(ORDERS_UPDATED_EVENT, syncOrders)
      window.removeEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, syncDraft)
      window.removeEventListener(CLIENTS_UPDATED_EVENT, syncClients)
    }
  }, [])

  if (!mounted) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-400">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Планирование</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Календарь</h1>
        <p className="mt-2 max-w-prose text-sm text-gray-400">
          Поставки по дате поступления и заказы по дате доставки (или дате создания). Заказ при смене этапа не
          дублируется — в сетке только актуальное состояние. Нажмите карточку поставки или заказа, чтобы открыть
          соответствующее окно.
        </p>

        <section className={`${sectionClass} mt-8`}>
          <AdminOperationsCalendar
            orders={orders}
            supplies={draft.supplies}
            suppliers={draft.suppliers}
            onOpenOrder={setPreviewOrderId}
            onOpenSupply={(rec) =>
              navigate('/admin/products/stocks', { state: { openSupplyId: rec.id } })
            }
          />
        </section>
      </div>

      <AdminOrderPreviewDialog
        open={previewOrderId != null}
        onClose={() => setPreviewOrderId(null)}
        orderId={previewOrderId}
        orders={orders}
        onOrdersChange={setOrders}
        clients={clients}
        onClientsChange={setClients}
        productsInventoryDraft={draft}
        persistHint="Правки сохраняются в черновик заказов и синхронизируются с базой при каждом изменении."
        onPersistOrdersDraft={persistOrdersFromPreview}
        onPersistClientsDraft={persistClientsFromPreview}
      />
    </div>
  )
}
