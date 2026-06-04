import { useLayoutEffect, useRef, useState } from 'react'
import { buildYandexOAuthAuthorizeUrl } from '../utils/yandexOAuthUrl'

type YandexLoginButtonProps = {
  clientId: string
  redirectUri: string
  /** id контейнера, куда SDK вставит кнопку */
  parentId: string
  buttonSize?: 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl'
  className?: string
}

/**
 * Кнопка «Войти с Яндексом» (мгновенный вход).
 * Скрипт sdk-suggest в index.html; Redirect URI = public/auth/yandex/callback.html
 * (URL без .html: /auth/yandex/callback — см. vite.config.ts).
 */
export function YandexLoginButton({
  clientId,
  redirectUri,
  parentId,
  buttonSize = 'm',
  className = '',
}: YandexLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showFallback, setShowFallback] = useState(false)

  useLayoutEffect(() => {
    setShowFallback(false)
    const origin = window.location.origin

    let cancelled = false
    let attempt = 0
    const maxAttempts = 600

    const run = () => {
      if (cancelled) return
      const Ya = window.YaAuthSuggest
      const mount = containerRef.current
      if (!Ya?.init || !mount) {
        if (++attempt < maxAttempts) {
          requestAnimationFrame(run)
        } else if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[YandexLoginButton] SDK или контейнер не готов:', parentId)
        }
        return
      }

      Ya.init(
        {
          client_id: clientId,
          response_type: 'token',
          redirect_uri: redirectUri,
        },
        origin,
        {
          view: 'button',
          parentId,
          buttonView: 'main',
          buttonTheme: 'dark',
          buttonSize,
          buttonBorderRadius: 8,
        },
      )
        .then((result) => {
          if (cancelled) return
          if (result.status !== 'ok') {
            throw new Error(String(result.code ?? 'YaAuthSuggest error'))
          }
          return result.handler()
        })
        .then((data) => {
          if (cancelled || data === undefined) return
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('[Yandex ID] токен / данные:', data)
          }
          window.dispatchEvent(new CustomEvent('yandex-auth-suggest', { detail: data }))
        })
        .catch((err) => {
          if (!cancelled && import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn('[Yandex ID]', err)
          }
        })
    }

    const startId = window.setTimeout(run, 0)

    const fallbackTimer = window.setTimeout(() => {
      if (cancelled) return
      const el = containerRef.current
      const hasWidget =
        el &&
        (el.querySelector('iframe') ||
          el.querySelector('button') ||
          el.querySelector('a') ||
          el.childElementCount > 0)
      if (!hasWidget) setShowFallback(true)
    }, 2500)

    return () => {
      cancelled = true
      window.clearTimeout(startId)
      window.clearTimeout(fallbackTimer)
      containerRef.current?.replaceChildren()
    }
  }, [clientId, redirectUri, parentId, buttonSize])

  const fallbackHref = buildYandexOAuthAuthorizeUrl(clientId, redirectUri)

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`.trim()}>
      <div
        ref={containerRef}
        id={parentId}
        className="flex min-h-[48px] min-w-[220px] items-center justify-center [&_iframe]:max-w-full"
      />
      {showFallback ? (
        <a
          href={fallbackHref}
          className="inline-flex min-h-[44px] min-w-[220px] items-center justify-center rounded-lg bg-[#fc3f1d] px-5 text-sm font-medium text-white transition hover:bg-[#e6381a]"
        >
          Войти с Яндекс ID
        </a>
      ) : null}
    </div>
  )
}
