import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * OAuth Redirect URI без .html: /auth/yandex/callback → тот же HTML, что callback.html
 * (на статическом хостинге добавьте редирект или укажите в кабинете .../callback.html).
 */
function yandexOAuthCallbackRoute(): Plugin {
  let cached: string | null = null
  function readHtml(root: string) {
    if (cached) return cached
    const file = path.join(root, 'public/auth/yandex/callback.html')
    cached = fs.readFileSync(file, 'utf-8')
    return cached
  }
  function mount(server: ViteDevServer | PreviewServer) {
    const root = server.config.root
    server.middlewares.use((req, res, next) => {
      const pathname = (req.url ?? '').split('?')[0]?.replace(/\/$/, '') ?? ''
      if (pathname !== '/auth/yandex/callback') {
        next()
        return
      }
      try {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readHtml(root))
      } catch {
        next()
      }
    })
  }
  return {
    name: 'yandex-oauth-callback-route',
    configureServer: mount,
    configurePreviewServer: mount,
  }
}

/** В dev отдаёт `data/sync/*.json`, если API не запущен или БД пустая. */
function devSyncCatalogData(): Plugin {
  const allowed = new Set(['products-inventory.json', 'products-dictionaries.json'])
  return {
    name: 'dev-sync-catalog-data',
    configureServer(server) {
      const syncDir = path.join(server.config.root, 'data', 'sync')
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0] ?? ''
        if (!pathname.startsWith('/__dev_sync__/')) {
          next()
          return
        }
        const name = pathname.slice('/__dev_sync__/'.length)
        if (!allowed.has(name)) {
          res.statusCode = 404
          res.end()
          return
        }
        const file = path.join(syncDir, name)
        if (!fs.existsSync(file)) {
          res.statusCode = 404
          res.end('not found — run scripts/pull-products-from-server.sh')
          return
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(fs.readFileSync(file))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), yandexOAuthCallbackRoute(), devSyncCatalogData()],
  server: {
    proxy: {
      // Обход CORS при запросе профиля из браузера в dev (см. src/api/yandexLoginInfo.ts)
      '/api/yandex-login-info': {
        target: 'https://login.yandex.ru',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yandex-login-info/, '/info'),
      },
      // Локальный бэкенд (site-config, promo-materials, …); поднимите API на :3001.
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
