import type { AuthUser } from '../context/AuthContext'
import { getProfileExtrasJsonRawForAccount } from './profileExtrasLocalRead'

/** Имя для UI: displayName, ФИО; если пусто — «Пользователь» (не email/логин). */
export function profileDisplayName(user: AuthUser): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  const name =
    user.displayName?.trim() || user.realName?.trim() || full
  return name || 'Пользователь'
}

function readSavedProfileNameParts(accountEmail: string): { firstName: string; lastName: string } {
  try {
    const raw = getProfileExtrasJsonRawForAccount(accountEmail)
    if (!raw) return { firstName: '', lastName: '' }
    const p = JSON.parse(raw) as { firstName?: unknown; lastName?: unknown }
    return {
      firstName: typeof p.firstName === 'string' ? p.firstName : '',
      lastName: typeof p.lastName === 'string' ? p.lastName : '',
    }
  } catch {
    return { firstName: '', lastName: '' }
  }
}

/**
 * Имя как в шапке/баннере: учитывает сохранённые локально имя и фамилию (по email аккаунта).
 * Без входа — подпись для кнопки («Войти»).
 */
export function profileDisplayNameWithSavedExtras(user: AuthUser | null): string {
  if (!user) return 'Войти'
  const saved = readSavedProfileNameParts(user.email)
  const full = [saved.firstName || user.firstName, saved.lastName || user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  const name = user.displayName?.trim() || user.realName?.trim() || full
  return name || 'Пользователь'
}
