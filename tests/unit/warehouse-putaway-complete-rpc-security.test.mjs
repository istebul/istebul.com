import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260812132000_warehouse_putaway_complete.sql";

const sql = await readFile(migrationPath, "utf8");

test("Putaway complete dar SECURITY DEFINER RPC oluşturur", () => {
  assert.match(
    sql,
    /create or replace function public\.warehouse_putaway_complete_write/,
  );
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = public, pg_temp/i);
});

test("complete RPC caller JWT ve Putaway operasyon rollerini doğrular", () => {
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /warehouse_has_account_role/);

  for (const role of [
    "owner",
    "admin",
    "warehouse_manager",
    "supervisor",
    "inventory_controller",
    "forklift_operator",
    "operator",
  ]) {
    assert.ok(sql.includes(`'${role}'`));
  }

  assert.doesNotMatch(
    sql,
    /array\[[\s\S]{0,300}'viewer'/i,
  );
});

test("complete RPC account bazlı idempotency sözleşmesini korur", () => {
  assert.match(
    sql,
    /insert into public\.warehouse_putaway_write_requests/,
  );
  assert.match(
    sql,
    /on conflict \(account_id, request_id\) do nothing/,
  );
  assert.match(sql, /v_action constant text := 'complete'/);
  assert.match(
    sql,
    /jsonb_build_object\([\s\S]{0,100}'putawayId'[\s\S]{0,100}p_putaway_id/,
  );
  assert.match(
    sql,
    /v_existing_user_id <> v_user_id[\s\S]{0,120}v_existing_action <> v_action[\s\S]{0,120}v_existing_payload <> v_payload/,
  );
  assert.match(sql, /response_payload = v_result/);
});

test("complete RPC Putaway ana kaydı ve tüm satırları kilitler", () => {
  assert.match(
    sql,
    /from public\.warehouse_putaways[\s\S]{0,140}for update/i,
  );
  assert.match(
    sql,
    /from public\.warehouse_putaway_items[\s\S]{0,180}order by line_number, id[\s\S]{0,80}for update/i,
  );
});

test("yalnız devam eden Putaway kaydı tamamlanabilir", () => {
  assert.match(
    sql,
    /v_putaway\.status not in \([\s\S]{0,100}'in_progress'[\s\S]{0,100}'partially_completed'/,
  );
  assert.match(
    sql,
    /Yalnızca devam eden yerleştirme tamamlanabilir/,
  );
});

test("ürün satırı bulunmayan Putaway tamamlanamaz", () => {
  assert.match(
    sql,
    /select count\(\*\)[\s\S]{0,180}v_item_count[\s\S]{0,240}warehouse_putaway_items/,
  );
  assert.match(
    sql,
    /v_item_count = 0[\s\S]{0,160}Ürün satırı bulunmayan yerleştirme tamamlanamaz/,
  );
});

test("tüm remaining_quantity değerleri sıfır olmadan complete olmaz", () => {
  assert.match(
    sql,
    /remaining_quantity > 0/,
  );
  assert.match(
    sql,
    /v_incomplete_count > 0[\s\S]{0,180}Tüm ürünler yerleştirilmeden işlem tamamlanamaz/,
  );
});

test("her Putaway satırında stok hareketi bulunması zorunludur", () => {
  assert.match(
    sql,
    /coalesce\(cardinality\(inventory_movement_ids\), 0\) = 0/,
  );
  assert.match(
    sql,
    /v_missing_movement_count > 0[\s\S]{0,180}Stok hareketi bulunmayan yerleştirme satırı tamamlanamaz/,
  );
});

test("complete yalnız yaşam döngüsünü completed yapar", () => {
  assert.match(
    sql,
    /update public\.warehouse_putaways[\s\S]{0,180}status = 'completed'[\s\S]{0,120}completed_at = v_now[\s\S]{0,120}updated_at = v_now/,
  );
  assert.match(
    sql,
    /'status', v_putaway\.status/,
  );
  assert.match(
    sql,
    /'completedAt', v_putaway\.completed_at/,
  );
});

test("complete RPC stok tablolarına mutation yapmaz", () => {
  assert.doesNotMatch(
    sql,
    /(insert into|update|delete from)\s+public\.warehouse_inventory_(movements|balances)/i,
  );
});

test("complete RPC PUBLIC anon ve service role yüzeyi açmaz", () => {
  assert.match(
    sql,
    /revoke all on function public\.warehouse_putaway_complete_write[\s\S]{0,180}from public/i,
  );
  assert.match(
    sql,
    /revoke all on function public\.warehouse_putaway_complete_write[\s\S]{0,180}from anon/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.warehouse_putaway_complete_write[\s\S]{0,180}to authenticated/i,
  );
  assert.doesNotMatch(
    sql,
    /SUPABASE_SERVICE_ROLE_KEY|service_role/i,
  );
});
