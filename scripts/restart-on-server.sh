#!/bin/bash
# Перезапуск магазина на сервере: bash ~/bulai-shop/scripts/restart-on-server.sh
set -e

DEPLOY_DIR="${DEPLOY_DIR:-$HOME/bulai-shop}"
PORT="${PORT:-3001}"
LOG="${DEPLOY_DIR}/node.log"
NODE_BIN="${NODE_BIN:-$HOME/nodevenv/bulai-shop/20/bin/node}"

cd "$DEPLOY_DIR"

if [ ! -f "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node)"
fi

if [ ! -f start.js ] || [ ! -f server/dist/index.js ] || [ ! -d dist ]; then
  echo "ERROR: missing start.js, server/dist or dist in ${DEPLOY_DIR}"
  exit 1
fi

pkill -9 -u "$(whoami)" node 2>/dev/null || true
sleep 5

export PATH="$(dirname "$NODE_BIN"):$PATH"
nohup env PORT="$PORT" node start.js >> "$LOG" 2>&1 &
echo "bulai-shop restarted on PORT=${PORT}. PID: $!. Log: ${LOG}"
