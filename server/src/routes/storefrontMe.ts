import { Router } from 'express'
import { requireSessionJwt } from '../middleware/requireSession.js'
import { listStorefrontOrdersForEmail } from '../lib/checkoutService.js'

export const storefrontMeRouter = Router()

/** GET /api/me/orders — история заказов текущего покупателя. */
storefrontMeRouter.get('/orders', requireSessionJwt, async (req, res, next) => {
  try {
    const orders = await listStorefrontOrdersForEmail(req.sessionSub!)
    res.json({ orders })
  } catch (e) {
    next(e)
  }
})
