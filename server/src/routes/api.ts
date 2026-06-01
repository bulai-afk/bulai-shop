import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '../db/pool.js'
import { adminDataRouter } from './adminData.js'
import { promoCodesCatalogRouter } from './promoCodesCatalog.js'
import { promoMaterialsRouter } from './promoMaterials.js'
import { authSessionRouter } from './authSession.js'
import { siteConfigRouter } from './siteConfig.js'
import { storefrontClientProfileRouter } from './storefrontClientProfile.js'
import { exchangeRatesRouter } from './exchangeRates.js'
import { productReviewsRouter, reviewsRouter } from './reviews.js'

export const apiRouter = Router()

apiRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  next()
})

apiRouter.use('/exchange-rates', exchangeRatesRouter)
apiRouter.use('/site-config', siteConfigRouter)
apiRouter.use('/promo-materials', promoMaterialsRouter)
apiRouter.use('/promo-codes', promoCodesCatalogRouter)
apiRouter.use('/admin/data', adminDataRouter)
apiRouter.use('/auth', authSessionRouter)
apiRouter.use('/profile', storefrontClientProfileRouter)
apiRouter.use('/reviews', reviewsRouter)
apiRouter.use('/products', productReviewsRouter)

apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'bulai-shop-api',
    time: new Date().toISOString(),
  })
})

apiRouter.get('/db/health', async (_req, res, next) => {
  try {
    const pool = getPool()
    const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 AS v')
    const row = rows[0] as { v: number } | undefined
    res.json({
      ok: true,
      database: 'reachable',
      ping: row?.v === 1,
    })
  } catch (err) {
    next(err)
  }
})
