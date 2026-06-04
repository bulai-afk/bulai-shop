import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '../db/pool.js'
import { logAdminWorkspaceSaved } from './saveAuditLog.js'

export function readPayload(row: { payload?: unknown } | undefined): unknown | null {
  if (row?.payload == null) return null
  return typeof row.payload === 'string' ? (JSON.parse(row.payload) as unknown) : row.payload
}

export async function loadSnapshotDoc(table: string): Promise<unknown | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT payload FROM \`${table}\` WHERE id = 1 LIMIT 1`,
  )
  const row = rows[0] as { payload?: unknown } | undefined
  return readPayload(row)
}

export async function saveSnapshotDoc(
  table: string,
  payload: unknown,
  segment: string,
  hint: string,
): Promise<void> {
  const pool = getPool()
  const json = JSON.stringify(payload)
  await pool.query(
    `INSERT INTO \`${table}\` (id, payload) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
    [json],
  )
  logAdminWorkspaceSaved(segment, json, hint)
}
