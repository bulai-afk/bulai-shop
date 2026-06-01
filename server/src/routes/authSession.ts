import { Router } from 'express'
import { config } from '../config.js'
import { signSessionToken } from '../lib/sessionJwt.js'
import {
  emailFromYandexInfoServer,
  fetchYandexLoginInfoServer,
} from '../lib/yandexLoginInfoServer.js'

export const authSessionRouter = Router()

/**
 * POST /api/auth/session
 * - { yandexOAuthToken } — проверка у Яндекса, JWT с sub = email
 * - { provider: "email", email } — только если AUTH_ALLOW_EMAIL_SESSION=1 (без пароля, только для dev)
 */
authSessionRouter.post('/session', async (req, res, next) => {
  try {
    if (!config.sessionJwtSecret) {
      res.status(503).json({ ok: false, error: 'session_not_configured' })
      return
    }

    const body = req.body as {
      yandexOAuthToken?: unknown
      provider?: unknown
      email?: unknown
    }

    if (typeof body.yandexOAuthToken === 'string' && body.yandexOAuthToken.length > 0) {
      try {
        const info = await fetchYandexLoginInfoServer(body.yandexOAuthToken)
        const email = emailFromYandexInfoServer(info)
        if (!email) {
          res.status(401).json({ ok: false, error: 'yandex_email_missing' })
          return
        }
        const sub = email.trim().toLowerCase()
        const yandexId = typeof info.id === 'string' && info.id ? info.id : undefined
        const token = await signSessionToken({ sub, yandexId, provider: 'yandex' })
        res.json({ ok: true, token })
      } catch {
        res.status(401).json({ ok: false, error: 'yandex_token_invalid' })
      }
      return
    }

    if (body.provider === 'email' && typeof body.email === 'string') {
      if (!config.authAllowInsecureEmailSession) {
        res.status(403).json({ ok: false, error: 'email_session_forbidden' })
        return
      }
      const em = body.email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        res.status(400).json({ ok: false, error: 'invalid_email' })
        return
      }
      const token = await signSessionToken({ sub: em, provider: 'email' })
      res.json({ ok: true, token })
      return
    }

    res.status(400).json({ ok: false, error: 'invalid_body' })
  } catch (e) {
    next(e)
  }
})
