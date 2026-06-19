#!/usr/bin/env bash
# Fallback: apply Konut/Finans vertical schema via Supabase Management API when db push is blocked.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/supabase-management-api.sh
source "$ROOT/scripts/lib/supabase-management-api.sh"

SQL_FILE="$ROOT/supabase/migrations/20260528_vertical_konut_finans.sql"
LABEL="20260528_vertical_konut_finans"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && ! mgmt_api__db_url >/dev/null 2>&1; then
  echo "SUPABASE_ACCESS_TOKEN or a direct DB URL (SUPABASE_DATABASE_URL, SUPABASE_DB_URL, DATABASE_URL, POSTGRES_URL) required" >&2
  exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
  echo "Missing $SQL_FILE" >&2
  exit 1
fi

if mgmt_api_vertical_konut_finans_schema_ready; then
  echo "vertical_events and vertical_leads already present — skipping Management API apply"
  exit 0
fi

if ! mgmt_api_apply_sql_file "$SQL_FILE" "$LABEL"; then
  mgmt_api_fail_unavailable
fi

if ! mgmt_api_vertical_konut_finans_schema_ready; then
  mgmt_api_fail_unavailable
fi

echo "vertical Konut/Finans schema verified after apply"
