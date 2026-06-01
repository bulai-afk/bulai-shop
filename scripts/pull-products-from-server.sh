#!/usr/bin/env bash
# Скачивает каталог и справочники товаров с продакшена в data/sync/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_DIR="${ROOT}/data/sync"
API_BASE="${PULL_API_BASE:-https://bulai.by}"
CURL=(curl -fsSL)
if [[ "${PULL_INSECURE_SSL:-1}" == "1" ]]; then
  CURL+=(--insecure)
fi

mkdir -p "$SYNC_DIR"

fetch() {
  local segment="$1"
  local out="$2"
  echo "GET ${API_BASE}/api/admin/data/${segment} → ${out}"
  "${CURL[@]}" "${API_BASE}/api/admin/data/${segment}" -o "${SYNC_DIR}/${out}.remote.json"
  node -e "
    const fs = require('fs');
    const body = JSON.parse(fs.readFileSync('${SYNC_DIR}/${out}.remote.json', 'utf8'));
    if (body.data == null) {
      console.error('${segment}: data is null on server');
      process.exit(1);
    }
    fs.writeFileSync('${SYNC_DIR}/${out}.json', JSON.stringify(body.data, null, 2) + '\n');
    const d = body.data;
    if (Array.isArray(d.catalog)) {
      console.log('  catalog:', d.catalog.length, 'warehouses:', (d.warehouses||[]).length, 'stocks:', (d.stocks||[]).length);
    } else if (Array.isArray(d.dictionaries)) {
      console.log('  dictionaries:', d.dictionaries.length);
    }
  "
}

fetch products-inventory products-inventory
fetch products-dictionaries products-dictionaries

echo "Done. Files: ${SYNC_DIR}/products-inventory.json, ${SYNC_DIR}/products-dictionaries.json"
