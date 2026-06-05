#!/usr/bin/env bash
# Apply vertical partner dispatch migration via Supabase Management API when db push drifts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${SUPABASE_PROJECT_REF:-hjfrcdstbyonmgatgwcc}"
SQL_FILE="$ROOT/supabase/migrations/20260629_vertical_partner_dispatch_repair.sql"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "SUPABASE_ACCESS_TOKEN required" >&2
  exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
  echo "Missing $SQL_FILE" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq required" >&2
  exit 1
fi

PAYLOAD="$(jq -n --rawfile query "$SQL_FILE" '{query: $query}')"

HTTP="$(curl -sS -o /tmp/vpd-migration.json -w '%{http_code}' \
  -X POST "https://api.supabase.com/v1/projects/${REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")"

if [ "$HTTP" != "200" ] && [ "$HTTP" != "201" ]; then
  echo "Management API query failed HTTP $HTTP" >&2
  cat /tmp/vpd-migration.json >&2
  exit 1
fi

echo "Applied vertical partner dispatch migration via Management API (HTTP $HTTP)"
