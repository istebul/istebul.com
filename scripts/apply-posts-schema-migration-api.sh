#!/usr/bin/env bash
# Idempotent: ensure full posts schema (content_type, cover_image_url, …) on production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${SUPABASE_PROJECT_REF:-hjfrcdstbyonmgatgwcc}"

apply_sql() {
  local file="$1"
  local label="$2"
  if [ ! -f "$file" ]; then
    echo "Missing $file" >&2
    exit 1
  fi
  if ! command -v jq >/dev/null 2>&1; then
    echo "jq required" >&2
    exit 1
  fi
  local payload
  payload="$(jq -n --rawfile query "$file" '{query: $query}')"
  local http
  http="$(curl -sS -o /tmp/supabase-posts-query.json -w '%{http_code}' \
    -X POST "https://api.supabase.com/v1/projects/${REF}/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload")"
  if [ "$http" != "200" ] && [ "$http" != "201" ]; then
    echo "Management API failed for $label (HTTP $http)" >&2
    cat /tmp/supabase-posts-query.json >&2
    exit 1
  fi
  echo "Applied $label via Management API (HTTP $http)"
}

apply_sql_optional() {
  local file="$1"
  local label="$2"
  if apply_sql "$file" "$label"; then
    return 0
  fi
  echo "::warning::Optional apply failed for $label (continuing)"
  return 0
}

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "SUPABASE_ACCESS_TOKEN required" >&2
  exit 1
fi

apply_sql "$ROOT/supabase/migrations/20260626_posts_full_schema_repair.sql" \
  "20260626_posts_full_schema_repair"

apply_sql_optional "$ROOT/supabase/migrations/20260624_posts_content_type_and_covers_storage.sql" \
  "20260624_posts_content_type_and_covers_storage"
