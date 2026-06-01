import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '../db/pool.js'
import { logAdminWorkspaceSaved } from '../lib/saveAuditLog.js'

export const adminDataRouter = Router()

const TABLES = {
  'products-inventory': 'products_inventory_snapshot',
  'products-dictionaries': 'products_dictionaries_snapshot',
  clients: 'admin_clients_snapshot',
  orders: 'admin_orders_snapshot',
} as const

type Segment = keyof typeof TABLES

function readPayload(row: { payload?: unknown } | undefined): unknown | null {
  if (row?.payload == null) return null
  return typeof row.payload === 'string' ? (JSON.parse(row.payload) as unknown) : row.payload
}

async function selectPayload(table: string): Promise<unknown | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT payload FROM \`${table}\` WHERE id = 1 LIMIT 1`,
  )
  const row = rows[0] as { payload?: unknown } | undefined
  return readPayload(row)
}

async function upsertPayload(table: string, json: string): Promise<void> {
  const pool = getPool()
  await pool.query(
    `INSERT INTO \`${table}\` (id, payload) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
    [json],
  )
}

function validateInventory(body: unknown): body is Record<string, unknown> {
  return body != null && typeof body === 'object' && Array.isArray((body as { catalog?: unknown }).catalog)
}

function validateDictionaries(body: unknown): body is Record<string, unknown> {
  return body != null && typeof body === 'object' && Array.isArray((body as { dictionaries?: unknown }).dictionaries)
}

function validateClientsWrapper(body: unknown): body is { clients: unknown[] } {
  return body != null && typeof body === 'object' && Array.isArray((body as { clients?: unknown }).clients)
}

function validateOrdersWrapper(body: unknown): body is { orders: unknown[] } {
  return body != null && typeof body === 'object' && Array.isArray((body as { orders?: unknown }).orders)
}

function summaryForLog(segment: Segment, json: string): string {
  try {
    const o = JSON.parse(json) as Record<string, unknown>
    if (segment === 'products-inventory') {
      const c = o.catalog
      return `catalog=${Array.isArray(c) ? c.length : 0}`
    }
    if (segment === 'products-dictionaries') {
      const d = o.dictionaries
      return `dictionaries=${Array.isArray(d) ? d.length : 0}`
    }
    if (segment === 'clients') {
      const c = o.clients
      return `clients=${Array.isArray(c) ? c.length : 0}`
    }
    if (segment === 'orders') {
      const or = o.orders
      return `orders=${Array.isArray(or) ? or.length : 0}`
    }
  } catch {
    /* ignore */
  }
  return ''
}

function registerSegment(segment: Segment, validate: (body: unknown) => boolean) {
  const table = TABLES[segment]

  adminDataRouter.get(`/${segment}`, async (_req, res, next) => {
    try {
      const payload = await selectPayload(table)
      if (payload == null) {
        res.json({ data: null })
        return
      }
      res.json({ data: payload })
    } catch (e) {
      next(e)
    }
  })

  adminDataRouter.put(`/${segment}`, async (req, res, next) => {
    try {
      if (!validate(req.body)) {
        res.status(400).json({ ok: false, error: 'invalid_payload' })
        return
      }
      const json = JSON.stringify(req.body)
      await upsertPayload(table, json)
      logAdminWorkspaceSaved(segment, json, summaryForLog(segment, json))
      res.json({ ok: true })
    } catch (e) {
      next(e)
    }
  })
}

registerSegment('products-inventory', validateInventory)
registerSegment('products-dictionaries', validateDictionaries)
registerSegment('clients', validateClientsWrapper)
registerSegment('orders', validateOrdersWrapper)
