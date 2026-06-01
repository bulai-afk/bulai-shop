import { useEffect, useMemo, useState } from 'react'
import { SITE_CONFIG_UPDATED_EVENT } from '../../constants/siteConfigStorage'
import { useAuth } from '../../context/AuthContext'
import { isUserGrantedAdminAccess } from '../lib/adminAccessUtils'
import { loadClientsDraft, loadSiteConfigDraft, CLIENTS_UPDATED_EVENT } from '../lib/adminDraftStorage'

/**
 * Разрешён ли вход в админку текущему пользователю.
 * Только если в настройках сайта указаны id клиентов-администраторов и пользователь совпадает с одной из карточек.
 */
export function useAdminAccessAllowed(): boolean {
  const { user, hydrated } = useAuth()
  const [tick, setTick] = useState(0)

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

  return useMemo(() => {
    if (!hydrated) return false
    const config = loadSiteConfigDraft()
    const ids = config.adminAccessClientIds ?? []
    const clients = loadClientsDraft()
    return isUserGrantedAdminAccess(user, ids, clients)
  }, [user, hydrated, tick])
}
