#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/supabase-management-api.sh
source "$ROOT/scripts/lib/supabase-management-api.sh"

MODE="${1:-}"
case "$MODE" in
  apply|--verify-only) ;;
  *)
    echo "Usage: $0 [apply|--verify-only]" >&2
    exit 2
    ;;
esac

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "SUPABASE_ACCESS_TOKEN required" >&2
  exit 1
fi

command -v jq >/dev/null 2>&1 || { echo "jq required" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl required" >&2; exit 1; }

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

STATE_SQL="$TMP_DIR/admin-access-state.sql"
STATE_JSON="$TMP_DIR/admin-access-state.json"
BUNDLE="$TMP_DIR/warehouse-admin-access-bundle.sql"

cat > "$STATE_SQL" <<'SQL'
WITH expected_triggers(table_name) AS (
  VALUES
    ('warehouse_receivings'), ('warehouse_receiving_items'),
    ('warehouse_receiving_documents'), ('warehouse_receiving_tasks'),
    ('warehouse_putaways'), ('warehouse_putaway_items'),
    ('warehouse_putaway_suggestions'), ('warehouse_putaway_exceptions'),
    ('warehouse_putaway_tasks'),
    ('warehouse_pickings'), ('warehouse_picking_items'),
    ('warehouse_picking_tasks'), ('warehouse_picking_waves'),
    ('warehouse_picking_batches'), ('warehouse_picking_routes'),
    ('warehouse_picking_exceptions'), ('warehouse_picking_suggestions'),
    ('warehouse_packings'), ('warehouse_packing_items'),
    ('warehouse_packing_tasks'), ('warehouse_packing_exceptions'),
    ('warehouse_packing_packages'), ('warehouse_packing_package_items'),
    ('warehouse_packing_labels'), ('warehouse_packing_suggestions'),
    ('warehouse_shippings'), ('warehouse_shipping_items'),
    ('warehouse_shipping_tasks'), ('warehouse_shipping_docks'),
    ('warehouse_shipping_exceptions'), ('warehouse_shipping_manifests'),
    ('warehouse_shipping_packages'), ('warehouse_shipping_asns'),
    ('warehouse_shipping_proofs_of_delivery'),
    ('warehouse_shipping_suggestions'), ('warehouse_shipping_tracking_events'),
    ('warehouse_cycle_counts'), ('warehouse_cycle_count_items'),
    ('warehouse_cycle_count_tasks'), ('warehouse_cycle_count_exceptions'),
    ('warehouse_cycle_count_adjustments'), ('warehouse_cycle_count_results'),
    ('warehouse_cycle_count_approvals'), ('warehouse_cycle_count_reports'),
    ('warehouse_quality_inspections'), ('warehouse_quality_inspection_items'),
    ('warehouse_quality_documents'), ('warehouse_quality_exceptions'),
    ('warehouse_quality_samples'), ('warehouse_quality_tasks')
),
required_columns(table_name, column_name) AS (
  VALUES
    ('warehouse_users', 'id'),
    ('warehouse_users', 'account_id'),
    ('warehouse_users', 'user_id'),
    ('warehouse_users', 'role'),
    ('warehouse_users', 'status'),
    ('warehouse_users', 'username'),
    ('warehouse_users', 'display_name'),
    ('warehouse_users', 'must_change_password'),
    ('warehouse_users', 'auth_email'),
    ('warehouse_user_permissions', 'warehouse_user_id'),
    ('warehouse_user_permissions', 'permission'),
    ('warehouse_user_permissions', 'created_by')
),
state AS (
  SELECT
    (
      to_regclass('public.warehouse_users') IS NOT NULL
      AND to_regclass('public.warehouse_user_permissions') IS NOT NULL
      AND to_regclass('public.warehouse_audit_logs') IS NOT NULL
      AND to_regclass('public.warehouses') IS NOT NULL
      AND to_regclass('public.warehouse_locations') IS NOT NULL
      AND to_regclass('public.warehouse_receivings') IS NOT NULL
      AND to_regclass('public.warehouse_putaways') IS NOT NULL
      AND to_regclass('public.warehouse_pickings') IS NOT NULL
      AND to_regclass('public.warehouse_packings') IS NOT NULL
      AND to_regclass('public.warehouse_shippings') IS NOT NULL
      AND to_regclass('public.warehouse_cycle_counts') IS NOT NULL
      AND to_regclass('public.warehouse_quality_inspections') IS NOT NULL
      AND to_regprocedure('public.warehouse_has_account_role(uuid,text[])') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM required_columns required
        WHERE NOT EXISTS (
          SELECT 1
          FROM information_schema.columns actual
          WHERE actual.table_schema = 'public'
            AND actual.table_name = required.table_name
            AND actual.column_name = required.column_name
        )
      )
    ) AS prerequisites_ok,

    (
      to_regclass('public.warehouse_user_warehouse_assignments') IS NOT NULL
      AND to_regprocedure(
        'public.warehouse_admin_validate_user_request(uuid,uuid,text,text,text[],uuid[])'
      ) IS NOT NULL
      AND to_regprocedure('public.warehouse_admin_list_users(uuid)') IS NOT NULL
      AND to_regprocedure(
        'public.warehouse_admin_upsert_user(uuid,uuid,text,text,text,text,text[],uuid[])'
      ) IS NOT NULL
      AND to_regprocedure('public.warehouse_admin_convert_own_legacy_owner(uuid)') IS NOT NULL
      AND (
        SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'warehouse_user_warehouse_assignments'
          AND policyname = ANY(ARRAY[
            'warehouse_user_warehouse_assignments_select',
            'warehouse_user_warehouse_assignments_admin_insert',
            'warehouse_user_warehouse_assignments_admin_delete'
          ]::text[])
      ) = 3
      AND CASE
        WHEN to_regclass('public.warehouse_user_warehouse_assignments') IS NOT NULL
        THEN has_table_privilege(
          'authenticated',
          'public.warehouse_user_warehouse_assignments',
          'SELECT'
        )
        ELSE false
      END
      AND CASE
        WHEN to_regprocedure('public.warehouse_admin_list_users(uuid)') IS NOT NULL
        THEN has_function_privilege(
          'authenticated',
          'public.warehouse_admin_list_users(uuid)',
          'EXECUTE'
        )
        ELSE false
      END
      AND CASE
        WHEN to_regprocedure(
          'public.warehouse_admin_upsert_user(uuid,uuid,text,text,text,text,text[],uuid[])'
        ) IS NOT NULL
        THEN has_function_privilege(
          'authenticated',
          'public.warehouse_admin_upsert_user(uuid,uuid,text,text,text,text,text[],uuid[])',
          'EXECUTE'
        )
        ELSE false
      END
      AND CASE
        WHEN to_regprocedure('public.warehouse_admin_convert_own_legacy_owner(uuid)') IS NOT NULL
        THEN has_function_privilege(
          'authenticated',
          'public.warehouse_admin_convert_own_legacy_owner(uuid)',
          'EXECUTE'
        )
        ELSE false
      END
    ) AS admin_ready,

    (
      to_regprocedure('public.warehouse_has_warehouse_permission(uuid,uuid,text[])') IS NOT NULL
      AND to_regprocedure('public.warehouse_resolve_operational_warehouse(uuid,text,jsonb)') IS NOT NULL
      AND to_regprocedure('public.warehouse_operational_permissions_for_table(text)') IS NOT NULL
      AND to_regprocedure('public.warehouse_enforce_operational_write_access()') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM expected_triggers expected
        WHERE to_regclass(format('public.%I', expected.table_name)) IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM pg_trigger actual
            WHERE actual.tgrelid = to_regclass(format('public.%I', expected.table_name))
              AND actual.tgname = 'trg_warehouse_operational_access_guard'
              AND NOT actual.tgisinternal
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(ARRAY[
          'warehouse_receivings',
          'warehouse_putaways',
          'warehouse_pickings',
          'warehouse_packings',
          'warehouse_shippings',
          'warehouse_cycle_counts',
          'warehouse_quality_inspections'
        ]::text[]) AS required(table_name)
        WHERE NOT EXISTS (
          SELECT 1
          FROM pg_trigger actual
          WHERE actual.tgrelid = to_regclass(format('public.%I', required.table_name))
            AND actual.tgname = 'trg_warehouse_operational_access_guard'
            AND NOT actual.tgisinternal
        )
      )
    ) AS guard_ready,

    (
      (
        SELECT count(*) = 12
          AND count(DISTINCT actual.proname) = 12
          AND coalesce(bool_and(
            actual.prosrc ~* $packing$'inventory_controller'\s*,\s*'packer'\s*,\s*'picker'\s*,\s*'operator'$packing$
          ), false)
        FROM pg_proc actual
        JOIN pg_namespace ns ON ns.oid = actual.pronamespace
        WHERE ns.nspname = 'public'
          AND actual.prokind = 'f'
          AND actual.proname = ANY(ARRAY[
            'warehouse_packing_write',
            'warehouse_packing_create_from_picking',
            'warehouse_packing_confirm_item_write',
            'warehouse_packing_seal_package_write',
            'warehouse_packing_generate_package_label_write',
            'warehouse_packing_label_write',
            'warehouse_packing_resolve_exception_write',
            'warehouse_packing_complete_write',
            'warehouse_packing_mark_shipping_ready_write',
            'warehouse_packing_cancel_write',
            'warehouse_packing_add_package_item_write',
            'warehouse_packing_generate_suggestions_write'
          ]::text[])
      )
      AND
      (
        SELECT count(*) = 24
          AND count(DISTINCT actual.proname) = 24
          AND coalesce(bool_and(
            CASE
              WHEN actual.proname = 'warehouse_shipping_record_proof_of_delivery_write'
                THEN actual.prosrc ~* $driver$'inventory_controller'\s*,\s*'dispatcher'\s*,\s*'driver'\s*,\s*'picker'\s*,\s*'operator'$driver$
              ELSE actual.prosrc ~* $dispatcher$'inventory_controller'\s*,\s*'dispatcher'\s*,\s*'picker'\s*,\s*'operator'$dispatcher$
            END
          ), false)
        FROM pg_proc actual
        JOIN pg_namespace ns ON ns.oid = actual.pronamespace
        WHERE ns.nspname = 'public'
          AND actual.prokind = 'f'
          AND actual.proname = ANY(ARRAY[
            'warehouse_shipping_create_from_packing_write',
            'warehouse_shipping_start_loading_write',
            'warehouse_shipping_confirm_item_load_write',
            'warehouse_shipping_load_package_write',
            'warehouse_shipping_complete_loading_write',
            'warehouse_shipping_create_manifest_write',
            'warehouse_shipping_generate_manifest_write',
            'warehouse_shipping_approve_manifest_write',
            'warehouse_shipping_submit_manifest_write',
            'warehouse_shipping_create_asn_write',
            'warehouse_shipping_generate_asn_write',
            'warehouse_shipping_send_asn_write',
            'warehouse_shipping_acknowledge_asn_write',
            'warehouse_shipping_reject_asn_write',
            'warehouse_shipping_cancel_asn_write',
            'warehouse_shipping_dispatch_write',
            'warehouse_shipping_prepare_loading_write',
            'warehouse_shipping_accept_manifest_write',
            'warehouse_shipping_release_write',
            'warehouse_shipping_create_task_write',
            'warehouse_shipping_assign_carrier_vehicle_write',
            'warehouse_shipping_record_proof_of_delivery_write',
            'warehouse_shipping_create_exception_write',
            'warehouse_shipping_resolve_exception_write'
          ]::text[])
      )
    ) AS rpc_roles_ready
)
SELECT
  prerequisites_ok,
  admin_ready,
  guard_ready,
  rpc_roles_ready,
  (
    prerequisites_ok
    AND admin_ready
    AND guard_ready
    AND rpc_roles_ready
  ) AS ready
