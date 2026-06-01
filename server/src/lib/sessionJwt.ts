import * as jose from 'jose'
import { config } from '../config.js'

export type SessionClaims = {
  sub: string
  yn?: string
  pv: 'yandex' | 'email'
}

export async function signSessionToken(claims: {
  sub: string
  yandexId?: string
  provider: 'yandex' | 'email'
}): Promise<string> {
  if (!config.sessionJwtSecret) {
    throw new Error('session_jwt_secret_missing')
  }
  const secret = new TextEncoder().encode(config.sessionJwtSecret)
  return new jose.SignJWT({
    yn: claims.yandexId,
    pv: claims.provider,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub.trim().toLowerCase())
    .setIssuedAt()
    .setExpirationTime(config.sessionJwtExpires)
    .sign(secret)
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  if (!config.sessionJwtSecret) {
    throw new Error('session_jwt_secret_missing')
  }
  const secret = new TextEncoder().encode(config.sessionJwtSecret)
  const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] })
  const sub = typeof payload.sub === 'string' ? payload.sub.trim().toLowerCase() : ''
  if (!sub) throw new Error('no_sub')
  const pv = payload.pv === 'email' ? 'email' : 'yandex'
  const yn = typeof payload.yn === 'string' ? payload.yn : undefined
  return { sub, yn, pv }
}
