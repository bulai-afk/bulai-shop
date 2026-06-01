import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import 'dotenv/config'
import { config } from './src/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SAFE_DB_NAME = /^[a-zA-Z0-9_]+$/

async function ensureDatabaseExists(): Promise<void> {
  const name = config.db.database
  if (!SAFE_DB_NAME.test(name)) {
    throw new Error(
      `DB_NAME должен содержать только буквы, цифры и подчёркивание (сейчас: ${name})`,
    )
  }
  const admin = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  })
  try {
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    console.log(`[migrate] database ready: ${name}`)
  } finally {
    await admin.end()
  }
}

async function listApplied(conn: mysql.Connection): Promise<Set<string>> {
  try {
    const [rows] = await conn.query<RowDataPacket[]>('SELECT filename FROM schema_migrations')
    return new Set(rows.map((r) => String(r.filename)))
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === 'ER_NO_SUCH_TABLE') return new Set()
    throw e
  }
}

async function main() {
  await ensureDatabaseExists()

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  })

  try {
    const applied = await listApplied(conn)
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skip ${file}`)
        continue
      }
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')
      console.log(`[migrate] run ${file}`)
      await conn.query(sql)
      await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file])
    }
    console.log('[migrate] done')
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
