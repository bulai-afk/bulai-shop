import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '../db/pool.js'
import { logPromoCodesCatalogSaved } from '../lib/saveAuditLog.js'
import { normalizePromoCodesCatalog } from '../lib/promoCodesNormalize.js'

export const promoCodesCatalogRouter = Router()

promoCodesCatalogRouter.get('/', async (_req, res, next) => {
  try {
    const pool = getPool()
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT payload FROM promo_codes_snapshot WHERE id = 1 LIMIT 1',
    )
    const row = rows[0] as { payload?: unknown } | undefined
    if (row?.payload == null) {
      res.json({ promoCodes: null })
      return
    }
    const payload =
      typeof row.payload === 'string' ? (JSON.parse(row.payload) as unknown) : row.payload
    res.json(normalizePromoCodesCatalog(payload))
  } catch (e) {
    next(e)
  }
})

promoCodesCatalogRouter.put('/', async (req, res, next) => {
  try {
    const normalized = normalizePromoCodesCatalog(req.body)
    const json = JSON.stringify(normalized)
    const pool = getPool()
    await pool.query(
      `INSERT INTO promo_codes_snapshot (id, payload) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [json],
    )
    logPromoCodesCatalogSaved(json)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})
