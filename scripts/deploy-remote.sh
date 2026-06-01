#!/bin/bash
# Деплой bulai-shop на Hoster.by (вызывается из GitHub Actions по SSH).
# Ожидается каталог ~/bulai-shop с dist.tar.gz и server.tar.gz.
set -e

DEPLOY_DIR="${DEPLOY_DIR:-$HOME/bulai-shop}"
cd "$DEPLOY_DIR"

if [ ! -f dist.tar.gz ] || [ ! -f server.tar.gz ]; then
  echo "ERROR: dist.tar.gz or server.tar.gz not found in $(pwd). Contents:"
  ls -la
  exit 1
fi

PORT="${PORT:-3001}"
echo "Stopping Node on port ${PORT}..."
pkill -9 -u "$(whoami)" node 2>/dev/null || true
sleep 5

AVAIL_KB=$(df -k . | awk 'NR==2 {print $4}')
if [ "$AVAIL_KB" -lt 120000 ]; then
  echo "ERROR: Not enough disk space (need ~120MB free). Current: $((AVAIL_KB / 1024)) MB"
  df -h .
  exit 1
fi

for archive in dist.tar.gz server.tar.gz; do
  if ! tar -tzf "$archive" > /dev/null 2>&1; then
    echo "ERROR: $archive corrupted or incomplete."
    exit 1
  fi
done

echo "Removing old frontend and server build..."
rm -rf dist
mkdir -p server
# server/.env не трогаем
if [ -f server/.env ]; then
  mv server/.env /tmp/bulai-shop-env-backup.$$
fi
rm -rf server/dist server/node_modules
mkdir -p server

tar -xzf dist.tar.gz
tar -xzf server.tar.gz -C server
rm -f dist.tar.gz server.tar.gz

if [ -f "/tmp/bulai-shop-env-backup.$$" ]; then
  mv "/tmp/bulai-shop-env-backup.$$" server/.env
fi

mkdir -p tmp
touch tmp/restart.txt
echo "Deploy done in ${DEPLOY_DIR}. Run restart-on-server.sh or wait for Passenger."
