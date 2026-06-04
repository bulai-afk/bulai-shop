import { Router } from 'express'
import { requireSessionJwt } from '../middleware/requireSession.js'
import {
  createOrderFromCheckout,
  ensureClientExistsForCheckout,
} from '../lib/checkoutService.js'

export const checkoutRouter = Router()

checkoutRouter.post('/', requireSessionJwt, async (req, res, next) => {
  try {
    const sessionEmail = req.sessionSub!
    const body = req.body as Parameters<typeof createOrderFromCheckout>[1]
    if (!body?.contact || !Array.isArray(body.lines) || !body.shipping || !body.paymentMethod) {
      res.status(400).json({ ok: false, error: 'invalid_body' })
      return
    }
    await ensureClientExistsForCheckout(sessionEmail, body.contact)
    const result = await createOrderFromCheckout(sessionEmail, body)
    res.status(201).json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'terms_required' || msg === 'empty_cart' || msg === 'email_mismatch' || msg === 'product_not_found') {
      res.status(400).json({ ok: false, error: msg })
      return
    }
    next(e)
  }
})
