import 'dotenv/config'

function parseOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const DEV_JWT_FALLBACK = 'dev-bulai-shop-jwt-secret-min-32-characters-long!!'

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  /** HS256; в production обязателен SESSION_JWT_SECRET (длинная случайная строка). */
  sessionJwtSecret:
    (process.env.SESSION_JWT_SECRET ?? '').trim() ||
    (process.env.NODE_ENV === 'production' ? '' : DEV_JWT_FALLBACK),
  sessionJwtExpires: process.env.SESSION_JWT_EXPIRES?.trim() || '7d',
  /** Вход по email без Яндекса: выдача JWT (только для разработки). */
  authAllowInsecureEmailSession: process.env.AUTH_ALLOW_EMAIL_SESSION === '1',
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'bulai_shop',
  },
  corsOrigins: parseOrigins(
    process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173',
  ),
  /** Каталог Vite `dist/` — витрина с одного origin с API (деплой на Hoster.by). */
  staticDir: (process.env.STATIC_DIR ?? '').trim(),
  /** Населённый пункт для https://belarusbank.by/api/kursExchange?city=… */
  belarusbankKursCity: (process.env.BELARUSBANK_KURS_CITY ?? 'Минск').trim() || 'Минск',
} as const
