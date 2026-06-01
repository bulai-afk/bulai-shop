#!/usr/bin/env node
/**
 * Заливает data/sync/products-*.json в локальный API (MariaDB snapshot).
 * Запуск: node scripts/import-products-to-local-api.mjs
 * Нужен работающий server (npm run dev:server или pm2 локально) на LOCAL_API_URL.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const syncDir = path.join(root, 'data', 'sync')
const base = (process.env.LOCAL_API_URL || 'http://127.0.0.1:3001').replace(/\/$/, '')

async function put(segment, filename) {
  const file = path.join(syncDir, filename)
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file} — run scripts/pull-products-from-server.sh first`)
  }
  const body = JSON.parse(fs.readFileSync(file, 'utf8'))
  const url = `${base}/api/admin/data/${segment}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${url} → ${res.status} ${text}`)
  }
  const label =
    segment === 'products-inventory'
      ? `catalog=${body.catalog?.length ?? 0}`
      : `dictionaries=${body.dictionaries?.length ?? 0}`
  console.log(`OK ${segment} (${label})`)
}

try {
  await put('products-inventory', 'products-inventory.json')
  await put('products-dictionaries', 'products-dictionaries.json')
  console.log('Local API updated.')
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}
