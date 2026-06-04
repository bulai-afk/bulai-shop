import type { AdminClientRow } from '../admin/types/adminClients'
import type { AdminOrderRow } from '../admin/types/adminOrders'

export function normalizeClientEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function customerNameFromClient(c: Pick<AdminClientRow, 'firstName' | 'lastName'>): string {
  const parts = [c.lastName, c.firstName].map((s) => s.trim()).filter(Boolean)
  return parts.join(' ').trim()
}

/** Поля заказа при привязке к карточке клиента. */
export function orderClientLinkPatch(
  c: AdminClientRow,
): Pick<AdminOrderRow, 'clientId' | 'clientEmail' | 'customerName'> {
  return {
    clientId: c.id,
    clientEmail: normalizeClientEmail(c.email),
    customerName: customerNameFromClient(c),
  }
}

export function orderBelongsToClient(
  order: AdminOrderRow,
  clientEmail: string,
  clientId?: string,
  clients?: AdminClientRow[],
): boolean {
  const email = normalizeClientEmail(clientEmail)
  if (!email) return false
  if (order.clientEmail && normalizeClientEmail(order.clientEmail) === email) return true
  if (clientId && order.clientId && order.clientId === clientId) return true

  const me = clients?.find((c) => normalizeClientEmail(c.email) === email)
  if (me) {
    if (order.clientId && order.clientId === me.id) return true
    const linked = findClientForOrder(order, clients!)
    if (linked?.id === me.id) return true
    const myName = customerNameFromClient(me).toLowerCase().replace(/\s+/g, ' ')
    const revName = [me.firstName, me.lastName]
      .filter(Boolean)
      .join(' ')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
    const cn = order.customerName.trim().toLowerCase().replace(/\s+/g, ' ')
    if (cn && (cn === myName || cn === revName)) return true
  }
  return false
}

export function findClientForOrder(
  order: Pick<AdminOrderRow, 'clientId' | 'clientEmail' | 'customerName'>,
  clients: AdminClientRow[],
): AdminClientRow | undefined {
  if (order.clientId) {
    const byId = clients.find((c) => c.id === order.clientId)
    if (byId) return byId
  }
  if (order.clientEmail) {
    const n = normalizeClientEmail(order.clientEmail)
    const byEmail = clients.find((c) => normalizeClientEmail(c.email) === n)
    if (byEmail) return byEmail
  }
  return findClientForOrderCustomerName(order.customerName, clients)
}

/** Сопоставление по ФИО / email / телефону (legacy-заказы без clientId). */
export function findClientForOrderCustomerName(
  customerName: string,
  clients: AdminClientRow[],
): AdminClientRow | undefined {
  const raw = customerName.trim()
  if (!raw) return undefined
  const n = raw.toLowerCase().replace(/\s+/g, ' ')
  const digits = raw.replace(/\D/g, '')
  for (const c of clients) {
    const full = [c.lastName, c.firstName].filter(Boolean).join(' ').trim().toLowerCase()
    const rev = [c.firstName, c.lastName].filter(Boolean).join(' ').trim().toLowerCase()
    if (full && n === full.replace(/\s+/g, ' ')) return c
    if (rev && n === rev.replace(/\s+/g, ' ')) return c
    const em = c.email?.trim().toLowerCase()
    if (em && n === em) return c
    if (digits.length >= 7) {
      const cp = c.phone.replace(/\D/g, '')
      if (cp === digits) return c
      const pp = c.profile?.phone?.replace(/\D/g, '') ?? ''
      if (pp.length >= 7 && pp === digits) return c
    }
  }
  return undefined
}
