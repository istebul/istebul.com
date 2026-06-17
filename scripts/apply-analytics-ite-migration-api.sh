#!/usr/bin/env bash
# Idempotent: ensure analytics internal traffic exclusion schema exists on prod.
# Used when `supabase db push` fails (e.g. schema_migrations_pkey drift).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/supabase-management-api.sh
source "$ROOT/scripts/lib/supabase-management-api.sh"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && ! mgmt_api__db_url >/dev/null 2>&1; then
  echo "SUPABASE_ACCESS_TOKEN or a direct DB URL (SUPABASE_DATABASE_URL, SUPABASE_DB_URL, DATABASE_URL, POSTGRES_URL) required" >&2
  exit 1
fi

PRIMARY="$ROOT/supabase/migrations/20260602_analytics_internal_traffic.sql"
REPAIR="$ROOT/supabase/migrations/20260620_analytics_internal_traffic_repair.sql"

if mgmt_api_analytics_schema_ready; then
  echo "analytics_exclusion_rules already present — skipping Management API apply"
  exit 0
fi

if ! mgmt_api_apply_sql_file "$PRIMARY" "20260602_analytics_internal_traffic"; then
  mgmt_api_fail_unavailable
fi

if ! mgmt_api_apply_sql_file "$REPAIR" "20260620_analytics_internal_traffic_repair"; then
  mgmt_api_fail_unavailable
fi

if ! mgmt_api_analytics_schema_ready; then
  mgmt_api_fail_unavailable
fi

echo "analytics_exclusion_rules verified after apply"
