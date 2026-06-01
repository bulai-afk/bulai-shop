# Деплой bulai-shop на ISPmanager (87.232.64.14)

Официальная инструкция: [Node.js в ispmanager](https://www.ispmanager.ru/docs/ispmanager/nodejs).

## Сервер

| Параметр | Значение |
|----------|----------|
| SSH-хост | `87.232.64.14` |
| Пользователь | `bulaiby` (как в панели) |
| Корень сайта | `/www/bulai.by` (в панели; на диске часто `~/www/bulai.by` или `/var/www/…/data/www/bulai.by`) |
| Заглушка | Удалить `index.html` в корне сайта (поддержка уже удалила) |

Панель сама задаёт **`PORT`** (часто `10001`). Приложение должно слушать `process.env.PORT` — `start.js` + API это делают.

## Файлы в корне сайта

Минимум:

```
/www/bulai.by/
  package.json      ← scripts.start = node start.js
  start.js
  dist/             ← витрина (vite build)
  server/
    package.json
    dist/
    node_modules/   ← production deps
    .env
```

## package.json (корень)

```json
{
  "name": "bulai.by",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node start.js"
  }
}
```

В панели: **Сайты → bulai.by → Npm install**, затем **Перезапустить (Node.js)**.

## server/.env

```env
NODE_ENV=production
SESSION_JWT_SECRET=длинная_случайная_строка
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=bulaiby_bulai
DB_PASSWORD=из_панели_БД
DB_NAME=bulaiby_bulai
CORS_ORIGINS=https://bulai.by,https://www.bulai.by
```

`PORT` в `.env` не обязателен — его выставляет ISPmanager.

## SSH-ключ для GitHub Actions

На сервере **87.232.64.14** в ISPmanager добавьте публичный ключ деплоя, затем в GitHub Secrets:

- `DEPLOY_HOST` = `87.232.64.14`
- `DEPLOY_USER` = **точный SSH-логин из панели** (часто `bulaiby` или `h202138` — не логин от vh151)
- `DEPLOY_SSH_KEY` = **весь** приватный ключ (многострочный), не `.pub`

Публичный ключ (файл `deploy_bulai.pub`):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDKbaG02wGDxqTUWMDhcpiLyARN+ZKw4GoqZHUjhHQfn deploy-bulai
```

### `Permission denied (publickey)`

1. На Mac с тем же ключом:  
   `ssh -4 -i ~/.ssh/deploy_bulai bulaiby@87.232.64.14`  
   (замените пользователя, если в панели другой).
2. Если локально **не** заходит — в ISPmanager: **Пользователи → ваш пользователь → SSH-ключи** → вставьте строку из `.pub` выше (или новый ключ).
3. В GitHub Secret `DEPLOY_SSH_KEY` — содержимое **приватного** файла, например:
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   …
   -----END OPENSSH PRIVATE KEY-----
   ```
   Не вставляйте ключ от vh151, если деплой на 87.232.
4. В логе Actions шаг **Setup SSH key** печатает **fingerprint** — он должен совпадать с ключом на сервере.
5. Сгенерировать новую пару (если старый ключ потерян):
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/deploy_bulai -C deploy-bulai -N ""
   ```
   `.pub` → в панель, приватный → в `DEPLOY_SSH_KEY`.

## Ручная заливка с Mac (если ключ ещё не добавлен)

Сборка локально:

```bash
cd bulai-shop
npm ci && npm run build
cd server && npm ci && npm run build && npm ci --omit=dev && cd ..
```

Заливка (подставьте путь к сайту после `ssh bulaiby@87.232.64.14` → `pwd` в каталоге www):

```bash
SITE=~/www/bulai.by   # уточните на сервере: ls ~/www
rsync -avz -e "ssh" dist start.js package.json bulaiby@87.232.64.14:$SITE/
rsync -avz -e "ssh" server/dist server/node_modules server/package.json bulaiby@87.232.64.14:$SITE/server/
```

Потом в панели: **Npm install** → **Перезапустить Node.js**.

## vh151.hoster.by

Старый деплой на **93.125.99.153** (`vh151`) к сайту **bulai.by** не относится, если DNS указывает на **87.232.64.14**. Не меняйте DNS на vh151 без необходимости.
