import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '../db/pool.js'
import { requireSessionJwt } from '../middleware/requireSession.js'
import {
  DEFAULT_AVATAR,
  loadAllReviews,
  paginateReviews,
  productReviewStats,
  saveAllReviews,
  type CatalogReviewRecord,
} from '../lib/reviewsStore.js'

export const reviewsRouter = Router()
export const productReviewsRouter = Router()

async function authorFromSession(sub: string): Promise<{ name: string; avatar: string }> {
  try {
    const pool = getPool()
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT payload FROM admin_clients_snapshot WHERE id = 1 LIMIT 1',
    )
    const row = rows[0] as { payload?: unknown } | undefined
    if (row?.payload == null) return { name: sub.split('@')[0] || 'Покупатель', avatar: DEFAULT_AVATAR }
    const payload =
      typeof row.payload === 'string' ? (JSON.parse(row.payload) as unknown) : row.payload
    const clients = (payload as { clients?: unknown }).clients
    if (!Array.isArray(clients)) return { name: sub.split('@')[0] || 'Покупатель', avatar: DEFAULT_AVATAR }
    const email = sub.trim().toLowerCase()
    for (const c of clients) {
      if (!c || typeof c !== 'object') continue
      const o = c as Record<string, unknown>
      const em = typeof o.email === 'string' ? o.email.trim().toLowerCase() : ''
      const prof = o.profile as { email?: string } | undefined
      const pem =
        typeof prof?.email === 'string' ? prof.email.trim().toLowerCase() : ''
      if (em !== email && pem !== email) continue
      const first = typeof o.firstName === 'string' ? o.firstName.trim() : ''
      const last = typeof o.lastName === 'string' ? o.lastName.trim() : ''
      const name = [first, last].filter(Boolean).join(' ') || sub.split('@')[0] || 'Покупатель'
      const avatarUrl =
        typeof (prof as { avatarUrl?: string } | undefined)?.avatarUrl === 'string'
          ? (prof as { avatarUrl: string }).avatarUrl.trim()
          : ''
      return { name, avatar: avatarUrl || DEFAULT_AVATAR }
    }
  } catch {
    /* fallback */
  }
  return { name: sub.split('@')[0] || 'Покупатель', avatar: DEFAULT_AVATAR }
}

function parsePage(q: unknown): number {
  const n = Number(q)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

function parsePageSize(q: unknown): number {
  const n = Number(q)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 50
}

reviewsRouter.get('/', async (req, res, next) => {
  try {
    const all = await loadAllReviews()
    const page = parsePage(req.query.page)
    const pageSize = parsePageSize(req.query.pageSize)
    const { items, total } = paginateReviews(all, page, pageSize)
    res.json({ items, total })
  } catch (e) {
    next(e)
  }
})

reviewsRouter.post('/', requireSessionJwt, async (req, res, next) => {
  try {
    const sub = req.sessionSub
    if (!sub) {
      res.status(401).json({ ok: false, error: 'auth_required' })
      return
    }
    const body = req.body as { rating?: unknown; text?: unknown; productId?: unknown }
    const rating = Number(body.rating)
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!Number.isFinite(rating) || rating < 1 || rating > 5 || text.length < 3) {
      res.status(400).json({ ok: false, error: 'invalid_body' })
      return
    }
    let productId: string | null = null
    if (body.productId !== null && body.productId !== undefined) {
      if (typeof body.productId === 'string' && body.productId.trim()) {
        productId = body.productId.trim()
      }
    }
    const author = await authorFromSession(sub)
    const review: CatalogReviewRecord = {
      id: randomUUID(),
      name: author.name,
      avatar: author.avatar,
      rating: Math.round(rating),
      text,
      productId,
      createdAt: new Date().toISOString(),
    }
    const all = await loadAllReviews()
    all.unshift(review)
    await saveAllReviews(all)
    res.status(201).json(review)
  } catch (e) {
    next(e)
  }
})

function paramId(raw: string | string[] | undefined): string {
  const s = Array.isArray(raw) ? raw[0] : raw
  return typeof s === 'string' ? s.trim() : ''
}

productReviewsRouter.get('/:productId/reviews', async (req, res, next) => {
  try {
    const productId = paramId(req.params.productId)
    if (!productId) {
      res.status(400).json({ ok: false, error: 'invalid_product_id' })
      return
    }
    const all = await loadAllReviews()
    const forProduct = all.filter((r) => r.productId === productId)
    const page = parsePage(req.query.page)
    const pageSize = parsePageSize(req.query.pageSize)
    const { items, total } = paginateReviews(forProduct, page, pageSize)
    const stats = productReviewStats(forProduct)
    res.json({ items, total, ...stats })
  } catch (e) {
    next(e)
  }
})

productReviewsRouter.post('/:productId/reviews', requireSessionJwt, async (req, res, next) => {
  try {
    const sub = req.sessionSub
    if (!sub) {
      res.status(401).json({ ok: false, error: 'auth_required' })
      return
    }
    const productId = paramId(req.params.productId)
    if (!productId) {
      res.status(400).json({ ok: false, error: 'invalid_product_id' })
      return
    }
    const body = req.body as { rating?: unknown; text?: unknown }
    const rating = Number(body.rating)
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!Number.isFinite(rating) || rating < 1 || rating > 5 || text.length < 3) {
      res.status(400).json({ ok: false, error: 'invalid_body' })
      return
    }
    const author = await authorFromSession(sub)
    const review: CatalogReviewRecord = {
      id: randomUUID(),
      name: author.name,
      avatar: author.avatar,
      rating: Math.round(rating),
      text,
      productId,
      createdAt: new Date().toISOString(),
    }
    const all = await loadAllReviews()
    all.unshift(review)
    await saveAllReviews(all)
    res.status(201).json(review)
  } catch (e) {
    next(e)
  }
})