FROM state;
SQL

read_state() {
  local response_file="$1"
  local http
  http="$(mgmt_api_query_with_retry "$(cat "$STATE_SQL")" "$response_file" || true)"

  if [ "$http" != "200" ] && [ "$http" != "201" ]; then
    echo "WarehouseIQ Admin/access state query failed (HTTP ${http:-unknown})." >&2
    cat "$response_file" >&2 || true
    return 1
  fi

  if ! jq -e 'type == "array" and length > 0 and (.[0] | has("prerequisites_ok"))' \
    "$response_file" >/dev/null 2>&1; then
    echo "Unexpected state-query response; refusing to apply." >&2
    cat "$response_file" >&2 || true
    return 1
  fi
}

if ! read_state "$STATE_JSON"; then
  exit 1
fi

if ! jq -e '.[0].prerequisites_ok == true' "$STATE_JSON" >/dev/null; then
  echo "HATA: Admin/access migration önkoşulları üretimde doğrulanamadı." >&2
  jq '.[0] | {prerequisites_ok, admin_ready, guard_ready, rpc_roles_ready, ready}' \
    "$STATE_JSON" >&2
  exit 1
fi

if jq -e '.[0].ready == true' "$STATE_JSON" >/dev/null; then
  echo "WarehouseIQ Admin/access schema already ready; no migration replay needed."
  jq '.[0] | {prerequisites_ok, admin_ready, guard_ready, rpc_roles_ready, ready}' \
    "$STATE_JSON"
  exit 0
