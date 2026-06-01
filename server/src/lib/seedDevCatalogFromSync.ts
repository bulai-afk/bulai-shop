import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPool } from '../db/pool.js'
import type { RowDataPacket } from 'mysql2/promise'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function readSyncJson<T>(filename: string): T | null {
  const file = path.join(repoRoot, 'data', 'sync', filename)
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch {
    return null
  }
}

async function catalogCount(table: string): Promise<number> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT payload FROM \`${table}\` WHERE id = 1 LIMIT 1`,
  )
  const row = rows[0] as { payload?: unknown } | undefined
  if (row?.payload == null) return 0
  const payload =
    typeof row.payload === 'string' ? (JSON.parse(row.payload) as Record<string, unknown>) : row.payload
  if (!payload || typeof payload !== 'object') return 0
  if (table === 'products_inventory_snapshot') {
    const c = (payload as { catalog?: unknown }).catalog
    return Array.isArray(c) ? c.length : 0
  }
  const d = (payload as { dictionaries?: unknown }).dictionaries
  return Array.isArray(d) ? d.length : 0
}

async function upsert(table: string, body: unknown): Promise<void> {
  const json = JSON.stringify(body)
  const pool = getPool()
  await pool.query(
    `INSERT INTO \`${table}\` (id, payload) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
    [json],
  )
}

/** В development заполняет пустые snapshot-таблицы из data/sync/. */
export async function seedDevCatalogFromSyncIfEmpty(): Promise<void> {
  const inventory = readSyncJson<{ catalog?: unknown[] }>('products-inventory.json')
  const dictionaries = readSyncJson<{ dictionaries?: unknown[] }>('products-dictionaries.json')

  if (inventory && Array.isArray(inventory.catalog) && inventory.catalog.length > 0) {
    const n = await catalogCount('products_inventory_snapshot')
    if (n === 0) {
      await upsert('products_inventory_snapshot', inventory)
      console.log(`[bulai-shop-api] dev seed: products-inventory (${inventory.catalog.length} товаров)`)
    }
  }

  if (dictionaries && Array.isArray(dictionaries.dictionaries) && dictionaries.dictionaries.length > 0) {
    const n = await catalogCount('products_dictionaries_snapshot')
    if (n === 0) {
      await upsert('products_dictionaries_snapshot', dictionaries)
      console.log(
        `[bulai-shop-api] dev seed: products-dictionaries (${dictionaries.dictionaries.length} справочников)`,
      )
    }
  }
}
