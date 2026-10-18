#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

REF="${SUPABASE_PROJECT_REF:-}"
TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
MODE="${1:-}"

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

command -v python3 >/dev/null 2>&1 || {
  echo "python3 required" >&2
  exit 1
}

case "$MODE" in
  --apply|--verify-only)
    ;;
  *)
    echo "Usage: $0 [--verify-only|--apply]" >&2
    exit 1
    ;;
esac

API_SCHEME="https"
API_HOST="api.supabase.com"
API="${API_SCHEME}://${API_HOST}/v1/projects/${REF}/database/query"

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

VERIFY_SQL="$TMP_DIR/verify.sql"

cat > "$VERIFY_SQL" <<'SQL'
do $warehouse_integration_verify$
begin
  if to_regclass('public.warehouse_erp_outbox') is null then
    raise exception 'warehouse ERP outbox table missing';
  end if;

  if to_regclass('public.warehouse_integration_connectors') is null then
    raise exception 'warehouse integration connectors table missing';
  end if;

  if to_regclass('public.warehouse_integrations') is null then
    raise exception 'warehouse integrations table missing';
  end if;

  if to_regclass('public.warehouse_integration_capabilities') is null then
    raise exception 'warehouse integration capabilities table missing';
  end if;

  if to_regclass('public.warehouse_integration_mappings') is null then
    raise exception 'warehouse integration mappings table missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'warehouse_erp_outbox'
      and column_name = 'integration_id'
  ) then
    raise exception 'warehouse ERP outbox integration_id column missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'warehouse_erp_outbox'
      and column_name = 'connector_key'
  ) then
    raise exception 'warehouse ERP outbox connector_key column missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'warehouse_integrations'
      and column_name = 'credential_secret_id'
  ) then
    raise exception 'warehouse integration credential_secret_id column missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'warehouse_erp_enqueue_shipping_dispatched'
  ) then
    raise exception 'warehouse ERP dispatch enqueue function missing';
  end if;

  if to_regprocedure(
    'public.warehouse_erp_outbox_claim(integer)'
  ) is null then
    raise exception 'warehouse ERP outbox claim function missing';
  end if;

  if to_regprocedure(
    'public.warehouse_erp_outbox_ack(uuid,jsonb)'
  ) is null then
    raise exception 'warehouse ERP outbox ack function missing';
  end if;

  if to_regprocedure(
    'public.warehouse_erp_outbox_fail(uuid,text,integer)'
  ) is null then
    raise exception 'warehouse ERP outbox fail function missing';
  end if;

  if to_regprocedure(
    'public.warehouse_erp_outbox_route_unrouted(integer)'
  ) is null then
    raise exception 'warehouse ERP unrouted routing function missing';
  end if;

  if to_regprocedure(
    'public.warehouse_integration_get_runtime(uuid)'
  ) is null then
    raise exception 'warehouse integration runtime function missing';
  end if;

  if to_regprocedure(
    'public.warehouse_integration_set_credential(uuid,text,text,text)'
  ) is null then
    raise exception 'warehouse integration credential set function missing';
  end if;

  if to_regprocedure(
    'public.warehouse_integration_detach_credential(uuid)'
  ) is null then
    raise exception 'warehouse integration credential detach function missing';
  end if;


  -- Güncel dispatch fonksiyonunun boş sipariş alanlarını desteklediğini doğrula.
  if position(
    'nullif(btrim(new.order_id),'
    in regexp_replace(
      lower(pg_get_functiondef(
        to_regprocedure('public.warehouse_erp_enqueue_shipping_dispatched()')
      )),
      '[[:space:]]+', '', 'g'
    )
  ) = 0 or position(
    'nullif(btrim(new.order_number),'
    in regexp_replace(
      lower(pg_get_functiondef(
        to_regprocedure('public.warehouse_erp_enqueue_shipping_dispatched()')
      )),
      '[[:space:]]+', '', 'g'
    )
  ) = 0 then
    raise exception 'warehouse ERP dispatch function is missing optional order-field handling';
  end if;

  -- Credential fonksiyonları ilgili entegrasyon satırını kilitlemeli.
  if position(
    'whereintegration.id=p_integration_idforupdate'
    in regexp_replace(
      lower(pg_get_functiondef(
        to_regprocedure('public.warehouse_integration_set_credential(uuid,text,text,text)')
      )),
      '[[:space:]]+', '', 'g'
    )
  ) = 0 then
    raise exception 'warehouse integration credential set function is missing row lock on target integration';
  end if;

  -- Ayırma, aktif/test durumunu açıkça engellemeli ve paylaşılan sırrı korumalı.
  if position(
    'whereintegration.id=p_integration_idforupdate'
    in regexp_replace(
      lower(pg_get_functiondef(
        to_regprocedure('public.warehouse_integration_detach_credential(uuid)')
      )),
      '[[:space:]]+', '', 'g'
    )
  ) = 0
  or position(
    'ifv_statusin(''active'',''testing'')then'
    in regexp_replace(
      lower(pg_get_functiondef(
        to_regprocedure('public.warehouse_integration_detach_credential(uuid)')
      )),
      '[[:space:]]+', '', 'g'
    )
  ) = 0
  or position(
    'deletefromvault.secretsassecret'
    in regexp_replace(
      lower(pg_get_functiondef(
        to_regprocedure('public.warehouse_integration_detach_credential(uuid)')
      )),
      '[[:space:]]+', '', 'g'
    )
  ) = 0
  or position(
    'notexists(select1frompublic.warehouse_integrationsasother_integrationwhereother_integration.credential_secret_id=v_secret_id)'
    in regexp_replace(
      lower(pg_get_functiondef(
        to_regprocedure('public.warehouse_integration_detach_credential(uuid)')
      )),
      '[[:space:]]+', '', 'g'
    )
  ) = 0 then
    raise exception 'warehouse integration credential detach function is missing exact safety guards';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c
      on c.oid = t.tgrelid
    join pg_namespace n
      on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = 'public'
      and c.relname = 'warehouse_shippings'
      and t.tgname =
        'warehouse_erp_enqueue_shipping_dispatched'
  ) then
    raise exception 'warehouse ERP dispatch trigger missing';
  end if;

  -- WAREHOUSEIQ SECURITY VERIFICATION
  -- Outbox ve Integration Hub tablolarinda RLS etkin olmali.
  if exists (
    select 1
    from (
      values
        ('warehouse_erp_outbox'),
        ('warehouse_integrations'),
        ('warehouse_integration_capabilities'),
        ('warehouse_integration_mappings'),
        ('warehouse_integration_connectors')
    ) as expected(table_name)
    left join pg_class c
      on c.oid = to_regclass('public.' || expected.table_name)
    where c.oid is null
       or not c.relrowsecurity
  ) then
    raise exception 'WarehouseIQ outbox/Integration Hub table missing or RLS disabled';
  end if;

  -- Trigger normal calismada etkin olmali; replica-only veya disabled olmamali.
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = 'public'
      and c.relname = 'warehouse_shippings'
      and t.tgname = 'warehouse_erp_enqueue_shipping_dispatched'
      and t.tgenabled in ('O', 'A')
  ) then
    raise exception 'WarehouseIQ shipping dispatch trigger is missing or not enabled for normal operation';
  end if;

  -- Worker/runtime RPC'leri service_role tarafindan cagrilabilmeli.
  -- PUBLIC yetkisi de anon/authenticated kontrollerinde yakalanir.
  if exists (
    select 1
    from (
      values
        ('public.warehouse_erp_outbox_claim(integer)'),
        ('public.warehouse_erp_outbox_ack(uuid,jsonb)'),
        ('public.warehouse_erp_outbox_fail(uuid,text,integer)'),
        ('public.warehouse_erp_outbox_route_unrouted(integer)'),
        ('public.warehouse_integration_get_runtime(uuid)')
    ) as expected(signature)
    cross join lateral (
      select to_regprocedure(expected.signature) as proc_oid
    ) resolved
    where resolved.proc_oid is null
       or not has_function_privilege(
         'service_role', resolved.proc_oid, 'EXECUTE'
       )
       or has_function_privilege(
         'anon', resolved.proc_oid, 'EXECUTE'
       )
       or has_function_privilege(
         'authenticated', resolved.proc_oid, 'EXECUTE'
       )
  ) then
    raise exception 'WarehouseIQ worker/runtime function EXECUTE grants do not match service_role-only policy';
  end if;

  -- Trigger fonksiyonu dogrudan istemci rollerince cagrilamamali.
  if has_function_privilege(
       'anon',
       to_regprocedure(
         'public.warehouse_erp_enqueue_shipping_dispatched()'
       ),
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       to_regprocedure(
         'public.warehouse_erp_enqueue_shipping_dispatched()'
       ),
       'EXECUTE'
     ) then
    raise exception 'WarehouseIQ dispatch trigger function is directly executable by client roles';
  end if;

  if not exists (
    select 1
    from public.warehouse_integration_connectors
    where connector_key = 'netsis'
  ) then
    raise exception 'connector seed missing: netsis';
  end if;

  if not exists (
    select 1
    from public.warehouse_integration_connectors
    where connector_key = 'sap'
  ) then
    raise exception 'connector seed missing: sap';
  end if;

  if not exists (
    select 1
    from public.warehouse_integration_connectors
    where connector_key = 'nebim'
  ) then
    raise exception 'connector seed missing: nebim';
  end if;

  if not exists (
    select 1
    from public.warehouse_integration_connectors
    where connector_key = 'oracle'
  ) then
    raise exception 'connector seed missing: oracle';
  end if;

  if not exists (
    select 1
    from pg_extension
    where extname = 'supabase_vault'
  ) then
    raise exception 'supabase_vault extension missing';
  end if;
