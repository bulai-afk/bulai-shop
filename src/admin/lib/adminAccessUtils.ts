import type { AuthUser } from '../../context/AuthContext'
import type { AdminClientRow } from '../types/adminClients'

function normEmail(s: string): string {
  return s.trim().toLowerCase()
}

function normPhoneDigits(s: string): string {
  return s.replace(/\D/g, '')
}

function clientEmails(client: AdminClientRow): string[] {
  const out = new Set<string>()
  const main = normEmail(client.email)
  if (main) out.add(main)
  const p = client.profile?.email
  if (typeof p === 'string' && p.trim()) out.add(normEmail(p))
  return [...out]
}

/**
 * Совпадение авторизованного пользователя с карточкой клиента (почта или телефон).
 */
export function authUserMatchesClient(user: AuthUser, client: AdminClientRow): boolean {
  const clientEmailsList = clientEmails(client)
  const uEmail = normEmail(user.email)
  if (uEmail && clientEmailsList.includes(uEmail)) return true
  if (user.emails?.some((e) => clientEmailsList.includes(normEmail(e)))) return true

  const uPhone = normPhoneDigits(user.phone ?? '')
  const cPhone = normPhoneDigits(client.phone)
  if (uPhone.length >= 10 && cPhone.length >= 10 && uPhone === cPhone) return true

  const profPhone = client.profile?.phone
  if (typeof profPhone === 'string' && profPhone.trim()) {
    const pp = normPhoneDigits(profPhone)
    if (uPhone.length >= 10 && pp.length >= 10 && uPhone === pp) return true
  }
  return false
}

export function isUserGrantedAdminAccess(
  user: AuthUser | null,
  adminClientIds: string[],
  clients: AdminClientRow[],
): boolean {
  if (adminClientIds.length === 0) return false
  if (!user) return false
  const idSet = new Set(adminClientIds)
  for (const c of clients) {
    if (!idSet.has(c.id)) continue
    if (authUserMatchesClient(user, c)) return true
  }
  return false
}
