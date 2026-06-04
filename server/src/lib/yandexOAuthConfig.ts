import type { RowDataPacket } from 'mysql2/promise'
import { config } from '../config.js'
import { getPool } from '../db/pool.js'
import { readPayload } from './adminSnapshotStore.js'
import { normalizeSiteConfig } from './siteConfigNormalize.js'

export async function resolveYandexOAuthClientId(): Promise<string> {
  if (config.yandexOAuthClientId) return config.yandexOAuthClientId
  try {
    const pool = getPool()
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT payload FROM site_config_snapshot WHERE id = 1 LIMIT 1',
    )
    const row = rows[0] as { payload?: unknown } | undefined
    const payload = readPayload(row)
    const site = normalizeSiteConfig(payload)
    return site.yandexOAuthClientId.trim()
  } catch {
    return ''
  }
}
