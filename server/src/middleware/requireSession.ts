import type { RequestHandler } from 'express'
import { config } from '../config.js'
import { verifySessionToken } from '../lib/sessionJwt.js'

declare module 'express-serve-static-core' {
  interface Request {
    sessionSub?: string
  }
}

export const requireSessionJwt: RequestHandler = async (req, res, next) => {
  try {
    if (!config.sessionJwtSecret) {
      res.status(503).json({ ok: false, error: 'session_not_configured' })
      return
    }
    const h = req.headers.authorization
    const raw = typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7).trim() : ''
    if (!raw) {
      res.status(401).json({ ok: false, error: 'auth_required' })
      return
    }
    const claims = await verifySessionToken(raw)
    req.sessionSub = claims.sub
    next()
  } catch {
    res.status(401).json({ ok: false, error: 'invalid_token' })
  }
}
