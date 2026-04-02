/**
 * Ответ GET https://login.yandex.ru/info
 * Состав полей зависит от прав приложения в Яндекс OAuth (секция «API Яндекс ID»).
 * @see https://yandex.com/dev/id/doc/en/user-information
 */
export type YandexLoginInfoJson = {
  login?: string
  id?: string
  client_id?: string
  psuid?: string
  old_social_login?: string
  /** Право «Доступ к адресу электронной почты» */
  default_email?: string
  emails?: string[]
  /** Право «Доступ к портрету пользователя» */
  is_avatar_empty?: boolean
  default_avatar_id?: string
  /** Право «Доступ к дате рождения» */
  birthday?: string | null
  /** Право «Логин, имя и фамилия, пол» */
  first_name?: string
  last_name?: string
  display_name?: string
  real_name?: string
  sex?: 'male' | 'female' | null
  /** Право «Доступ к номеру телефона» */
  default_phone?: {
    id?: number
    number?: string
  }
  /**
   * В стандартном ответе login.yandex.ru/info адреса доставки нет.
   * Поля на случай прокси/бэкенда или будущего расширения API.
   */
  default_address?: string
  delivery_address?: {
    country?: string
    locality?: string
    street?: string
    house?: string
    housing?: string
    building?: string
    apartment?: string
    entrance?: string
    floor?: string
    postcode?: string
  }
}

/** Размеры портрета: https://yandex.com/dev/id/doc/en/user-information#avatar-access */
export type YandexAvatarSize =
  | 'islands-small'
  | 'islands-34'
  | 'islands-middle'
  | 'islands-50'
  | 'islands-retina-small'
  | 'islands-68'
  | 'islands-75'
  | 'islands-retina-middle'
  | 'islands-retina-50'
  | 'islands-200'

export function yandexAvatarUrl(avatarId: string, size: YandexAvatarSize = 'islands-200'): string {
  return `https://avatars.yandex.net/get-yapic/${encodeURIComponent(avatarId)}/${size}`
}

export type YandexDerivedProfile = {
  yandexLogin?: string
  displayName?: string
  yandexId?: string
  realName?: string
  firstName?: string
  lastName?: string
  emails?: string[]
  yandexAvatarUrl?: string
  phone?: string
  birthday?: string
  sex?: 'male' | 'female' | null
  /** Собранная строка адреса доставки (если пришла с API/прокси) */
  deliveryAddress?: string
}

function formatDeliveryAddressFromInfo(info: YandexLoginInfoJson): string | undefined {
  if (typeof info.default_address === 'string' && info.default_address.trim()) {
    return info.default_address.trim()
  }
  const a = info.delivery_address
  if (!a || typeof a !== 'object') return undefined
  const parts = [
    a.postcode,
    a.country,
    a.locality,
    [a.street, a.house, a.housing, a.building].filter(Boolean).join(', '),
    a.apartment ? `кв./оф. ${a.apartment}` : undefined,
    a.entrance ? `подъезд ${a.entrance}` : undefined,
    a.floor ? `эт. ${a.floor}` : undefined,
  ]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
  return parts.length ? parts.join(', ') : undefined
}

/** Извлекает из ответа /info поля для локального профиля (без OAuth-токена). */
export function deriveProfileFromYandexLoginInfo(info: YandexLoginInfoJson): YandexDerivedProfile {
  const out: YandexDerivedProfile = {}

  if (typeof info.login === 'string' && info.login) out.yandexLogin = info.login
  if (typeof info.display_name === 'string' && info.display_name) out.displayName = info.display_name
  if (typeof info.id === 'string' && info.id) out.yandexId = info.id
  if (typeof info.real_name === 'string' && info.real_name.trim()) out.realName = info.real_name.trim()
  if (typeof info.first_name === 'string' && info.first_name.trim()) out.firstName = info.first_name.trim()
  if (typeof info.last_name === 'string' && info.last_name.trim()) out.lastName = info.last_name.trim()

  if (Array.isArray(info.emails)) {
    const emails = info.emails
      .filter((e): e is string => typeof e === 'string' && e.trim() !== '')
      .map((e) => e.trim())
    if (emails.length) out.emails = emails
  }

  const phone = info.default_phone?.number
  if (typeof phone === 'string' && phone.trim()) out.phone = phone.trim()

  if (info.birthday != null && typeof info.birthday === 'string' && info.birthday) {
    out.birthday = info.birthday
  }

  if (info.sex === 'male' || info.sex === 'female' || info.sex === null) {
    out.sex = info.sex
  }

  const aid = info.default_avatar_id
  if (typeof aid === 'string' && aid && info.is_avatar_empty !== true) {
    out.yandexAvatarUrl = yandexAvatarUrl(aid)
  }

  const delivery = formatDeliveryAddressFromInfo(info)
  if (delivery) out.deliveryAddress = delivery

  return out
}

const DEFAULT_INFO_PATH = 'https://login.yandex.ru/info'

function infoRequestUrl(): string {
  const custom = import.meta.env.VITE_YANDEX_INFO_URL?.trim()
  if (custom) return custom.replace(/\/$/, '')
  if (import.meta.env.DEV) return '/api/yandex-login-info'
  return DEFAULT_INFO_PATH
}

/**
 * Обмен OAuth-токена на данные пользователя.
 * Рекомендуется: заголовок Authorization: OAuth <токен> и format=json.
 * Не использовать oauth_token в query (утечки в логах) и не передавать jwt_secret с фронта.
 */
export async function fetchYandexLoginInfo(accessToken: string): Promise<YandexLoginInfoJson> {
  const base = infoRequestUrl()
  const url = `${base}${base.includes('?') ? '&' : '?'}format=json`
  const res = await fetch(url, {
    headers: { Authorization: `OAuth ${accessToken}` },
    credentials: 'omit',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`login.yandex.ru/info ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
  }
  return (await res.json()) as YandexLoginInfoJson
}

/** Из объекта, который отдаёт handler() виджета YaAuthSuggest. */
export function extractYandexOAuthToken(detail: unknown): string | null {
  if (!detail || typeof detail !== 'object') return null
  const d = detail as Record<string, unknown>
  const raw = d.access_token ?? d.oauth_token ?? d.token
  if (typeof raw === 'string' && raw.length > 0) return raw
  const nested = d.data
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>
    const t = n.access_token ?? n.oauth_token ?? n.token
    if (typeof t === 'string' && t.length > 0) return t
  }
  return null
}

export function emailFromYandexInfo(info: YandexLoginInfoJson): string | null {
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
