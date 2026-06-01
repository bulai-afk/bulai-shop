import path from 'node:path'
import cors from 'cors'
import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import { config } from './config.js'
import { apiRouter } from './routes/api.js'

const requestLogEnabled =
  config.nodeEnv === 'development' || process.env.REQUEST_LOG === '1'

const requestLogMiddleware: RequestHandler = (req, res, next) => {
  const started = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - started
    const len = res.getHeader('content-length')
    const size = typeof len === 'string' || typeof len === 'number' ? ` ${len}B` : ''
    console.log(`[api] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)${size}`)
  })
  next()
}

const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ ok: false, error: 'invalid_json' })
    return
  }
  next(err)
}

const serverErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[api]', err)
  const message = config.nodeEnv === 'development' && err instanceof Error ? err.message : undefined
  res.status(500).json({
    ok: false,
    error: 'internal_error',
    ...(message ? { detail: message } : {}),
  })
}

export function createApp() {
  const app = express()
  /** Иначе Express ставит ETag на JSON → клиент шлёт If-None-Match → 304 без тела → fetch().json() ломается. */
  app.set('etag', false)
  app.use(
    cors({
      origin: config.corsOrigins.length ? config.corsOrigins : true,
      credentials: true,
    }),
  )
  if (requestLogEnabled) {
    app.use(requestLogMiddleware)
  }
  app.use(express.json({ limit: '50mb' }))
  app.use(jsonErrorHandler)
  app.use('/api', apiRouter)

  if (config.staticDir) {
    const staticDir = path.resolve(config.staticDir)
    app.use(
      express.static(staticDir, {
        index: false,
        maxAge: config.nodeEnv === 'production' ? '1d' : 0,
      }),
    )
    app.get(['/auth/yandex/callback', '/auth/yandex/callback/'], (_req, res) => {
      res.sendFile(path.join(staticDir, 'auth/yandex/callback.html'))
    })
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next()
        return
      }
      res.sendFile(path.join(staticDir, 'index.html'), (err) => {
        if (err) next(err)
      })
    })
  } else {
    app.use((_req, res) => {
      res.status(404).json({ ok: false, error: 'not_found' })
    })
  }

  app.use(serverErrorHandler)
  return app
}
