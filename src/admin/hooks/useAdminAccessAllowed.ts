import { useEffect, useMemo, useState } from 'react'
import { fetchAdminClientsFromApi } from '../../api/adminDataApi'
import { fetchSiteConfigFromApi } from '../../api/siteConfigApi'
import { SITE_CONFIG_UPDATED_EVENT } from '../../constants/siteConfigStorage'
import { useAuth } from '../../context/AuthContext'
import { isUserGrantedAdminAccess } from '../lib/adminAccessUtils'
import {
  loadClientsDraft,
  loadSiteConfigDraft,
  CLIENTS_UPDATED_EVENT,
  saveClientsDraft,
  saveSiteConfigDraft,
} from '../lib/adminDraftStorage'

/**
 * Разрешён ли вход в админку текущему пользователю.
 * Только если в настройках сайта указаны id клиентов-администраторов и пользователь совпадает с одной из карточек.
 */
export function useAdminAccessAllowed(): { allowed: boolean; checking: boolean } {
  const { user, hydrated } = useAuth()
  const [tick, setTick] = useState(0)
  const [remoteReady, setRemoteReady] = useState(false)

  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    window.addEventListener(SITE_CONFIG_UPDATED_EVENT, bump)
    window.addEventListener(CLIENTS_UPDATED_EVENT, bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener(SITE_CONFIG_UPDATED_EVENT, bump)
      window.removeEventListener(CLIENTS_UPDATED_EVENT, bump)
      window.removeEventListener('storage', bump)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [config, clientsDoc] = await Promise.all([
          fetchSiteConfigFromApi(),
          fetchAdminClientsFromApi(),
        ])
        if (cancelled) return
        if (config) saveSiteConfigDraft(config)
        if (clientsDoc?.clients) saveClientsDraft(clientsDoc.clients)
      } catch {
        /* офлайн / API недоступен — остаёмся на localStorage */
      } finally {
        if (!cancelled) setRemoteReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const allowed = useMemo(() => {
    if (!hydrated) return false
    const config = loadSiteConfigDraft()
    const ids = config.adminAccessClientIds ?? []
    const clients = loadClientsDraft()
    return isUserGrantedAdminAccess(user, ids, clients)
  }, [user, hydrated, tick, remoteReady])

  return { allowed, checking: hydrated && !remoteReady }
}
