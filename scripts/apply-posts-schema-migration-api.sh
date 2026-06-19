#!/usr/bin/env bash
# Idempotent: ensure full posts schema (content_type, cover_image_url, …) on production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/supabase-management-api.sh
source "$ROOT/scripts/lib/supabase-management-api.sh"

apply_sql_optional() {
  local file="$1"
  local label="$2"
  if mgmt_api_apply_sql_file "$file" "$label"; then
    return 0
  fi
  echo "::warning::Optional apply failed for $label (continuing)"
  return 0
}

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && ! mgmt_api__db_url >/dev/null 2>&1; then
  echo "SUPABASE_ACCESS_TOKEN or a direct DB URL (SUPABASE_DATABASE_URL, SUPABASE_DB_URL, DATABASE_URL, POSTGRES_URL) required" >&2
  exit 1
fi

if mgmt_api_posts_columns_ready; then
  echo "posts content_type and cover_image_url already present — skipping Management API apply"
  exit 0
fi

if ! mgmt_api_apply_sql_file "$ROOT/supabase/migrations/20260626_posts_full_schema_repair.sql" \
  "20260626_posts_full_schema_repair"; then
  mgmt_api_fail_unavailable
fi

if ! mgmt_api_apply_sql_file "$ROOT/supabase/migrations/20260627_posts_category_canonical.sql" \
  "20260627_posts_category_canonical"; then
  mgmt_api_fail_unavailable
fi

apply_sql_optional "$ROOT/supabase/migrations/20260624_posts_content_type_and_covers_storage.sql" \
  "20260624_posts_content_type_and_covers_storage"

if ! mgmt_api_posts_columns_ready; then
  mgmt_api_fail_unavailable
fi

echo "posts schema columns verified after apply"
