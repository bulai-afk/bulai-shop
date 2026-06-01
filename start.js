/**
 * Лаунчер для Hoster.by (как bulai.by): корень приложения в панели = bulai-shop, файл = start.js.
 * Перед стартом API подгружает server/.env и отдаёт витрину из ../dist.
 */
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const serverDir = path.join(root, 'server')

process.env.STATIC_DIR = path.join(root, 'dist')
process.chdir(serverDir)

const serverEntry = path.join(serverDir, 'dist', 'index.js')
await import(pathToFileURL(serverEntry).href)
