#!/usr/bin/env bash
# Fallback: apply AI listings migrations via Supabase Management API when db push is blocked.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${SUPABASE_PROJECT_REF:-hjfrcdstbyonmgatgwcc}"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "SUPABASE_ACCESS_TOKEN required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq required for Management API payload" >&2
  exit 1
fi

MIGRATIONS=(
  "$ROOT/supabase/migrations/20260701_ai_listings_engine_v1.sql"
  "$ROOT/supabase/migrations/20260702_ai_listings_publish_learning_v1.sql"
  "$ROOT/supabase/migrations/20260703_ai_listings_site_settings.sql"
)

for SQL_FILE in "${MIGRATIONS[@]}"; do
  if [ ! -f "$SQL_FILE" ]; then
    echo "Missing $SQL_FILE" >&2
    exit 1
  fi

  echo "Applying $(basename "$SQL_FILE")..."
  PAYLOAD="$(jq -n --rawfile query "$SQL_FILE" '{query: $query}')"
  HTTP="$(curl -sS -o /tmp/supabase-ai-listings-query.json -w '%{http_code}' \
    -X POST "https://api.supabase.com/v1/projects/${REF}/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")"

  if [ "$HTTP" != "200" ] && [ "$HTTP" != "201" ]; then
    echo "Management API query failed HTTP $HTTP for $(basename "$SQL_FILE")" >&2
    cat /tmp/supabase-ai-listings-query.json >&2
    exit 1
  fi
  echo "OK $(basename "$SQL_FILE") (HTTP $HTTP)"
done

echo "AI listings migrations applied via Management API"