end
$warehouse_integration_verify$;
SQL

if post_sql_file \
  "$VERIFY_SQL" \
  "WarehouseIQ ERP/ERI outbox verification" \
  "$TMP_DIR/verify-response.json"; then

  echo "WarehouseIQ Integration Hub production schema already ready."
  exit 0
fi

if [ "$MODE" = "--verify-only" ]; then
  echo "WarehouseIQ Integration Hub production schema is not ready." >&2
  exit 1
fi

# Only proceed when the API response contains a known exception raised
# by this verifier. Authentication, transport, permission, and SQL errors
# must fail closed instead of triggering migrations.
if ! python3 - "$VERIFY_SQL" "$TMP_DIR/verify-response.json" <<'PYVERIFY'
import re
import sys
from pathlib import Path

sql = Path(sys.argv[1]).read_text(errors="replace")
response = Path(sys.argv[2]).read_text(errors="replace").casefold()
messages = re.findall(
    r"raise\s+exception\s+'((?:[^']|'')*)'",
    sql,
    flags=re.IGNORECASE | re.DOTALL,
)
messages = [message.replace("''", "'").casefold() for message in messages]

if not messages or not any(message in response for message in messages):
    sys.exit(1)
PYVERIFY
then
  echo "Initial verification failed for an unexpected reason; refusing to apply migrations." >&2
  echo "Inspect the API response and live schema before deciding what to do next." >&2
  exit 1
