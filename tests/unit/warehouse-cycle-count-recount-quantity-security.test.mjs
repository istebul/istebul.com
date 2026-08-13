import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const MIGRATION =
  "supabase/migrations/20260813233000_warehouse_cycle_count_recount_quantity_write.sql";

async function sql() {
  return readFile(
    MIGRATION,
    "utf8"
  );
}

function rpcBody(
  source
) {
  const start =
    source.indexOf(
      "create or replace function"
    );

  const end =
    source.indexOf(
      "$warehouse_cycle_count_record_recount_quantity$;",
      start
    );

  assert.ok(
    start >= 0,
    "Recount RPC başlangıcı bulunamadı."
  );

  assert.ok(
    end > start,
    "Recount RPC sonu bulunamadı."
  );

  return source.slice(
    start,
    end
  );
}

function responseBlock(
  source
) {
  const body =
    rpcBody(
      source
    );

  const start =
    body.indexOf(
      "v_result :="
    );

  const end =
    body.indexOf(
      "update public.warehouse_cycle_count_write_requests",
      start
    );

  assert.ok(
    start >= 0 &&
    end > start,
    "Safe response bloğu bulunamadı."
  );

  return body.slice(
    start,
    end
  );
}

test(
  "A7.3.2.0 idempotency action sözleşmesine record_recount_quantity ekler",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /warehouse_cycle_count_write_requests_action_check/i
    );

    assert.match(
      source,
      /'record_quantity'[\s\S]*'evaluate_first_count'[\s\S]*'record_recount_quantity'/i
    );
  }
);

test(
  "recount RPC caller JWT ve mevcut saha rol kontratını kullanır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /warehouse_cycle_count_record_recount_quantity_write/i
    );

    assert.match(
      source,
      /security definer/i
    );

    assert.match(
      source,
      /set search_path\s*=\s*public,\s*pg_temp/i
    );

    assert.match(
      source,
      /auth\.uid\(\)/i
    );

    for (
      const role
      of [
        "owner",
        "admin",
        "warehouse_manager",
        "supervisor",
        "inventory_controller",
        "operator"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `'${role}'`
        )
      );
    }
  }
);

test(
  "recount RPC request kimlik quantity scan ve notes parametrelerini alır",
  async () => {
    const source =
      await sql();

    for (
      const parameter
      of [
        "p_request_id uuid",
        "p_account_id uuid",
        "p_warehouse_id uuid",
        "p_cycle_count_id uuid",
        "p_cycle_count_item_id uuid",
        "p_task_id uuid",
        "p_counted_quantity numeric",
        "p_location_scan text",
        "p_product_scan text",
        "p_notes text default null"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          parameter
            .replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )
            .replace(
              /\s+/g,
              "\\s+"
            ),
          "i"
        )
      );
    }
  }
);

test(
  "recount quantity sıfırı kabul eder negatif miktarı engeller",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /p_counted_quantity is null[\s\S]*p_counted_quantity < 0/i
    );

    assert.doesNotMatch(
      source,
      /p_counted_quantity\s*<=\s*0/i
    );
  }
);

test(
  "canonical idempotency payload warehouse quantity scan ve notes dahil aynı isteği tanımlar",
  async () => {
    const source =
      await sql();

    for (
      const key
      of [
        "warehouseId",
        "cycleCountId",
        "cycleCountItemId",
        "taskId",
        "countedQuantity",
        "locationScan",
        "productScan",
        "notes"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `'${key}'`
        )
      );
    }

    assert.match(
      source,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i
    );

    assert.match(
      source,
      /v_existing_action\s*<>\s*v_action[\s\S]*v_existing_payload\s*<>\s*v_payload/i
    );

    assert.match(
      source,
      /v_existing_response is not null[\s\S]*return v_existing_response/i
    );
  }
);

test(
  "aynı request id farklı kullanıcı veya payload için kullanılamaz",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /v_existing_user_id\s*<>\s*v_user_id/i
    );

    assert.match(
      source,
      /errcode\s*=\s*'42501'/i
    );

    assert.match(
      source,
      /Aynı Idempotency-Key farklı bir yeniden sayım isteği için kullanılamaz/i
    );

    assert.match(
      source,
      /errcode\s*=\s*'23505'/i
    );
  }
);

test(
  "parent count aynı account warehouse ve id kapsamında FOR UPDATE kilitlenir",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.match(
      source,
      /from public\.warehouse_cycle_counts[\s\S]*account_id\s*=\s*p_account_id[\s\S]*warehouse_id\s*=\s*p_warehouse_id[\s\S]*id\s*=\s*p_cycle_count_id[\s\S]*for update/i
    );

    assert.match(
      source,
      /v_count\.status\s*<>\s*'recount_required'/i
    );
  }
);

