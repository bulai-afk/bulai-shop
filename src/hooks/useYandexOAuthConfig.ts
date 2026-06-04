import { useEffect, useMemo, useState } from 'react'
import { fetchYandexOAuthPublicConfig } from '../api/yandexOAuthConfigApi'

export function useYandexOAuthConfig() {
  const viteClientId = import.meta.env.VITE_YANDEX_CLIENT_ID?.trim() ?? ''
  const viteRedirect = import.meta.env.VITE_YANDEX_REDIRECT_URI?.trim() ?? ''
  const [remoteClientId, setRemoteClientId] = useState('')
  const [remoteRedirect, setRemoteRedirect] = useState('')
  const [remoteLoaded, setRemoteLoaded] = useState(Boolean(viteClientId))

  useEffect(() => {
    if (viteClientId) return
    let cancelled = false
    void fetchYandexOAuthPublicConfig().then((cfg) => {
      if (cancelled || !cfg) {
        if (!cancelled) setRemoteLoaded(true)
        return
      }
      if (cfg.clientId) setRemoteClientId(cfg.clientId)
      if (cfg.redirectUri) setRemoteRedirect(cfg.redirectUri)
      setRemoteLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [viteClientId])

  return useMemo(() => {
    const clientId = viteClientId || remoteClientId
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const redirectUri = viteRedirect || remoteRedirect || (origin ? `${origin}/auth/yandex/callback` : '')
    return {
      clientId,
      redirectUri,
      configured: Boolean(clientId),
      ready: remoteLoaded,
    }
  }, [viteClientId, viteRedirect, remoteClientId, remoteRedirect, remoteLoaded])
}
