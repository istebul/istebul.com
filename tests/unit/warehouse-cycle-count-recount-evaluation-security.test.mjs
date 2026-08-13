import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MIGRATION =
  "supabase/migrations/20260814003000_warehouse_cycle_count_recount_evaluation.sql";

const sql =
  await readFile(
    MIGRATION,
    "utf8"
  );

function functionBody() {
  const start =
    sql.indexOf(
      "create or replace function\n  public.warehouse_cycle_count_evaluate_recount"
    );

  assert.ok(
    start >= 0,
    "Recount evaluation function başlangıcı bulunamadı."
  );

  const endMarker =
    "$warehouse_cycle_count_evaluate_recount$;";

  const end =
    sql.indexOf(
      endMarker,
      start
    );

  assert.ok(
    end > start,
    "Recount evaluation function sonu bulunamadı."
  );

  return sql.slice(
    start,
    end + endMarker.length
  );
}

const fn =
  functionBody();

test(
  "write request action sözleşmesine evaluate_recount eklenir",
  () => {
    assert.match(
      sql,
      /'record_quantity'[\s\S]*'evaluate_first_count'[\s\S]*'record_recount_quantity'[\s\S]*'evaluate_recount'/i
    );
  }
);

test(
  "Recount evaluation caller JWT ve dar Cycle Count rol kontratını kullanır",
  () => {
    assert.match(
      fn,
      /auth\.uid\(\)/i
    );

    for (
      const role of
      [
        "owner",
        "admin",
        "warehouse_manager",
        "supervisor",
        "inventory_controller",
        "operator"
      ]
    ) {
      assert.match(
        fn,
        new RegExp(
          `'${role}'`,
          "i"
        )
      );
    }

    assert.doesNotMatch(
      fn,
      /service_role|serviceRole|SUPABASE_SERVICE/i
    );
  }
);

