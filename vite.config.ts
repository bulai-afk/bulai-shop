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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), yandexOAuthCallbackRoute()],
  server: {
    proxy: {
      // Обход CORS при запросе профиля из браузера в dev (см. src/api/yandexLoginInfo.ts)
      '/api/yandex-login-info': {
        target: 'https://login.yandex.ru',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yandex-login-info/, '/info'),
      },
    },
  },
})
