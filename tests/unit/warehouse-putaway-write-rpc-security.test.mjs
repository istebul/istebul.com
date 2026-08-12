import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260812105000_warehouse_putaway_write_foundation.sql";

const sql = fs.readFileSync(migrationPath, "utf8");

test(
  "Putaway write foundation dar SECURITY DEFINER RPC oluşturur",
  () => {
    assert.match(
      sql,
      /create or replace function public\.warehouse_putaway_write\(/i,
    );

    assert.match(
      sql,
      /language plpgsql\s+security definer\s+set search_path = public, pg_temp/i,
    );
  },
);

test(
  "Putaway write foundation yalnız create add_item start aksiyonlarını işler",
  () => {
    assert.match(sql, /'create'/);
    assert.match(sql, /'add_item'/);
    assert.match(sql, /'start'/);

    assert.doesNotMatch(
      sql,
      /elsif\s+v_action\s*=\s*'execute_item'/i,
    );

    assert.doesNotMatch(
      sql,
      /elsif\s+v_action\s*=\s*'complete'/i,
    );

    assert.doesNotMatch(
      sql,
      /elsif\s+v_action\s*=\s*'cancel'/i,
    );
  },
);

test(
  "Putaway write auth uid ve uygun warehouse rollerini doğrular",
  () => {
    assert.match(
      sql,
      /v_user_id uuid := auth\.uid\(\)/i,
    );

    assert.match(
      sql,
      /warehouse_has_account_role/i,
    );

    assert.match(sql, /'forklift_operator'/);
    assert.match(sql, /'warehouse_manager'/);

    assert.doesNotMatch(
      sql,
      /array\[[\s\S]*?'viewer'[\s\S]*?\]::text\[\]/i,
    );
  },
);

test(
  "Putaway write Idempotency-Key sözleşmesini request ve response payload ile korur",
  () => {
    assert.match(
      sql,
      /from public\.warehouse_putaway_write_requests/i,
    );

    assert.match(sql, /request_payload/i);
    assert.match(sql, /response_payload/i);

    assert.match(
      sql,
      /on conflict \(account_id, request_id\) do nothing/i,
    );

    assert.match(sql, /errcode = '23505'/);
    assert.match(sql, /errcode = '40001'/);
  },
);

test(
  "Putaway create tenant depo lokasyon ve receiving bütünlüğünü doğrular",
  () => {
    assert.match(
      sql,
      /from public\.warehouses[\s\S]*?account_id = p_account_id/i,
    );

    assert.match(
      sql,
      /from public\.warehouse_locations[\s\S]*?account_id = p_account_id[\s\S]*?warehouse_id = v_warehouse_id/i,
    );

    assert.match(
      sql,
      /from public\.warehouse_receivings[\s\S]*?account_id = p_account_id/i,
    );

    assert.match(
      sql,
      /v_receiving\.receiving_location_id <> v_source_location_id/i,
    );
  },
);

test(
  "Putaway add_item ana kaydı kilitler ve parent depo kaynak stratejisini kullanır",
  () => {
    assert.match(
      sql,
      /from public\.warehouse_putaways[\s\S]*?for update/i,
    );

    assert.match(
      sql,
      /v_putaway\.warehouse_id/i,
    );

    assert.match(
      sql,
      /v_putaway\.source_location_id/i,
    );

    assert.match(
      sql,
      /v_putaway\.strategy/i,
    );

    assert.match(
      sql,
      /coalesce\(max\(line_number\), 0\) \+ 1/i,
    );
  },
);

test(
  "Putaway start en az bir satır ister ve ana kaydı kilitler",
  () => {
    assert.match(
      sql,
      /select count\(\*\)[\s\S]*?from public\.warehouse_putaway_items/i,
    );

    assert.match(
      sql,
      /Yerleştirme başlatılmadan önce en az bir ürün satırı eklenmelidir\./,
    );

    assert.match(
      sql,
      /status = 'in_progress'/i,
    );
  },
);

test(
  "Putaway write foundation inventory movement ve balance tablolarına dokunmaz",
  () => {
    assert.doesNotMatch(
      sql,
      /insert into public\.warehouse_inventory_movements/i,
    );

    assert.doesNotMatch(
      sql,
      /update public\.warehouse_inventory_balances/i,
    );

    assert.doesNotMatch(
      sql,
      /insert into public\.warehouse_inventory_balances/i,
    );
  },
);

test(
  "Putaway write RPC PUBLIC'e kapalı ve authenticated role açık",
  () => {
    assert.match(
      sql,
      /revoke all on function public\.warehouse_putaway_write\([\s\S]*?\) from public;/i,
    );

    assert.match(
      sql,
      /grant execute on function public\.warehouse_putaway_write\([\s\S]*?\) to authenticated;/i,
    );
  },
);

test(
  "Putaway write foundation service role kullanmaz",
  () => {
    assert.doesNotMatch(
      sql,
      /SUPABASE_SERVICE_ROLE_KEY|service_role/i,
    );
  },
);
