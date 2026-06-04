import { Router, type Request } from 'express'
import { config } from '../config.js'
import { signSessionToken } from '../lib/sessionJwt.js'
import {
  emailFromYandexInfoServer,
  fetchYandexLoginInfoServer,
} from '../lib/yandexLoginInfoServer.js'
import { resolveYandexOAuthClientId } from '../lib/yandexOAuthConfig.js'

export const authSessionRouter = Router()

function yandexRedirectUriFromRequest(req: Request): string {
  if (config.yandexOAuthRedirectUri) return config.yandexOAuthRedirectUri
  const proto = (req.get('x-forwarded-proto') ?? req.protocol ?? 'https').split(',')[0]?.trim() || 'https'
  const host = (req.get('x-forwarded-host') ?? req.get('host') ?? '').split(',')[0]?.trim()
  if (!host) return ''
  return `${proto}://${host}/auth/yandex/callback`
}

/** GET /api/auth/yandex-config — публичный client_id (env, site_config или Vite при сборке). */
authSessionRouter.get('/yandex-config', async (req, res, next) => {
  try {
    const clientId = (await resolveYandexOAuthClientId()) || null
    const redirectUri = clientId ? yandexRedirectUriFromRequest(req) || null : null
    res.json({ clientId, redirectUri })
  } catch (e) {
    next(e)
  }
})

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
