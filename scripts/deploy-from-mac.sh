#!/usr/bin/env bash
# Деплой на bulai.by с Mac, когда GitHub Actions не может SSH (блокировка дата-центров).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="${DEPLOY_SSH_KEY_FILE:-$HOME/.ssh/deploy_bulai}"
HOST="${DEPLOY_HOST:-87.232.64.14}"
USER="${DEPLOY_USER:-h202138}"
REMOTE="${DEPLOY_REMOTE:-www/bulai.by}"
SSH=(ssh -4 -o BatchMode=yes -i "$KEY")
RSYNC=(rsync -avz -e "ssh -4 -o BatchMode=yes -i $KEY")

cd "$ROOT"
echo "Build frontend…"
npm ci
npm run build
echo "Build API…"
(cd server && npm ci && npm run build && npm ci --omit=dev)

echo "Upload to ${USER}@${HOST}:${REMOTE}/ …"
"${RSYNC[@]}" dist/ "${USER}@${HOST}:${REMOTE}/dist/"
"${RSYNC[@]}" start.js package.json "${USER}@${HOST}:${REMOTE}/"
"${RSYNC[@]}" server/dist server/node_modules server/package.json server/package-lock.json \
  server/migrate.ts server/migrations "${USER}@${HOST}:${REMOTE}/server/"

echo "Restart pm2…"
"${SSH[@]}" "${USER}@${HOST}" "export PATH=/usr/lib/ispnodejs/bin:\$PATH; cd ${REMOTE} && pm2 restart bulai.by"
echo "Done."
