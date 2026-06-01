/** Старый общий ключ (до разделения по аккаунтам). */
export const PROFILE_EXTRAS_LEGACY_STORAGE_KEY = 'bulai-shop-profile-extras'

const PROFILE_EXTRAS_KEY_PREFIX = 'bulai-shop-profile-extras:'

/** @deprecated Используйте PROFILE_EXTRAS_LEGACY_STORAGE_KEY или profileExtrasStorageKey. */
export const PROFILE_EXTRAS_STORAGE_KEY = PROFILE_EXTRAS_LEGACY_STORAGE_KEY

export function normProfileAccountEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Ключ localStorage для доп. полей профиля конкретного аккаунта. */
export function profileExtrasStorageKey(accountEmail: string): string {
  const e = normProfileAccountEmail(accountEmail)
  return e ? `${PROFILE_EXTRAS_KEY_PREFIX}${e}` : PROFILE_EXTRAS_LEGACY_STORAGE_KEY
}

/** Событие storage могло затронуть сохранённые поля профиля (вкладка / другой пользователь). */
export function isProfileExtrasStorageEventKey(key: string | null): boolean {
  if (!key) return false
  if (key === PROFILE_EXTRAS_LEGACY_STORAGE_KEY) return true
  return key.startsWith(PROFILE_EXTRAS_KEY_PREFIX)
}
