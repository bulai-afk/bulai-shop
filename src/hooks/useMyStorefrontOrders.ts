import { useCallback, useEffect, useState } from 'react'
import { loadClientsDraft, loadOrdersDraft, ORDERS_UPDATED_EVENT } from '../admin/lib/adminDraftStorage'
import { fetchMyStorefrontOrders } from '../api/storefrontOrdersApi'
import { isSiteConfigApiExpected } from '../constants/apiBase'
import { resolveClientIdForEmail } from '../lib/createOrderFromCheckout'
import type { StorefrontOrder } from '../types/storefrontOrder'
import { adminOrdersToStorefrontOrders } from '../utils/orderStorefrontMapping'

function loadLocalStorefrontOrders(email: string): StorefrontOrder[] {
  const clients = loadClientsDraft()
  const clientId = resolveClientIdForEmail(clients, email)
  const draft = loadOrdersDraft()
  return adminOrdersToStorefrontOrders(draft, email, clientId, clients)
}

function normalizeApiOrder(row: StorefrontOrder): StorefrontOrder {
  return {
    ...row,
    lines: Array.isArray(row.lines) ? row.lines : [],
  }
}

function mergeOrders(remote: StorefrontOrder[], local: StorefrontOrder[]): StorefrontOrder[] {
  const byKey = new Map<string, StorefrontOrder>()
  for (const o of local) {
    byKey.set(o.id ?? o.orderNumber, o)
  }
  for (const o of remote) {
    byKey.set(o.id ?? o.orderNumber, o)
  }
  return [...byKey.values()].sort((a, b) => b.placedIso.localeCompare(a.placedIso))
}

export function useMyStorefrontOrders(sessionJwt: string | null, userEmail: string | undefined) {
  const [orders, setOrders] = useState<StorefrontOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    const email = userEmail?.trim()
    if (!email) {
      setOrders([])
      setError(false)
      return
    }

    const local = loadLocalStorefrontOrders(email)
    setOrders(local)
    setLoading(true)
    setError(false)

    const useApi = isSiteConfigApiExpected() && Boolean(sessionJwt)
    if (!useApi) {
      setLoading(false)
      return
    }

    try {
      const remote = (await fetchMyStorefrontOrders(sessionJwt!)).map(normalizeApiOrder)
      const merged = mergeOrders(remote, local)
      setOrders(merged.length > 0 ? merged : local)
      setError(false)
    } catch {
      setOrders(local)
      setError(local.length === 0)
    } finally {
      setLoading(false)
    }
  }, [sessionJwt, userEmail])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onUpdate = () => {
      void load()
    }
    window.addEventListener(ORDERS_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(ORDERS_UPDATED_EVENT, onUpdate)
  }, [load])

  return { orders, loading, error, reload: load }
}