test(
  "item yalnız recount_required ve tamamlanmış ilk sayımdan sonra ikinci miktar kabul eder",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.match(
      source,
      /v_item\.status\s*<>\s*'recount_required'/i
    );

    assert.match(
      source,
      /v_item\.recount_required is distinct from\s+true/i
    );

    assert.match(
      source,
      /v_item\.first_count_quantity is null/i
    );

    assert.match(
      source,
      /v_item\.counted_at is null/i
    );
  }
);

test(
  "ikinci fiziksel miktar yeni request ile overwrite edilemez",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.match(
      source,
      /v_item\.second_count_quantity is not null/i
    );

    assert.match(
      source,
      /v_item\.recounted_by is not null/i
    );

    assert.match(
      source,
      /v_item\.recounted_at is not null/i
    );

    assert.match(
      source,
      /ikinci fiziksel sayım miktarı zaten kaydedildi/i
    );

    assert.match(
      source,
      /errcode\s*=\s*'23505'/i
    );
  }
);

test(
  "recount task aynı account warehouse count item ve id kapsamında kilitlenir",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.match(
      source,
      /from public\.warehouse_cycle_count_tasks[\s\S]*account_id\s*=\s*p_account_id[\s\S]*warehouse_id\s*=\s*p_warehouse_id[\s\S]*cycle_count_id\s*=\s*p_cycle_count_id[\s\S]*cycle_count_item_id\s*=\s*p_cycle_count_item_id[\s\S]*id\s*=\s*p_task_id[\s\S]*for update/i
    );
  }
);

test(
  "yalnız recount görevi assigned veya in_progress durumda quantity yazabilir",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.match(
      source,
      /v_task\.type\s*<>\s*'recount'/i
    );

    assert.match(
      source,
      /v_task\.status not in\s*\(\s*'assigned'\s*,\s*'in_progress'\s*\)/i
    );

    assert.match(
      source,
      /v_task\.completed_at is not null/i
    );
  }
);

test(
  "recount görevi açıkça giriş yapan kullanıcıya atanmış olmalıdır",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.match(
      source,
      /v_task\.assigned_user_id is null[\s\S]*v_task\.assigned_user_id\s*<>\s*v_user_id/i
    );
  }
);

test(
  "aynı operatörün recount yapması yasaklanmaz assignment kontratı belirleyicidir",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.doesNotMatch(
      source,
      /v_item\.counted_by[\s\S]{0,120}(<>|=|is distinct from)[\s\S]{0,120}v_user_id/i
    );

    assert.match(
      source,
      /v_task\.assigned_user_id[\s\S]*v_user_id/i
    );
  }
);

test(
  "task location ve product kapsamı item ile eşleşir",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.match(
      source,
      /v_task\.location_id is not null[\s\S]*v_task\.location_id\s*<>\s*v_item\.location_id/i
    );

    assert.match(
      source,
      /v_task\.product_id is not null[\s\S]*v_task\.product_id\s*<>\s*v_item\.product_id/i
    );
  }
);

test(
  "lokasyon scan DB lokasyon barkodu veya code full_code ile server-side doğrulanır",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.match(
      source,
      /from public\.warehouse_locations/i
    );

    assert.match(
      source,
      /v_location\.barcode\s*=\s*v_location_scan/i
    );

    assert.match(
      source,
      /upper\(\s*v_location\.code\s*\)[\s\S]*upper\(\s*v_location_scan\s*\)/i
    );

    assert.match(
      source,
      /upper\(\s*v_location\.full_code\s*\)[\s\S]*upper\(\s*v_location_scan\s*\)/i
    );
  }
);

test(
  "SKU item generic product code ile değil SKU code veya aynı SKU barkoduyla doğrulanır",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    const start =
      source.indexOf(
        "if v_item.sku_id is not null then"
      );

    const end =
      source.indexOf(
        "else",
        start
      );

    assert.ok(
      start >= 0 &&
      end > start
    );

    const skuBlock =
      source.slice(
        start,
        end
      );

    assert.match(
      skuBlock,
      /v_sku\.sku_code/i
    );

    assert.match(
      skuBlock,
      /warehouse_product_barcodes/i
    );

    assert.match(
      skuBlock,
      /sku_id\s*=\s*v_item\.sku_id/i
    );

    assert.match(
      skuBlock,
      /active\s*=\s*true/i
    );

    assert.doesNotMatch(
      skuBlock,
      /v_product\.code/i
    );
  }
);

test(
  "SKU olmayan item yalnız product code veya product-level aktif barkodu kabul eder",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.match(
      source,
      /else[\s\S]*v_product\.code[\s\S]*warehouse_product_barcodes[\s\S]*sku_id is null[\s\S]*active\s*=\s*true/i
    );
  }
);

