/**
 * Проверка OAuth-токена Яндекса на сервере (выдача JWT сессии).
 * @see https://yandex.com/dev/id/doc/en/user-information
 */
export type YandexLoginInfoJson = {
  login?: string
  id?: string
  default_email?: string
  emails?: string[]
}

export async function fetchYandexLoginInfoServer(accessToken: string): Promise<YandexLoginInfoJson> {
  const url = 'https://login.yandex.ru/info?format=json'
  const res = await fetch(url, {
    headers: { Authorization: `OAuth ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`yandex_info_${res.status}${text ? ` ${text.slice(0, 120)}` : ''}`)
  }
  return (await res.json()) as YandexLoginInfoJson
}

export function emailFromYandexInfoServer(info: YandexLoginInfoJson): string | null {
  const em =
    typeof info.default_email === 'string' && info.default_email.trim()
      ? info.default_email.trim()
      : Array.isArray(info.emails) && typeof info.emails[0] === 'string'
        ? info.emails[0].trim()
        : ''
  if (em && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return em
  if (typeof info.login === 'string' && info.login) return `${info.login}@yandex.ru`
  return null
}
