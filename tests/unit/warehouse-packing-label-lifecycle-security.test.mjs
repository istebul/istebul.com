import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818014500_warehouse_packing_label_lifecycle.sql",
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
  "label lifecycle ayrı SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /create or replace function public\.warehouse_packing_label_write/i,
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
  "label lifecycle caller JWT auth.uid kullanır",
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
  "label lifecycle account role authorization fail closed uygular",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(/i,
    );
  },
);

test(
  "label lifecycle yalnız beş ledger action kabul eder",
  () => {
    const block =
      executableSql.match(
        /v_action\s*=\s*any\s*\(\s*array\[([\s\S]*?)\]::text\[\]\s*\)/i,
      );

    assert.ok(block);

    for (const action of [
      "create_label",
      "generate_label",
      "mark_label_printed",
      "mark_label_failed",
      "cancel_label",
    ]) {
      assert.ok(
        block[1].includes(`'${action}'`),
        `Eksik action: ${action}`,
      );
    }

    assert.doesNotMatch(
      block[1],
      /generate_package_label/i,
    );
  },
);

test(
  "create labelId kabul etmez diğer lifecycle actionları labelId zorunlu tutar",
  () => {
    assert.match(
      executableSql,
      /v_action\s*=\s*'create_label'[\s\S]*?p_label_id\s+is not null/i,
    );

    assert.match(
      executableSql,
      /else[\s\S]*?p_label_id\s+is null/i,
    );
  },
);

test(
  "label lifecycle account request action payload idempotency kullanır",
  () => {
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
      /v_existing_payload\s*<>\s*v_request_payload/i,
    );

    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );
  },
);

test(
  "Packing parent account scoped FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packings[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?id\s*=\s*p_packing_id[\s\S]*?for update/i,
    );
  },
);

test(
  "create_label iptal edilmiş Packing üzerinde kapalıdır",
  () => {
    assert.match(
      executableSql,
      /if v_action = 'create_label'[\s\S]*?v_packing\.status\s*=\s*'cancelled'/i,
    );
  },
);

test(
  "create_label domain label type setini korur",
  () => {
    for (const type of [
      "package",
      "shipping",
      "sscc",
      "gs1_128",
      "carrier",
      "hazardous_material",
      "temperature_controlled",
      "return",
      "custom",
    ]) {
      assert.ok(
        executableSql.includes(`'${type}'`),
        `Eksik label type: ${type}`,
      );
    }
  },
);

test(
  "create_label domain format setini korur",
  () => {
    for (const format of [
      "zpl",
      "pdf",
      "png",
      "svg",
      "text",
    ]) {
      assert.ok(
        executableSql.includes(`'${format}'`),
        `Eksik format: ${format}`,
      );
    }
  },
);

test(
  "SSCC tipinde create_label için SSCC zorunludur",
  () => {
    assert.match(
      executableSql,
      /v_type\s*=\s*'sscc'[\s\S]*?v_sscc\s+is null/i,
    );

    assert.match(
      executableSql,
      /SSCC etiketi için SSCC değeri zorunludur/i,
    );
  },
);

test(
  "create_label packageId verilirse aynı account ve Packing içinde doğrulanır",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_packages[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?id\s*=\s*v_package_id/i,
    );
  },
);

test(
  "create_label created status ve caller created_by ile oluşturulur",
  () => {
    assert.match(
      executableSql,
      /insert into public\.warehouse_packing_labels/i,
    );

    assert.match(
      executableSql,
      /v_type,\s*'created',\s*v_label_number/i,
    );

    assert.match(
      executableSql,
      /v_user_id,\s*now\(\),\s*now\(\)/i,
    );
  },
);

test(
  "create_label ETK tarih altı hane sequence numarası üretir",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_label_number_seq/i,
    );

    assert.match(
      executableSql,
      /'ETK-'/i,
    );

    assert.match(
      executableSql,
      /to_char\(\s*current_date,\s*'YYYYMMDD'\s*\)/i,
    );
  },
);

test(
  "existing label aynı account ve Packing içinde FOR UPDATE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /from public\.warehouse_packing_labels[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?packing_id\s*=\s*v_packing\.id[\s\S]*?id\s*=\s*p_label_id[\s\S]*?for update/i,
    );
  },
);

