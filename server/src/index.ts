import { createApp } from './app.js'
import { config } from './config.js'
import { seedDevAdminSnapshotsIfEmpty } from './lib/seedDevAdminSnapshots.js'
import { seedDevCatalogFromSyncIfEmpty } from './lib/seedDevCatalogFromSync.js'

const app = createApp()

const server = app.listen(config.port, () => {
  const reqLog =
    config.nodeEnv === 'development' || process.env.REQUEST_LOG === '1'
      ? 'лог запросов: вкл.'
      : 'лог запросов: выкл. (в .env: NODE_ENV=development или REQUEST_LOG=1)'
  console.log(
    `[bulai-shop-api] http://127.0.0.1:${config.port}  (MariaDB: ${config.db.database}@${config.db.host})  ${reqLog}`,
  )
  if (config.nodeEnv === 'development') {
    void seedDevCatalogFromSyncIfEmpty().catch((err) => {
      console.warn('[bulai-shop-api] dev catalog seed skipped:', err instanceof Error ? err.message : err)
    })
    void seedDevAdminSnapshotsIfEmpty().catch((err) => {
      console.warn('[bulai-shop-api] dev orders seed skipped:', err instanceof Error ? err.message : err)
    })
  }
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[bulai-shop-api] порт ${config.port} уже занят. Остановите процесс (macOS: lsof -nP -iTCP:${config.port} -sTCP:LISTEN) или укажите другой PORT в server/.env`,
    )
    process.exit(1)
    return
  }
  console.error('[bulai-shop-api] listen error:', err)
  process.exit(1)
})
