import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260819001000_warehouse_location_bootstrap_write.sql";

const sql = await readFile(
  migrationPath,
  "utf8",
);

function executableSql(source) {
  return source
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

const normalized =
  executableSql(sql);

test(
  "location bootstrap creates exact secure write-request table",
  () => {
    assert.match(
      normalized,
      /create table if not exists public\.warehouse_location_write_requests \(/i,
    );

    assert.match(
      normalized,
      /request_id uuid primary key/i,
    );

    assert.match(
      normalized,
      /action text not null/i,
    );

    assert.match(
      normalized,
      /check \(action = 'bootstrap_create'\)/i,
    );

    assert.match(
      normalized,
      /request_payload jsonb not null/i,
    );

    assert.match(
      normalized,
      /response_payload jsonb/i,
    );

    assert.match(
      normalized,
      /alter table public\.warehouse_location_write_requests enable row level security/i,
    );
  },
);

test(
  "write-request table has no direct anon or authenticated privileges",
  () => {
    for (const role of [
      "public",
      "anon",
      "authenticated",
    ]) {
      assert.match(
        normalized,
        new RegExp(
          `revoke all on table public\\.warehouse_location_write_requests from ${role}`,
          "i",
        ),
      );
    }

    assert.doesNotMatch(
      normalized,
      /grant\s+(?:select|insert|update|delete|truncate|references|trigger|all)[\s\S]*?warehouse_location_write_requests[\s\S]*?to\s+(?:anon|authenticated|public)/i,
    );
  },
);

test(
  "bootstrap RPC is SECURITY DEFINER with fixed search_path",
  () => {
    assert.match(
      normalized,
      /create or replace function public\.warehouse_location_bootstrap_write\(/i,
    );

    assert.match(
      normalized,
      /returns jsonb language plpgsql security definer set search_path = public, pg_temp/i,
    );
  },
);

test(
  "bootstrap RPC requires auth.uid and active caller membership",
  () => {
    assert.match(
      normalized,
      /v_user_id uuid := auth\.uid\(\)/i,
    );

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_AUTH_REQUIRED/i,
    );

    assert.match(
      normalized,
      /from public\.warehouse_users wu/i,
    );

    assert.match(
      normalized,
      /wu\.account_id = p_account_id/i,
    );

    assert.match(
      normalized,
      /wu\.user_id = v_user_id/i,
    );

    assert.match(
      normalized,
      /wu\.status = 'active'/i,
    );
  },
);

test(
  "bootstrap RPC uses exact location-create role allowlist",
  () => {
    for (const role of [
      "owner",
      "admin",
      "warehouse_manager",
      "supervisor",
      "inventory_controller",
    ]) {
      assert.match(
        normalized,
        new RegExp(
          `'${role}'`,
          "i",
        ),
      );
    }

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_FORBIDDEN/i,
    );
  },
);

test(
  "warehouse is tenant-scoped, active, and locked before create",
  () => {
    assert.match(
      normalized,
      /from public\.warehouses w where w\.account_id = p_account_id and w\.id = p_warehouse_id for update/i,
    );

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_WAREHOUSE_NOT_FOUND/i,
    );

    assert.match(
      normalized,
      /v_warehouse_status <> 'active'/i,
    );

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_WAREHOUSE_NOT_ACTIVE/i,
    );
  },
);

test(
  "server normalizes code and hierarchy and generates identity",
  () => {
    assert.match(
      normalized,
      /v_code := upper\( btrim\( coalesce\( p_code, '' \) \) \)/i,
    );

    assert.match(
      normalized,
      /v_zone_code := upper\( btrim\( coalesce\( p_zone_code, '' \) \) \)/i,
    );

    assert.match(
      normalized,
      /concat_ws\( '-', v_zone_code, v_aisle_code, v_rack_code, v_level_code, v_bin_code \)/i,
    );

    assert.match(
      normalized,
      /format\( 'LOC:%s:%s', p_warehouse_id, v_full_code \)/i,
    );

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_INVALID_CODE/i,
    );
  },
);

test(
  "location type uses exact domain allowlist",
  () => {
    const types = [
      "receiving",
      "quality_control",
      "reserve",
      "picking",
      "bulk",
      "cold_storage",
      "hazardous",
      "returns",
      "damaged",
      "packing",
      "shipping",
      "cross_dock",
    ];

    for (const type of types) {
      assert.match(
        normalized,
        new RegExp(
          `'${type}'`,
          "i",
        ),
      );
    }

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_INVALID_TYPE/i,
    );
  },
);

test(
  "capacity dimensions coordinates and temperature are validated",
  () => {
    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_INVALID_CAPACITY/i,
    );

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_INVALID_DIMENSIONS/i,
    );

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_INVALID_TEMPERATURE/i,
    );

    assert.match(
      normalized,
      /'NaN'/i,
    );

    assert.match(
      normalized,
      /'Infinity'/i,
    );

    assert.match(
      normalized,
      /'-Infinity'/i,
    );
  },
);

test(
  "parent location is restricted to the same account and warehouse",
  () => {
    assert.match(
      normalized,
      /from public\.warehouse_locations wl where wl\.id = p_parent_location_id and wl\.account_id = p_account_id and wl\.warehouse_id = p_warehouse_id for share/i,
    );

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_PARENT_NOT_FOUND/i,
    );
  },
);