test(
  "ikinci quantity write yalnız second_count recount metadata ve optional notes yazar",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.match(
      source,
      /update public\.warehouse_cycle_count_items[\s\S]*second_count_quantity\s*=\s*v_quantity/i
    );

    assert.match(
      source,
      /recounted_by\s*=\s*v_user_id/i
    );

    assert.match(
      source,
      /recounted_at\s*=\s*v_now/i
    );

    assert.match(
      source,
      /notes\s*=[\s\S]*when v_notes is null[\s\S]*then notes[\s\S]*else v_notes/i
    );
  }
);

test(
  "recount quantity write taskı yalnız in_progress yapar ve started_at başlatır",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    const taskUpdateStart =
      source.indexOf(
        "update public.warehouse_cycle_count_tasks"
      );

    const taskUpdateEnd =
      source.indexOf(
        "v_result :=",
        taskUpdateStart
      );

    assert.ok(
      taskUpdateStart >= 0 &&
      taskUpdateEnd >
        taskUpdateStart,
      "Recount task update bloğu bulunamadı."
    );

    const taskUpdate =
      source.slice(
        taskUpdateStart,
        taskUpdateEnd
      );

    assert.match(
      taskUpdate,
      /status\s*=\s*'in_progress'[\s\S]*started_at\s*=[\s\S]*coalesce/i
    );

    assert.doesNotMatch(
      taskUpdate,
      /status\s*=\s*'completed'/i
    );

    assert.doesNotMatch(
      taskUpdate,
      /completed_at\s*=/i
    );
  }
);

test(
  "A7.3.2.0 final quantity variance result exception veya yeni görev üretmez",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.doesNotMatch(
      source,
      /^\s*final_count_quantity\s*=/im
    );

    assert.doesNotMatch(
      source,
      /^\s*variance_quantity\s*=/im
    );

    assert.doesNotMatch(
      source,
      /^\s*variance_percentage\s*=/im
    );

    assert.doesNotMatch(
      source,
      /^\s*variance_value\s*=/im
    );

    assert.doesNotMatch(
      source,
      /insert into\s+public\.warehouse_cycle_count_results/i
    );

    assert.doesNotMatch(
      source,
      /insert into\s+public\.warehouse_cycle_count_exceptions/i
    );

    assert.doesNotMatch(
      source,
      /insert into\s+public\.warehouse_cycle_count_tasks/i
    );
  }
);

test(
  "A7.3.2.0 first count veya parent Cycle Count lifecycle değerlerini değiştirmez",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.doesNotMatch(
      source,
      /^\s*first_count_quantity\s*=/im
    );

    assert.doesNotMatch(
      source,
      /update\s+public\.warehouse_cycle_counts\b/i
    );

    assert.doesNotMatch(
      source,
      /^\s*status\s*=\s*'recount_required'/im
    );
  }
);

test(
  "A7.3.2.0 stok adjustment approval veya inventory mutation yapmaz",
  async () => {
    const source =
      rpcBody(
        await sql()
      );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_(balances|movements)/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_adjustments/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_approvals/i
    );
  }
);

test(
  "safe response yalnız kullanıcının kendi ikinci miktarını ve lifecycle metadata döndürür",
  async () => {
    const source =
      responseBlock(
        await sql()
      );

    for (
      const required
      of [
        "countedQuantity",
        "unit",
        "itemStatus",
        "countStatus",
        "taskStatus",
        "recordedBy",
        "recordedAt"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `'${required}'`
        )
      );
    }

    for (
      const forbidden
      of [
        "expectedQuantity",
        "expected_quantity",
        "firstCountQuantity",
        "first_count_quantity",
        "finalCountQuantity",
        "final_count_quantity",
        "varianceQuantity",
        "variance_quantity",
        "variancePercentage",
        "variance_percentage",
        "varianceValue",
        "variance_value",
        "unitCost",
        "unit_cost",
        "resultType",
        "shortage",
        "surplus"
      ]
    ) {
      assert.doesNotMatch(
        source,
        new RegExp(
          forbidden,
          "i"
        )
      );
    }
  }
);

test(
  "recount RPC public ve anon'a kapalı yalnız authenticated execute alır",
  async () => {
    const source =
      await sql();

    const signatures =
      source.match(
        /warehouse_cycle_count_record_recount_quantity_write\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*numeric\s*,\s*text\s*,\s*text\s*,\s*text\s*\)/gi
      ) || [];

    assert.equal(
      signatures.length,
      3
    );

    assert.match(
      source,
      /from public/i
    );

    assert.match(
      source,
      /from anon/i
    );

    assert.match(
      source,
      /to authenticated/i
    );
  }
);

test(
  "recount migration service role veya doğrudan istemci privilege açmaz",
  async () => {
    const source =
      await sql();

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY|service_role|serviceRole/i
    );

    assert.doesNotMatch(
      source,
      /grant\s+(insert|update|delete|all)\s+on\s+public\.warehouse_cycle_count_/i
    );
  }
);