test(
  "generate_label printed ve cancelled etiketleri reddeder",
  () => {
    assert.match(
      executableSql,
      /v_action\s*=\s*'generate_label'[\s\S]*?v_label\.status\s+in\s*\(\s*'printed'\s*,\s*'cancelled'\s*\)/i,
    );
  },
);

test(
  "generate_label sscc ve gs1_128 için gerektiğinde SSCC üretir",
  () => {
    assert.match(
      executableSql,
      /v_label\.type\s+in\s*\(\s*'sscc'\s*,\s*'gs1_128'\s*\)/i,
    );

    assert.match(
      executableSql,
      /warehouse_packing_sscc_seq/i,
    );

    assert.match(
      executableSql,
      /'0'\s*\|\|\s*'8699999'/i,
    );

    assert.match(
      executableSql,
      /v_sscc_check_digit/i,
    );
  },
);

test(
  "generate_label barcode fallback olarak mevcut barcode veya SSCC kullanır",
  () => {
    assert.match(
      executableSql,
      /coalesce\(\s*v_label\.barcode_value,\s*v_sscc\s*\)/i,
    );
  },
);

test(
  "generate_label ZPL text ve structured content oluşturabilir",
  () => {
    assert.match(
      executableSql,
      /\^XA/i,
    );

    assert.match(
      executableSql,
      /'Etiket: '/i,
    );

    assert.match(
      executableSql,
      /jsonb_strip_nulls\(\s*jsonb_build_object/i,
    );
  },
);

test(
  "generate_label generated status content ve generated_at atomik yazar",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packing_labels[\s\S]*?status\s*=\s*'generated'[\s\S]*?content\s*=\s*v_content[\s\S]*?generated_at\s*=\s*now\(\)/i,
    );
  },
);

test(
  "mark_label_printed yalnız generated etiketi kabul eder",
  () => {
    assert.match(
      executableSql,
      /v_action\s*=\s*'mark_label_printed'[\s\S]*?v_label\.status\s*<>\s*'generated'/i,
    );
  },
);

test(
  "mark_label_printed printer fallback ve printed_at yazar",
  () => {
    assert.match(
      executableSql,
      /v_printer_id\s*:=\s*v_label\.printer_id/i,
    );

    assert.match(
      executableSql,
      /status\s*=\s*'printed'[\s\S]*?printer_id\s*=\s*v_printer_id[\s\S]*?printed_at\s*=\s*now\(\)/i,
    );
  },
);

test(
  "mark_label_failed printed ve cancelled etiketi reddeder",
  () => {
    assert.match(
      executableSql,
      /v_action\s*=\s*'mark_label_failed'[\s\S]*?v_label\.status\s+in\s*\(\s*'printed'\s*,\s*'cancelled'\s*\)/i,
    );
  },
);

test(
  "mark_label_failed zorunlu failureReason ile failed durumuna geçirir",
  () => {
    assert.match(
      executableSql,
      /v_failure_reason\s+is null[\s\S]*?Etiket hata nedeni boş bırakılamaz/i,
    );

    assert.match(
      executableSql,
      /status\s*=\s*'failed'[\s\S]*?failure_reason\s*=\s*v_failure_reason/i,
    );
  },
);

test(
  "cancel_label printed ve zaten cancelled etiketi reddeder",
  () => {
    assert.match(
      executableSql,
      /v_action\s*=\s*'cancel_label'[\s\S]*?v_label\.status\s*=\s*'printed'/i,
    );

    assert.match(
      executableSql,
      /v_label\.status\s*=\s*'cancelled'[\s\S]*?Etiket daha önce iptal edilmiş/i,
    );
  },
);

test(
  "cancel_label yalnız label status cancelled mutation yapar",
  () => {
    assert.match(
      executableSql,
      /update public\.warehouse_packing_labels[\s\S]*?status\s*=\s*'cancelled'/i,
    );

    assert.doesNotMatch(
      executableSql,
      /update public\.warehouse_packing_packages\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /update public\.warehouse_packings\b/i,
    );
  },
);

test(
  "label lifecycle inventory Picking package-item mutation yapmaz",
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
      /(?:insert into|update|delete from)\s+public\.warehouse_packing_package_items/i,
    );
  },
);

test(
  "RPC public anon kapalı authenticated execute açık ve service role yok",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_label_write[\s\S]*?from public/i,
    );

    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_label_write[\s\S]*?from anon/i,
    );

    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_label_write[\s\S]*?to authenticated/i,
    );

    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