fi

echo "A known verifier exception was returned. Continuing only because --apply was explicitly requested."

MIGRATIONS=(
  "20261007090000_warehouse_erp_outbox.sql"
  "20261007100000_warehouse_erp_outbox_worker.sql"
  "20261007120000_warehouse_integration_hub_foundation.sql"
  "20261007130000_warehouse_integration_runtime.sql"
  "20261007140000_warehouse_integration_credentials_vault.sql"
  "20261008010000_warehouse_erp_outbox_order_optional.sql"
  "20261009170000_warehouse_integration_detach_credential_atomic.sql"
)

BUNDLE="$TMP_DIR/warehouse-erp-bundle.sql"

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

echo "WarehouseIQ Integration Hub atomic migration bundle:"
echo "  migrations=${#MIGRATIONS[@]}"
echo "  bytes=$BUNDLE_BYTES"

if [ "$BUNDLE_BYTES" -gt 900000 ]; then
  echo "HATA: ERP/ERI bundle 900000 byte güvenlik sınırını aşıyor." >&2
  exit 1
fi

if ! post_sql_file \
  "$BUNDLE" \
  "WarehouseIQ ERP/ERI atomic migration bundle" \
  "$TMP_DIR/apply-response.json"; then
  echo "ERROR: Migration request failed. Its outcome may be uncertain if the connection failed after submission." >&2
  echo "Do not retry until the live schema state has been checked." >&2
  exit 1
fi

if ! post_sql_file \
  "$VERIFY_SQL" \
  "WarehouseIQ ERP/ERI outbox verification after apply" \
  "$TMP_DIR/post-verify-response.json"; then
  echo "CRITICAL: Migration request returned success, but post-apply verification failed." >&2
  echo "Changes may already be committed. Do not rerun migrations automatically." >&2
  exit 1
fi

echo "WarehouseIQ Integration Hub production schema verified."
echo "Migration history was not modified."
