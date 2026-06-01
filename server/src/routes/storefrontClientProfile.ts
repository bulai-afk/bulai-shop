import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '../db/pool.js'
import { logAdminWorkspaceSaved } from '../lib/saveAuditLog.js'
import { requireSessionJwt } from '../middleware/requireSession.js'

const TABLE = 'admin_clients_snapshot'

export const storefrontClientProfileRouter = Router()

function readPayload(row: { payload?: unknown } | undefined): unknown | null {
  if (row?.payload == null) return null
  return typeof row.payload === 'string' ? (JSON.parse(row.payload) as unknown) : row.payload
}

async function loadClientsDoc(): Promise<{ clients: unknown[] }> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT payload FROM \`${TABLE}\` WHERE id = 1 LIMIT 1`,
  )
  const row = rows[0] as { payload?: unknown } | undefined
  const payload = readPayload(row)
  if (payload == null || typeof payload !== 'object' || payload === null) {
    return { clients: [] }
  }
  const c = (payload as { clients?: unknown }).clients
  if (!Array.isArray(c)) return { clients: [] }
  return { clients: c }
}

async function saveClientsDoc(doc: { clients: unknown[] }): Promise<void> {
  const pool = getPool()
  const json = JSON.stringify(doc)
  await pool.query(
    `INSERT INTO \`${TABLE}\` (id, payload) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
    [json],
  )
  logAdminWorkspaceSaved(
    'clients',
    json,
    `clients=${doc.clients.length} (storefront profile JWT)`,
  )
}

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase()
}

function isClientRow(v: unknown): v is { email?: unknown } {
  return v != null && typeof v === 'object'
}

function findClientIndexBySessionEmail(clients: unknown[], sessionSub: string): number {
  const n = normalizeEmail(sessionSub)
  return clients.findIndex(
    (c) => isClientRow(c) && typeof c.email === 'string' && normalizeEmail(c.email) === n,
  )
}

/** GET /api/profile/me — только строка клиента для владельца JWT (email = sub). */
storefrontClientProfileRouter.get('/me', requireSessionJwt, async (req, res, next) => {
  try {
    const sub = req.sessionSub!
    const doc = await loadClientsDoc()
    const row = doc.clients[findClientIndexBySessionEmail(doc.clients, sub)]
    if (row === undefined) {
      res.json({ data: null })
      return
    }
    res.json({ data: row })
  } catch (e) {
    next(e)
  }
})

/** PUT /api/profile/me — upsert только для владельца JWT; email в карточке = sub. */
storefrontClientProfileRouter.put('/me', requireSessionJwt, async (req, res, next) => {
  try {
    const canonicalEmail = req.sessionSub!.trim()
    const body = req.body as {
      firstName?: unknown
      lastName?: unknown
      phone?: unknown
      profile?: unknown
    }
    if (body.profile != null && (typeof body.profile !== 'object' || Array.isArray(body.profile))) {
      res.status(400).json({ ok: false, error: 'invalid_profile' })
      return
    }

    const doc = await loadClientsDoc()
    const clients = [...doc.clients]
    let idx = findClientIndexBySessionEmail(clients, canonicalEmail)

    const firstName = typeof body.firstName === 'string' ? body.firstName : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName : ''
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const profileRaw = body.profile as Record<string, unknown> | undefined

    const buildProfile = (fallback: Record<string, unknown>) =>
      profileRaw != null && typeof profileRaw === 'object' && !Array.isArray(profileRaw)
        ? { ...profileRaw, email: canonicalEmail }
        : fallback

    if (idx < 0) {
      clients.push({
        id: randomUUID(),
        email: canonicalEmail,
        firstName,
        lastName,
        phone,
        profile: buildProfile({ email: canonicalEmail }),
      })
    } else {
      const prev = clients[idx]
      const base = isClientRow(prev) ? { ...(prev as Record<string, unknown>) } : {}
      const prevProfile =
        base.profile != null && typeof base.profile === 'object' && !Array.isArray(base.profile)
          ? (base.profile as Record<string, unknown>)
          : {}
      clients[idx] = {
        ...base,
        email: canonicalEmail,
        firstName,
        lastName,
        phone,
        profile: buildProfile(prevProfile),
      }
    }

    await saveClientsDoc({ clients })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})
