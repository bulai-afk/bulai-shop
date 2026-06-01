# Деплой bulai-shop на Hoster.by (как bulai.by)

Схема такая же, как у [bulai.by](https://github.com/bulai-afk/bulai.by): **GitHub Actions** собирает проект, заливает по **SSH/rsync** на `~/bulai-shop`, перезапускает **Node** на порту **3001**, а **Apache** в `public_html` проксирует запросы на Node.

## Важно: какой IP использовать

Для **bulai.by** в ISPmanager — IP **87.232.64.14**. В DNS A-записи домена должны указывать **на него** (и для `www`).

**vh151** (**93.125.99.153**, cPanel) — другая площадка; если DNS на **87.232**, файлы на vh151 в интернете не видны.

```bash
dig +short bulai.by A
# ожидается: 87.232.64.14
```

Деплой: SSH на **87.232.64.14** (см. `docs/DEPLOY-ISPMANAGER.md`) или файлы в `/www/bulai.by` через ISPmanager.

## 1. Один раз на сервере

1. В панели hoster.by создайте приложение **Node.js** (корень `bulai-shop`, startup `start.js`, Node 20), как для `bulai`.
2. По SSH:
   ```bash
   mkdir -p ~/bulai-shop/scripts ~/bulai-shop/tmp
   ```
3. Скопируйте `public_html.htaccess` из репозитория в `~/public_html/.htaccess` **домена магазина** (если порт не 3001 — поменяйте в файле).
4. Создайте `~/bulai-shop/server/.env` (не в git), пример:
   ```env
   NODE_ENV=production
   PORT=3001
   SESSION_JWT_SECRET=длинная_случайная_строка
   DB_HOST=localhost
   DB_USER=...
   DB_PASSWORD=...
   DB_NAME=bulai_shop
   CORS_ORIGINS=https://ваш-домен.by
   ```
5. Миграции (один раз): на сервере с тем же `.env` выполните `cd ~/bulai-shop/server && npm run migrate` (нужен `tsx` или запуск с локальной машины через SSH).

Если **bulai.by** и магазин на одном аккаунте:

- Держите **разные каталоги**: `~/bulai` и `~/bulai-shop`.
- Разные домены → разные `public_html` и при необходимости **разные порты** (`DEPLOY_PORT=3002` в секретах + правка `.htaccess` магазина).

Чтобы **заменить** старый сайт в том же `~/bulai`: задайте секрет `DEPLOY_REMOTE_DIR=bulai` и очистите каталог перед первым деплоем магазина (сделайте бэкап).

## 2. Секреты GitHub (репозиторий bulai-shop)

`Settings → Secrets and variables → Actions`:

| Секрет | Описание |
|--------|----------|
| `DEPLOY_HOST` | **`87.232.64.14`** (ISPmanager) или `vh151.hoster.by` только для cPanel |
| `DEPLOY_USER` | SSH-пользователь (как у bulai.by) |
| `DEPLOY_SSH_KEY` | Приватный SSH-ключ (можно тот же) |
| `VITE_YANDEX_CLIENT_ID` | OAuth Яндекс |
| `VITE_YANDEX_REDIRECT_URI` | Необязательно: `https://домен/auth/yandex/callback` |
| `DEPLOY_REMOTE_DIR` | Необязательно, по умолчанию `bulai-shop` |
| `DEPLOY_PORT` | Необязательно, по умолчанию `3001` |

В кабинете Яндекс ID укажите Redirect URI вашего домена.

## 3. Деплой

Пуш в ветку **`main`** или **Actions → Deploy to production → Run workflow**.

После деплоя подождите 30–60 с и откройте сайт.

## 4. Убрать старый сайт

- Старые файлы в `public_html` (PHP/HTML) можно удалить после настройки прокси на Node.
- Не удаляйте `~/bulai-shop/server/.env` при обновлениях — workflow его сохраняет.

## 5. Локальная проверка «как на сервере»

```bash
npm run build
cd server && npm run build && npm ci --omit=dev
cd ..
node start.js
# http://127.0.0.1:3001 — витрина и /api
```
