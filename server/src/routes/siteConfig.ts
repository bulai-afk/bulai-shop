import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '../db/pool.js'
import { logSiteConfigSaved } from '../lib/saveAuditLog.js'
import { normalizeSiteConfig } from '../lib/siteConfigNormalize.js'

export const siteConfigRouter = Router()

siteConfigRouter.get('/', async (_req, res, next) => {
  try {
    const pool = getPool()
    const [rows] = await pool.query<RowDataPacket[]>('SELECT payload FROM site_config_snapshot WHERE id = 1 LIMIT 1')
    const row = rows[0] as { payload?: unknown } | undefined
    if (row?.payload == null) {
      res.json({ config: null })
      return
    }
    const payload =
      typeof row.payload === 'string' ? (JSON.parse(row.payload) as unknown) : row.payload
    res.json({ config: normalizeSiteConfig(payload) })
  } catch (e) {
    next(e)
  }
})

siteConfigRouter.put('/', async (req, res, next) => {
  try {
    const normalized = normalizeSiteConfig(req.body)
    const json = JSON.stringify(normalized)
    const pool = getPool()
    await pool.query(
      `INSERT INTO site_config_snapshot (id, payload) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [json],
    )
    logSiteConfigSaved(json, 'site-config')
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})