fi

if [ "$MODE" = "--verify-only" ]; then
  echo "WarehouseIQ Admin/access schema is not ready." >&2
  jq '.[0] | {prerequisites_ok, admin_ready, guard_ready, rpc_roles_ready, ready}' \
    "$STATE_JSON" >&2
  exit 1
fi

MIGRATIONS=(
  "20261011190000_warehouse_admin_user_access.sql"
  "20261011200000_warehouse_operational_access_guards.sql"
  "20261011210000_warehouse_rpc_role_alignment.sql"
)

{
  printf 'BEGIN;\n'
  printf "SET LOCAL lock_timeout = '10s';\n"
  printf "SET LOCAL statement_timeout = '300s';\n\n"

  for migration in "${MIGRATIONS[@]}"; do
    file="$ROOT/supabase/migrations/$migration"

    if [ ! -f "$file" ]; then
      echo "Missing migration: $file" >&2
      exit 1
    fi

    if grep -Eiq \
      'create[[:space:]]+(unique[[:space:]]+)?index[[:space:]]+concurrently|refresh[[:space:]]+materialized[[:space:]]+view[[:space:]]+concurrently' \
      "$file"; then
      echo "Transaction-incompatible concurrent DDL detected: $migration" >&2
      exit 1
    fi

    printf '%s\n' "-- ========================================================="
    printf '%s\n' "-- $migration"
    printf '%s\n' "-- ========================================================="
    cat "$file"
    printf '\n\n'
  done

  printf 'COMMIT;\n'
} > "$BUNDLE"