test(
  "Recount evaluation canonical idempotency payload account dışı operasyon kimliklerini sabitler",
  () => {
    assert.match(
      fn,
      /v_payload\s*:=\s*jsonb_build_object\([\s\S]*'warehouseId'[\s\S]*'cycleCountId'[\s\S]*'cycleCountItemId'[\s\S]*'taskId'/i
    );

    assert.match(
      fn,
      /warehouse_cycle_count_write_requests/i
    );

    assert.match(
      fn,
      /response_payload/i
    );

    assert.match(
      fn,
      /for update/i
    );
  }
);

test(
  "parent count item ve recount task aynı transaction içinde kilitlenir",
  () => {
    assert.match(
      fn,
      /from public\.warehouse_cycle_counts[\s\S]*for update/i
    );

    assert.match(
      fn,
      /from public\.warehouse_cycle_count_items[\s\S]*for update/i
    );

    assert.match(
      fn,
      /from public\.warehouse_cycle_count_tasks[\s\S]*for update/i
    );
  }
);

test(
  "yalnız kaydedilmiş ikinci fiziksel miktar değerlendirilir",
  () => {
    assert.match(
      fn,
      /v_item\.first_count_quantity is null/i
    );

    assert.match(
      fn,
      /v_item\.second_count_quantity is null/i
    );

    assert.match(
      fn,
      /v_item\.recounted_at is null/i
    );

    assert.match(
      fn,
      /v_item\.recounted_by is null/i
    );

    assert.match(
      fn,
      /v_item\.status <> 'recount_required'/i
    );

    assert.match(
      fn,
      /v_item\.recount_required is distinct from true/i
    );
  }
);

test(
  "yalnız doğru in_progress recount görevi değerlendirilebilir",
  () => {
    assert.match(
      fn,
      /v_task\.type <> 'recount'/i
    );

    assert.match(
      fn,
      /v_task\.status <> 'in_progress'/i
    );

    assert.match(
      fn,
      /v_task\.assigned_user_id <> v_user_id/i
    );

    assert.match(
      fn,
      /v_task\.location_id is distinct from v_item\.location_id/i
    );

    assert.match(
      fn,
      /v_task\.product_id is distinct from v_item\.product_id/i
    );
  }
);

test(
  "Recount evaluation aynı item için yalnız bir recount result üretir",
  () => {
    assert.match(
      fn,
      /evaluation_stage\s*=\s*'recount'/i
    );

    assert.match(
      fn,
      /insert into[\s\S]*public\.warehouse_cycle_count_results/i
    );

    assert.match(
      fn,
      /'recount',[\s\S]*v_result_type/i
    );
  }
);

test(
  "ikinci miktar frozen expected quantity ile değerlendirilir",
  () => {
    assert.match(
      fn,
      /v_variance_quantity\s*:=\s*v_item\.second_count_quantity\s*-\s*v_item\.expected_quantity/i
    );

    assert.match(
      fn,
      /v_item\.expected_quantity\s*=\s*0[\s\S]*then 100/i
    );

    assert.match(
      fn,
      /round\([\s\S]*v_variance_quantity\s*\/\s*v_item\.expected_quantity[\s\S]*4/i
    );
  }
);

test(
  "miktar ve yüzde toleransı birlikte hesaplanır fakat üçüncü recount üretilmez",
  () => {
    assert.match(
      fn,
      /v_quantity_within_tolerance/i
    );

    assert.match(
      fn,
      /v_percentage_within_tolerance/i
    );

    assert.match(
      fn,
      /v_within_tolerance\s*:=\s*v_quantity_within_tolerance\s*and\s*v_percentage_within_tolerance/i
    );

    assert.doesNotMatch(
      fn,
      /insert into[\s\S]{0,120}warehouse_cycle_count_tasks/i
    );
  }
);

test(
  "recount sonrası final quantity kesin olarak ikinci fiziksel miktardır",
  () => {
    assert.match(
      fn,
      /final_count_quantity\s*=\s*second_count_quantity/i
    );

    assert.match(
      fn,
      /recount_required\s*=\s*false/i
    );
  }
);

test(
  "recount sonrası fark varsa under_review ve adjustment_required oluşur",
  () => {
    assert.match(
      fn,
      /v_adjustment_required\s*:=\s*v_variance_quantity\s*<>\s*0[\s\S]*v_item\.damaged_quantity\s*>\s*0/i
    );

    assert.match(
      fn,
      /when v_adjustment_required[\s\S]*then 'under_review'[\s\S]*else 'counted'/i
    );
  }
);

test(
  "recount result stage ikinci sayımı ve audit variance değerlerini kalıcılaştırır",
  () => {
    assert.match(
      fn,
      /evaluation_stage,[\s\S]*expected_quantity,[\s\S]*counted_quantity,[\s\S]*variance_quantity,[\s\S]*variance_percentage,[\s\S]*variance_value/i
    );

    assert.match(
      fn,
      /'recount'[\s\S]*v_item\.expected_quantity[\s\S]*v_item\.second_count_quantity/i
    );

    assert.match(
      fn,
      /false,[\s\S]*v_adjustment_required/i
    );
  }
);

test(
  "recount görevi değerlendirme transactionında tamamlanır",
  () => {
    assert.match(
      fn,
      /update public\.warehouse_cycle_count_tasks[\s\S]*status\s*=\s*'completed'/i
    );

    assert.match(
      fn,
      /completed_at\s*=\s*coalesce/i
    );
  }
);

test(
  "önceki recount_required exception çözülür",
  () => {
    assert.match(
      fn,
      /update public\.warehouse_cycle_count_exceptions[\s\S]*resolved\s*=\s*true/i
    );

    assert.match(
      fn,
      /type\s*=\s*'recount_required'/i
    );

    assert.match(
      fn,
      /resolved_by\s*=\s*v_user_id/i
    );
  }
);

test(
  "fark devam ediyorsa yalnız review exception persistence oluşturulur",
  () => {
    assert.match(
      fn,
      /when v_item\.damaged_quantity > 0[\s\S]*then 'damaged_stock'[\s\S]*else 'variance_exceeded'/i
    );

    assert.match(
      fn,
      /insert into[\s\S]*public\.warehouse_cycle_count_exceptions/i
    );

    assert.doesNotMatch(
      fn,
      /warehouse_cycle_count_(adjustments|approvals)/i
    );
  }
);

test(
  "parent Cycle Count kalan recount itemlarına göre yeniden hesaplanır",
  () => {
    assert.match(
      fn,
      /select exists \([\s\S]*recount_required\s*=\s*true[\s\S]*into v_has_recount/i
    );

    assert.match(
      fn,
      /when v_has_recount[\s\S]*then 'recount_required'/i
    );

    assert.match(
      fn,
      /when v_all_counted[\s\S]*then 'counted'/i
    );

    assert.match(
      fn,
      /update public\.warehouse_cycle_counts/i
    );
  }
);

test(
  "blind-count response expected first second final variance maliyet veya kullanıcı kimliği sızdırmaz",
  () => {
    const responseStart =
      fn.indexOf(
        "v_response :="
      );

    assert.ok(
      responseStart >= 0
    );

    const responseEnd =
      fn.indexOf(
        "update public.warehouse_cycle_count_write_requests",
        responseStart
      );

    assert.ok(
      responseEnd > responseStart
    );

    const response =
      fn.slice(
        responseStart,
        responseEnd
      );

    assert.doesNotMatch(
      response,
      /expected_quantity|expectedQuantity|first_count_quantity|second_count_quantity|final_count_quantity|variance_quantity|variance_percentage|variance_value|unit_cost|unitCost|recorded_by|recounted_by|evaluatedBy/i
    );

    assert.match(
      response,
      /'itemStatus'/i
    );

    assert.match(
      response,
      /'countStatus'/i
    );

    assert.match(
      response,
      /'reviewRequired'/i
    );

    assert.match(
      response,
      /'taskStatus'/i
    );
  }
);

test(
  "Recount evaluation hiçbir stok mutation veya adjustment approval oluşturmaz",
  () => {
    assert.doesNotMatch(
      fn,
      /warehouse_inventory_(balances|movements)/i
    );

    assert.doesNotMatch(
      fn,
      /warehouse_cycle_count_(adjustments|approvals)/i
    );

    assert.doesNotMatch(
      fn,
      /insert into\s+public\.warehouse_cycle_count_tasks/i
    );
  }
);

test(
  "RPC public ve anon'a kapalı yalnız authenticated execute alır",
  () => {
    assert.match(
      sql,
      /revoke all[\s\S]*warehouse_cycle_count_evaluate_recount\([\s\S]*from public/i
    );

    assert.match(
      sql,
      /revoke all[\s\S]*warehouse_cycle_count_evaluate_recount\([\s\S]*from anon/i
    );

    assert.match(
      sql,
      /grant execute[\s\S]*warehouse_cycle_count_evaluate_recount\([\s\S]*to authenticated/i
    );
  }
);
