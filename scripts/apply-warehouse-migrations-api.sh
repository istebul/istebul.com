#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${SUPABASE_PROJECT_REF:-}"
TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
MODE="${1:-apply}"

if [ -z "$REF" ]; then
  echo "SUPABASE_PROJECT_REF required" >&2
  exit 1
fi

if [ -z "$TOKEN" ]; then
  echo "SUPABASE_ACCESS_TOKEN required" >&2
  exit 1
fi

command -v jq >/dev/null 2>&1 || {
  echo "jq required" >&2
  exit 1
}

command -v curl >/dev/null 2>&1 || {
  echo "curl required" >&2
  exit 1
}

case "$MODE" in
  apply|--verify-only)
    ;;
  *)
    echo "Usage: $0 [apply|--verify-only]" >&2
    exit 1
    ;;
esac

API="https://api.supabase.com/v1/projects/${REF}/database/query"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

post_sql_file() {
  local sql_file="$1"
  local label="$2"
  local response_file="$3"
  local payload_file="$TMP_DIR/payload.json"
  local http

  jq -n \
    --rawfile query "$sql_file" \
    '{query:$query}' \
    > "$payload_file"

  http="$(
    curl \
      --silent \
      --show-error \
      --retry 3 \
      --retry-delay 2 \
      --retry-all-errors \
      --output "$response_file" \
      --write-out '%{http_code}' \
      --request POST "$API" \
      --header "Authorization: Bearer ${TOKEN}" \
      --header "Content-Type: application/json" \
      --data-binary "@$payload_file"
  )"

  if [ "$http" = "200" ] || [ "$http" = "201" ]; then
    return 0
  fi

  echo "Management API SQL failed: ${label} (HTTP ${http})" >&2
  cat "$response_file" >&2 || true
  return 1
}

FOUNDATION_SQL="$TMP_DIR/foundation.sql"

cat > "$FOUNDATION_SQL" <<'SQL'
do $warehouse_foundation$
begin
  if to_regclass('public.warehouse_accounts') is null then
    raise exception 'warehouse foundation missing: warehouse_accounts';
  end if;

  if to_regclass('public.warehouse_locations') is null then
    raise exception 'warehouse foundation missing: warehouse_locations';
  end if;

  if to_regclass('public.warehouse_operations_dashboard_snapshots') is null then
    raise exception 'warehouse foundation missing: warehouse_operations_dashboard_snapshots';
  end if;
end
$warehouse_foundation$;
SQL

post_sql_file \
  "$FOUNDATION_SQL" \
  "WarehouseIQ foundation preflight" \
  "$TMP_DIR/foundation-response.json" || {
    echo "HATA: WarehouseIQ foundation production'da hazır değil." >&2
    exit 1
  }

RUNTIME_SQL="$TMP_DIR/runtime-ready.sql"

cat > "$RUNTIME_SQL" <<'SQL'
do $warehouse_runtime$
begin
  if to_regclass('public.warehouse_inventory_balances') is null then
    raise exception 'warehouse runtime missing: warehouse_inventory_balances';
  end if;

  if to_regclass('public.warehouse_cycle_counts') is null then
    raise exception 'warehouse runtime missing: warehouse_cycle_counts';
  end if;

  if to_regclass('public.warehouse_cycle_count_rules') is null then
    raise exception 'warehouse runtime missing: warehouse_cycle_count_rules';
  end if;

  if to_regclass('public.warehouse_cycle_count_schedules') is null then
    raise exception 'warehouse runtime missing: warehouse_cycle_count_schedules';
  end if;

  if to_regclass('public.warehouse_cycle_count_schedule_runs') is null then
    raise exception 'warehouse runtime missing: warehouse_cycle_count_schedule_runs';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'warehouse_cycle_count_process_due_schedules'
  ) then
    raise exception 'warehouse runtime missing: warehouse_cycle_count_process_due_schedules';
  end if;
end
$warehouse_runtime$;
SQL

runtime_ready() {
  post_sql_file \
    "$RUNTIME_SQL" \
    "WarehouseIQ runtime verification" \
    "$TMP_DIR/runtime-response.json"
}