BUNDLE_BYTES="$(wc -c < "$BUNDLE" | tr -d ' ')"
echo "WarehouseIQ Admin/access atomic bundle:"
echo "  project_ref=${SUPABASE_PROJECT_REF}"
echo "  migrations=${#MIGRATIONS[@]}"
echo "  bytes=${BUNDLE_BYTES}"

if [ "$BUNDLE_BYTES" -gt 900000 ]; then
  echo "HATA: Admin/access SQL bundle 900000 byte güvenlik sınırını aşıyor." >&2
  exit 1
fi

APPLY_PAYLOAD_FILE="$TMP_DIR/admin-access-apply-payload.json"
APPLY_RESPONSE="$TMP_DIR/admin-access-apply-response.json"
jq -n --rawfile query "$BUNDLE" '{query: $query}' > "$APPLY_PAYLOAD_FILE"

# Send exactly one request. Do not replay an ambiguous migration request.
set +e
APPLY_HTTP="$(curl -sS --connect-timeout 10 --max-time 90 \
  -o "$APPLY_RESPONSE" -w '%{http_code}' \
  -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary "@$APPLY_PAYLOAD_FILE" 2>/dev/null)"
APPLY_CURL_EXIT=$?
set -e

if [ "$APPLY_CURL_EXIT" -ne 0 ] || [ -z "$APPLY_HTTP" ]; then
  APPLY_HTTP="000"
fi

if [ "$APPLY_HTTP" != "200" ] && [ "$APPLY_HTTP" != "201" ]; then
  echo "WarehouseIQ Admin/access request returned HTTP ${APPLY_HTTP}; no retry or direct DB fallback was attempted." >&2
  echo "The result may be ambiguous. Do not immediately rerun apply; run --verify-only after the request settles." >&2
  exit 1
fi

echo "WarehouseIQ Admin/access bundle submitted in one Management API request (HTTP ${APPLY_HTTP})."

if ! read_state "$STATE_JSON"; then
  echo "Migration gönderildi ancak son durum okunamadı; sonuç doğrulanamadı." >&2
  exit 1
fi

if ! jq -e '.[0].ready == true' "$STATE_JSON" >/dev/null; then
  echo "HATA: Migration sonrası doğrulama başarısız." >&2
  jq '.[0] | {prerequisites_ok, admin_ready, guard_ready, rpc_roles_ready, ready}' \
    "$STATE_JSON" >&2
  exit 1
fi

echo "WarehouseIQ Admin/access schema verified after atomic apply."
jq '.[0] | {prerequisites_ok, admin_ready, guard_ready, rpc_roles_ready, ready}' \
  "$STATE_JSON"
