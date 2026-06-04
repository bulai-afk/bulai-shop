import { useEffect, useMemo, useState } from 'react'
import { fetchYandexOAuthPublicConfig } from '../api/yandexOAuthConfigApi'
import { useStorefrontSiteConfig } from '../context/StorefrontSettingsContext'

export function useYandexOAuthConfig() {
  const site = useStorefrontSiteConfig()
  const siteClientId = site.yandexOAuthClientId?.trim() ?? ''
  const viteClientId = import.meta.env.VITE_YANDEX_CLIENT_ID?.trim() ?? ''
  const viteRedirect = import.meta.env.VITE_YANDEX_REDIRECT_URI?.trim() ?? ''
  const [remoteClientId, setRemoteClientId] = useState('')
  const [remoteRedirect, setRemoteRedirect] = useState('')
  const [remoteLoaded, setRemoteLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchYandexOAuthPublicConfig()
      .then((cfg) => {
        if (cancelled) return
        if (cfg?.clientId) setRemoteClientId(cfg.clientId)
        if (cfg?.redirectUri) setRemoteRedirect(cfg.redirectUri)
      })
      .finally(() => {
        if (!cancelled) setRemoteLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => {
    const clientId = viteClientId || remoteClientId || siteClientId
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const redirectUri = viteRedirect || remoteRedirect || (origin ? `${origin}/auth/yandex/callback` : '')
    const ready = remoteLoaded || Boolean(viteClientId || siteClientId)
    return {
      clientId,
      redirectUri,
      configured: Boolean(clientId),
      ready,
    }
  }, [
    viteClientId,
    viteRedirect,
    remoteClientId,
    remoteRedirect,
    remoteLoaded,
    siteClientId,
  ])
}
