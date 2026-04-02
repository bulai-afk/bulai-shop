import { useLayoutEffect, useRef } from 'react'

type YandexLoginButtonProps = {
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
  parentId,
  buttonSize = 'm',
  className = '',
}: YandexLoginButtonProps) {
  const clientId = import.meta.env.VITE_YANDEX_CLIENT_ID?.trim()
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!clientId) return

    const origin = window.location.origin
    const redirectUri =
      import.meta.env.VITE_YANDEX_REDIRECT_URI?.trim() || `${origin}/auth/yandex/callback`

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

    run()

    return () => {
      cancelled = true
      containerRef.current?.replaceChildren()
    }
  }, [clientId, parentId, buttonSize])

  if (!clientId) {
    return null
  }

  return (
    <div
      ref={containerRef}
      id={parentId}
      className={`flex min-h-[40px] min-w-[200px] items-center justify-center [&_iframe]:max-w-full ${className}`.trim()}
    />
  )
}