test(
  "created_by and updated_by always come from auth.uid",
  () => {
    assert.match(
      normalized,
      /created_by, updated_by[\s\S]*?v_user_id, v_user_id/i,
    );

    assert.doesNotMatch(
      normalized,
      /p_created_by|p_updated_by/i,
    );
  },
);

test(
  "created location is server-forced to empty and active",
  () => {
    assert.match(
      normalized,
      /location_type, status, zone_code/i,
    );

    assert.match(
      normalized,
      /v_location_type, 'empty', v_zone_code/i,
    );

    assert.match(
      normalized,
      /true, v_user_id, v_user_id/i,
    );
  },
);

test(
  "request_id and canonical payload provide idempotency",
  () => {
    assert.match(
      normalized,
      /insert into public\.warehouse_location_write_requests/i,
    );

    assert.match(
      normalized,
      /on conflict \(request_id\) do nothing/i,
    );

    assert.match(
      normalized,
      /from public\.warehouse_location_write_requests wr where wr\.request_id = p_request_id for update/i,
    );

    assert.match(
      normalized,
      /v_existing_request_payload <> v_request_payload/i,
    );

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_REQUEST_CONFLICT/i,
    );

    assert.match(
      normalized,
      /if v_existing_response_payload is not null then return v_existing_response_payload/i,
    );

    assert.match(
      normalized,
      /update public\.warehouse_location_write_requests set response_payload = v_response_payload, completed_at = now\(\)/i,
    );
  },
);

test(
  "full-code and barcode conflicts fail deterministically",
  () => {
    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_FULL_CODE_CONFLICT/i,
    );

    assert.match(
      normalized,
      /WAREHOUSE_LOCATION_BARCODE_CONFLICT/i,
    );

    assert.match(
      normalized,
      /warehouse_locations_warehouse_full_code_unique/i,
    );

    assert.match(
      normalized,
      /warehouse_locations_warehouse_barcode_unique/i,
    );

    assert.match(
      normalized,
      /when unique_violation/i,
    );
  },
);

test(
  "RPC only creates one warehouse_locations row",
  () => {
    const inserts =
      normalized.match(
        /insert into public\.warehouse_locations\b/gi,
      ) ?? [];

    assert.equal(
      inserts.length,
      1,
    );

    assert.doesNotMatch(
      normalized,
      /update public\.warehouse_locations\b/i,
    );

    assert.doesNotMatch(
      normalized,
      /delete from public\.warehouse_locations\b/i,
    );
  },
);

test(
  "bootstrap has no inventory or operational workflow mutations",
  () => {
    const forbiddenMutations = [
      /\binsert into public\.warehouse_inventory_/i,
      /\bupdate public\.warehouse_inventory_/i,
      /\bdelete from public\.warehouse_inventory_/i,

      /\binsert into public\.warehouse_receivings\b/i,
      /\bupdate public\.warehouse_receivings\b/i,
      /\bdelete from public\.warehouse_receivings\b/i,

      /\binsert into public\.warehouse_putaways\b/i,
      /\bupdate public\.warehouse_putaways\b/i,
      /\bdelete from public\.warehouse_putaways\b/i,

      /\binsert into public\.warehouse_pickings\b/i,
      /\bupdate public\.warehouse_pickings\b/i,
      /\bdelete from public\.warehouse_pickings\b/i,

      /\binsert into public\.warehouse_packings\b/i,
      /\bupdate public\.warehouse_packings\b/i,
      /\bdelete from public\.warehouse_packings\b/i,
    ];

    for (const pattern of forbiddenMutations) {
      assert.doesNotMatch(
        normalized,
        pattern,
      );
    }
  },
);

test(
  "safe response excludes auth and internal privilege metadata",
  () => {
    assert.match(
      normalized,
      /'id', v_location\.id/i,
    );

    assert.match(
      normalized,
      /'fullCode', v_location\.full_code/i,
    );

    assert.match(
      normalized,
      /'barcode', v_location\.barcode/i,
    );

    assert.match(
      normalized,
      /'createdAt', v_location\.created_at/i,
    );

    const responseSection =
      normalized.match(
        /v_response_payload :=([\s\S]*?)update public\.warehouse_location_write_requests/i,
      )?.[1] ?? "";

    assert.doesNotMatch(
      responseSection,
      /user_id|created_by|updated_by|role|privilege|policy/i,
    );
  },
);

test(
  "function execution is authenticated-only",
  () => {
    assert.match(
      normalized,
      /revoke all on function public\.warehouse_location_bootstrap_write\([\s\S]*?\) from public/i,
    );

    assert.match(
      normalized,
      /revoke all on function public\.warehouse_location_bootstrap_write\([\s\S]*?\) from anon/i,
    );

    assert.match(
      normalized,
      /revoke all on function public\.warehouse_location_bootstrap_write\([\s\S]*?\) from authenticated/i,
    );

    assert.match(
      normalized,
      /grant execute on function public\.warehouse_location_bootstrap_write\([\s\S]*?\) to authenticated/i,
    );
  },
);

test(
  "migration contains no service-role or history-repair path",
  () => {
    assert.doesNotMatch(
      normalized,
      /\bservice_role\b/i,
    );

    assert.doesNotMatch(
      normalized,
      /\bsupabase_migrations\b/i,
    );

    assert.doesNotMatch(
      normalized,
      /\bmigration repair\b/i,
    );
  },
);