if runtime_ready >/dev/null 2>&1; then
  echo "WarehouseIQ production schema already ready."
  exit 0
fi

if [ "$MODE" = "--verify-only" ]; then
  echo "WarehouseIQ production schema is not ready." >&2
  exit 1
fi

MIGRATIONS=(
  "20260811222000_warehouse_product_inventory_persistence.sql"
  "20260811224000_warehouse_receiving_write_persistence.sql"
  "20260811235200_warehouse_atomic_inventory_posting.sql"
  "20260812101500_warehouse_putaway_persistence.sql"
  "20260812105000_warehouse_putaway_write_foundation.sql"
  "20260812124500_warehouse_putaway_atomic_execute.sql"
  "20260812132000_warehouse_putaway_complete.sql"
  "20260812161000_warehouse_picking_persistence.sql"
  "20260812164500_warehouse_picking_write_foundation.sql"
  "20260812170500_warehouse_inventory_reservation_persistence.sql"
  "20260812174500_warehouse_picking_atomic_execute.sql"
  "20260812181500_warehouse_picking_complete.sql"
  "20260812184500_warehouse_picking_resolve_exception.sql"
  "20260812212000_warehouse_quality_control_persistence.sql"
  "20260813080000_warehouse_quality_control_write_foundation.sql"
  "20260813130000_warehouse_cycle_count_persistence.sql"
  "20260813170000_warehouse_cycle_count_quantity_write.sql"
  "20260813213500_warehouse_cycle_count_variance_recount_persistence.sql"
  "20260813221000_warehouse_cycle_count_first_evaluation.sql"
  "20260813233000_warehouse_cycle_count_recount_quantity_write.sql"
  "20260814003000_warehouse_cycle_count_recount_evaluation.sql"
  "20260814010000_warehouse_cycle_count_completion.sql"
  "20260814011500_warehouse_cycle_count_recount_request_payload_fix.sql"
  "20260814012000_warehouse_cycle_count_completion_rpc.sql"
  "20260814013000_warehouse_cycle_count_management_read.sql"
  "20260814014000_warehouse_cycle_count_periodic_planning.sql"
  "20260814015000_warehouse_cycle_count_periodic_runtime.sql"
)

BUNDLE="$TMP_DIR/warehouse-production-bundle.sql"

{
  echo "begin;"
  echo "set local lock_timeout = '10s';"
  echo "set local statement_timeout = '300s';"
  echo

  for migration in "${MIGRATIONS[@]}"; do
    file="$ROOT/supabase/migrations/$migration"

    if [ ! -f "$file" ]; then
      echo "Missing migration: $file" >&2
      exit 1
    fi

    if grep -Eiq \
      '^[[:space:]]*(begin|commit|rollback|vacuum|reindex|cluster|create[[:space:]]+database)[[:space:];]' \
      "$file"; then
      echo "Transaction-incompatible statement detected: $migration" >&2
      exit 1
    fi

    if grep -Eiq \
      'create[[:space:]]+(unique[[:space:]]+)?index[[:space:]]+concurrently|refresh[[:space:]]+materialized[[:space:]]+view[[:space:]]+concurrently' \
      "$file"; then
      echo "Concurrent DDL detected: $migration" >&2
      exit 1
    fi

    echo "-- ========================================================="
    echo "-- $migration"
    echo "-- ========================================================="
    cat "$file"
    echo
  done

  echo "commit;"
} > "$BUNDLE"

BUNDLE_BYTES="$(wc -c < "$BUNDLE" | tr -d ' ')"

echo "WarehouseIQ atomic migration bundle:"
echo "  migrations=${#MIGRATIONS[@]}"
echo "  bytes=$BUNDLE_BYTES"

if [ "$BUNDLE_BYTES" -gt 900000 ]; then
  echo "HATA: Atomic Management API bundle 900000 byte güvenlik sınırını aşıyor." >&2
  exit 1
fi

post_sql_file \
  "$BUNDLE" \
  "WarehouseIQ atomic production migration bundle" \
  "$TMP_DIR/apply-response.json"

runtime_ready

echo "WarehouseIQ production schema verified after atomic apply."
echo "Migration history was NOT modified."
