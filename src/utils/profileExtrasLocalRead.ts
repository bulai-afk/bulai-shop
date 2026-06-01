import {
  normProfileAccountEmail,
  PROFILE_EXTRAS_LEGACY_STORAGE_KEY,
  profileExtrasStorageKey,
} from '../constants/profileExtrasStorage'

/**
 * JSON доп. полей профиля для аккаунта: сначала ключ по email, иначе legacy-бакет,
 * если в нём нет email или он совпадает с текущим (миграция со старого одного ключа).
 */
export function getProfileExtrasJsonRawForAccount(accountEmail: string): string | null {
  const n = normProfileAccountEmail(accountEmail)
  if (n) {
    const keyed = localStorage.getItem(profileExtrasStorageKey(accountEmail))
    if (keyed) return keyed
  }
  const legacyRaw = localStorage.getItem(PROFILE_EXTRAS_LEGACY_STORAGE_KEY)
  if (!legacyRaw) return null
  // Без нормализованного email не читаем legacy — иначе снова общий «чужой» слепок.
  if (!n) return null
  try {
    const p = JSON.parse(legacyRaw) as { email?: unknown }
    const legacyEmail = typeof p.email === 'string' ? normProfileAccountEmail(p.email) : ''
    if (!legacyEmail || legacyEmail === n) return legacyRaw
  } catch {
    return null
  }
  return null
}
