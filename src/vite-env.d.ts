/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YANDEX_CLIENT_ID?: string
  /** Полный URL этой страницы, как в Redirect URI в кабинете Яндекс OAuth */
  readonly VITE_YANDEX_REDIRECT_URI?: string
  /**
   * Базовый URL до `/info` (прокси на бэкенде), если прямой запрос к login.yandex.ru блокируется CORS.
   * Пример: https://api.example.com/yandex/user (должен проксировать на login.yandex.ru/info).
   */
  readonly VITE_YANDEX_INFO_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  /** Страница callback с sdk-suggest-token */
  YaSendSuggestToken?: (parentPageOrigin: string, options?: Record<string, unknown>) => void
  YaAuthSuggest?: {
    init: (
      oauth: { client_id: string; response_type: string; redirect_uri: string },
      tokenPageOrigin: string,
      suggest?: Record<string, unknown>,
    ) => Promise<
      | { status: 'ok'; handler: () => Promise<unknown> }
      | { status: 'error'; code: string }
    >
  }
}
