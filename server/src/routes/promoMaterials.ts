import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '../db/pool.js'
import { logPromoMaterialsSaved } from '../lib/saveAuditLog.js'
import { normalizePromoMaterials } from '../lib/promoMaterialsNormalize.js'

export const promoMaterialsRouter = Router()

promoMaterialsRouter.get('/', async (_req, res, next) => {
  try {
    const pool = getPool()
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT payload FROM promo_materials_snapshot WHERE id = 1 LIMIT 1',
    )
    const row = rows[0] as { payload?: unknown } | undefined
    if (row?.payload == null) {
      res.json({ promo: null })
      return
    }
    const payload =
      typeof row.payload === 'string' ? (JSON.parse(row.payload) as unknown) : row.payload
    res.json({ promo: normalizePromoMaterials(payload) })
  } catch (e) {
    next(e)
  }
})

promoMaterialsRouter.put('/', async (req, res, next) => {
  try {
    const normalized = normalizePromoMaterials(req.body)
    const json = JSON.stringify(normalized)
    const pool = getPool()
    await pool.query(
      `INSERT INTO promo_materials_snapshot (id, payload) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [json],
    )
    logPromoMaterialsSaved(json)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})
