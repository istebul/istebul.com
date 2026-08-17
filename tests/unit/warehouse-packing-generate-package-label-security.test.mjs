import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818013500_warehouse_packing_generate_package_label.sql",
    import.meta.url,
  );

const sql =
  await readFile(
    migrationUrl,
    "utf8",
  );

const executableSql =
  sql
    .replace(/--.*$/gm, "")
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );

test(
  "package-label ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function\s+public\.warehouse_packing_generate_package_label_write/i,
    );

    assert.match(
      executableSql,
      /security definer/i,
    );

    assert.match(
      executableSql,
      /set search_path\s*=\s*public,\s*pg_temp/i,
    );
  },
);

test(
  "package-label caller JWT auth.uid kullanır",
  () => {
    assert.match(
      executableSql,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i,
    );

    assert.match(
      executableSql,
      /if v_user_id is null/i,
    );
  },
);

test(
  "package-label account role authorization fail closed uygular",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(/i,
    );
  },
);

test(
  "package-label generate_package_label action ile idempotency kullanır",
  () => {
    assert.match(
      executableSql,
      /v_action constant text\s*:=\s*'generate_package_label'/i,
    );

    assert.match(
      executableSql,
      /warehouse_packing_write_requests/i,
    );

    assert.match(
      executableSql,
      /v_existing_action\s*<>\s*v_action/i,
    );

    assert.match(
      executableSql,
      /v_existing_payload\s*<>\s*v_payload/i,
    );

    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );
  },
);

test(
  "Packing parent FOR UPDATE ile account scoped kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packings[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*p_packing_id[\s\S]*?for update/i,
    );
  },
);

test(
  "package aynı Packing içinde FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_packages[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?id\s*=\s*p_package_id[\s\S]*?for update/i,
    );
  },
);

test(
  "iptal edilmiş Packing için label oluşturulamaz",
  () => {
    assert.match(
      executableSql,
      /v_packing\.status\s*=\s*'cancelled'/i,
    );
  },
);

test(
  "package label yalnız sealed veya labelled package için üretilebilir",
  () => {
    assert.match(
      executableSql,
      /v_package\.status\s+not in\s*\(\s*'sealed'\s*,\s*'labelled'\s*\)/i,
    );
  },
);

test(
  "desteklenen label formatları domain ile aynıdır",
  () => {
    for (const format of [
      "zpl",
      "pdf",
      "png",
      "svg",
      "text",
    ]) {
      assert.ok(
        executableSql.includes(
          `'${format}'`,
        ),
        `Eksik format: ${format}`,
      );
    }
  },
);

test(
  "label number domain ETK tarih ve altı hane sözleşmesini korur",
  () => {
    assert.match(
      executableSql,
      /'ETK-'/i,
    );

    assert.match(
      executableSql,
      /to_char\(\s*current_date,\s*'YYYYMMDD'\s*\)/i,
    );

    assert.match(
      executableSql,
      /lpad\([\s\S]*?6[\s\S]*?'0'/i,
    );
  },
);

test(
  "SSCC domain default extension ve şirket önekini kullanır",
  () => {
    assert.match(
      executableSql,
      /v_sscc_base\s*:=\s*'0'\s*\|\|\s*'8699999'/i,
    );
  },
);

test(
  "SSCC GS1 check digit hesaplanır",
  () => {
    assert.match(
      executableSql,
      /v_sscc_check_digit/i,
    );

    assert.match(
      executableSql,
      /generate_series\(/i,
    );

    assert.match(
      executableSql,
      /v_sscc\s*!~\s*'\^\[0-9\]\{18\}\$'/i,
    );
  },
);

test(
  "SSCC ve label sequence doğrudan authenticated role açılmaz",
  () => {
    assert.match(
      sql,
      /revoke all[\s\S]*?warehouse_packing_label_number_seq[\s\S]*?from authenticated/i,
    );

    assert.match(
      sql,
      /revoke all[\s\S]*?warehouse_packing_sscc_seq[\s\S]*?from authenticated/i,
    );
  },
);

test(
  "generated label SSCC tipinde ve generated statüsünde atomik oluşturulur",
  () => {
    assert.match(
      executableSql,
      /insert into public\.warehouse_packing_labels/i,
    );

    assert.match(
      executableSql,
      /'sscc'\s*,\s*'generated'/i,
    );
  },
);

test(
  "label SSCC aynı zamanda barcodeValue olarak korunur",
  () => {
    assert.match(
      executableSql,
      /barcode_value[\s\S]*?sscc/i,
    );

    assert.match(
      executableSql,
      /v_sscc[\s\S]*?v_sscc/i,
    );
  },
);

test(
  "ZPL content label number ve SSCC barkodunu içerir",
  () => {
    assert.match(
      executableSql,
      /\^XA/i,
    );

    assert.match(
      executableSql,
      /\^BCN,100,Y,N,N/i,
    );

    assert.match(
      executableSql,
      /v_label_number/i,
    );

    assert.match(
      executableSql,
      /v_sscc/i,
    );
  },
);

test(
  "package generated label ile labelled ve SSCC durumuna atomik geçer",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packing_packages[\s\S]*?status\s*=\s*'labelled'[\s\S]*?sscc\s*=\s*v_label\.sscc/i,
    );
  },
);

test(
  "package-label parent Packing lifecycle veya package item değiştirmez",
  () => {
    assert.doesNotMatch(
      executableSql,
      /update public\.warehouse_packings\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_packing_package_items/i,
    );
  },
);

test(
  "package-label printed failed cancelled label mutation lifecycle çalıştırmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /update\s+public\.warehouse_packing_labels[\s\S]*?status\s*=\s*'printed'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /update\s+public\.warehouse_packing_labels[\s\S]*?status\s*=\s*'failed'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /update\s+public\.warehouse_packing_labels[\s\S]*?status\s*=\s*'cancelled'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /insert\s+into\s+public\.warehouse_packing_labels[\s\S]*?values\s*\([\s\S]*?'printed'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /insert\s+into\s+public\.warehouse_packing_labels[\s\S]*?values\s*\([\s\S]*?'failed'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /insert\s+into\s+public\.warehouse_packing_labels[\s\S]*?values\s*\([\s\S]*?'cancelled'/i,
    );
  },
);

test(
  "package-label inventory Picking ve service role kullanmaz",
  () => {
    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_inventory_(?:balances|movements)/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_pickings\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /(?:insert into|update|delete from)\s+public\.warehouse_picking_items\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);

test(
  "RPC public ve anon için kapalı authenticated için execute açıktır",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_generate_package_label_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_generate_package_label_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_generate_package_label_write[\s\S]*?to authenticated/i,
    );
  },
);
