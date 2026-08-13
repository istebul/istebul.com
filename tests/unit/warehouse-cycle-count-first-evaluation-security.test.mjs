import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const MIGRATION =
  "supabase/migrations/20260813221000_warehouse_cycle_count_first_evaluation.sql";

const PERSISTENCE =
  "supabase/migrations/20260813213500_warehouse_cycle_count_variance_recount_persistence.sql";

async function sql() {
  return readFile(
    MIGRATION,
    "utf8"
  );
}

function functionBody(
  source
) {
  const start =
    source.indexOf(
      "create or replace function"
    );

  const end =
    source.indexOf(
      "$warehouse_cycle_count_evaluate_first$;",
      start
    );

  assert.ok(
    start >= 0,
    "Evaluation function başlangıcı bulunamadı."
  );

  assert.ok(
    end > start,
    "Evaluation function sonu bulunamadı."
  );

  return source.slice(
    start,
    end
  );
}

function responseBlock(
  source
) {
  const start =
    source.indexOf(
      "v_response :="
    );

  const end =
    source.indexOf(
      "update public.warehouse_cycle_count_write_requests",
      start
    );

  assert.ok(
    start >= 0 &&
    end > start
  );

  return source.slice(
    start,
    end
  );
}

test(
  "A7.3.1 write request action sözleşmesine evaluate_first_count ekler",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /warehouse_cycle_count_write_requests_action_check/i
    );

    assert.match(
      source,
      /'record_quantity'[\s\S]*'evaluate_first_count'/i
    );
  }
);

test(
  "evaluation RPC caller JWT ve dar Cycle Count rol listesini kullanır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /warehouse_cycle_count_evaluate_first_count/i
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
  "evaluation idempotency account ve warehouse dahil canonical payload kullanır",
  async () => {
    const source =
      await sql();

    for (
      const key
      of [
        "warehouseId",
        "cycleCountId",
        "cycleCountItemId",
        "taskId"
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
      /warehouse_cycle_count_write_requests/i
    );

    assert.match(
      source,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i
    );

    assert.match(
      source,
      /v_existing_payload\s*<>\s*v_payload/i
    );

    assert.match(
      source,
      /v_existing_response is not null[\s\S]*return v_existing_response/i
    );
  }
);

test(
  "parent count item ve task aynı transaction içinde FOR UPDATE kilitlenir",
  async () => {
    const source =
      functionBody(
        await sql()
      );

    assert.match(
      source,
      /from public\.warehouse_cycle_counts[\s\S]*for update/i
    );

    assert.match(
      source,
      /from public\.warehouse_cycle_count_items[\s\S]*for update/i
    );

    assert.match(
      source,
      /from public\.warehouse_cycle_count_tasks[\s\S]*for update/i
    );
  }
);

test(
  "evaluation yalnız kaydedilmiş ilk fiziksel miktarı değerlendirir",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /v_item\.first_count_quantity is null/i
    );

    assert.match(
      source,
      /v_item\.second_count_quantity is not null/i
    );

    assert.match(
      source,
      /v_item\.status\s*<>\s*'in_progress'/i
    );

    assert.match(
      source,
      /v_item\.counted_by is distinct from v_user_id/i
    );
  }
);

test(
  "ilk sayım görevi aynı item kullanıcı warehouse ve aktif görev kapsamında doğrulanır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /v_task\.cycle_count_item_id is distinct from[\s\S]*p_cycle_count_item_id/i
    );

    assert.match(
      source,
      /v_task\.assigned_user_id is distinct from[\s\S]*v_user_id/i
    );

    assert.match(
      source,
      /v_task\.status\s*<>\s*'in_progress'/i
    );

    for (
      const type
      of [
        "count_location",
        "count_product",
        "count_lot",
        "count_serial",
        "blind_count"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `'${type}'`
        )
      );
    }
  }
);

test(
  "ilk evaluation sonucu aynı item için ikinci kez oluşturulamaz",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /evaluation_stage\s*=\s*'first_count'/i
    );

    assert.match(
      source,
      /ilk değerlendirmesi daha önce tamamlandı/i
    );

    assert.match(
      source,
      /errcode\s*=\s*'23505'/i
    );
  }
);

test(
  "variance miktarı dondurulmuş expected quantity ile hesaplanır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /v_item\.first_count_quantity\s*-\s*v_item\.expected_quantity/i
    );

    assert.doesNotMatch(
      functionBody(
        source
      ),
      /warehouse_inventory_balances/i
    );
  }
);

test(
  "variance percentage sıfır expected ve dört ondalık domain sözleşmesini korur",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /when v_item\.expected_quantity = 0[\s\S]*v_variance_quantity = 0[\s\S]*then 0/i
    );

    assert.match(
      source,
      /when v_item\.expected_quantity = 0[\s\S]*then 100/i
    );

    assert.match(
      source,
      /round\([\s\S]*v_variance_quantity[\s\S]*v_item\.expected_quantity[\s\S]*100[\s\S]*4\s*\)/i
    );
  }
);

test(
  "miktar ve yüzde toleransı birlikte geçmeden withinTolerance oluşmaz",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /v_quantity_within_tolerance[\s\S]*abs\([\s\S]*v_variance_quantity[\s\S]*<=\s*v_item\.tolerance_quantity/i
    );

    assert.match(
      source,
      /v_percentage_within_tolerance[\s\S]*abs\([\s\S]*v_variance_percentage[\s\S]*<=\s*v_item\.tolerance_percentage/i
    );

    assert.match(
      source,
      /v_within_tolerance\s*:=[\s\S]*v_quantity_within_tolerance[\s\S]*and\s+v_percentage_within_tolerance/i
    );

    assert.match(
      source,
      /tolerance_percentage\s*<=\s*100/i
    );
  }
);

test(
  "result tipi mevcut CycleCountVarianceService önceliğini korur",
  async () => {
    const source =
      await sql();

    const body =
      functionBody(
        source
      );

    const damaged =
      body.indexOf(
        "then 'damaged'"
      );

    const missing =
      body.indexOf(
        "then 'missing_stock'"
      );

    const unexpected =
      body.indexOf(
        "then 'unexpected_stock'"
      );

    const match =
      body.indexOf(
        "then 'match'"
      );

    const recount =
      body.indexOf(
        "then 'recount_required'"
      );

    const shortage =
      body.indexOf(
        "then 'shortage'"
      );

    assert.ok(
      damaged >= 0 &&
      damaged < missing &&
      missing < unexpected &&
      unexpected < match &&
      match < recount &&
      recount < shortage
    );

    assert.match(
      body,
      /else 'surplus'/
    );
  }
);

test(
  "first_count sonucu audit tablosuna atomik yazılır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /insert into\s+public\.warehouse_cycle_count_results/i
    );

    for (
      const field
      of [
        "expected_quantity",
        "counted_quantity",
        "variance_quantity",
        "variance_percentage",
        "within_tolerance",
        "recount_required",
        "adjustment_required"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `\\b${field}\\b`,
          "i"
        )
      );
    }

    assert.match(
      source,
      /'first_count'/
    );
  }
);

test(
  "item sonucu counted under_review veya recount_required durumuna geçer",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /when v_recount_required[\s\S]*then 'recount_required'/i
    );

    assert.match(
      source,
      /when v_adjustment_required[\s\S]*then 'under_review'/i
    );

    assert.match(
      source,
      /else 'counted'/i
    );

    assert.match(
      source,
      /final_count_quantity\s*=\s*first_count_quantity/i
    );
  }
);

test(
  "ilk sayım görevi evaluation transactionında tamamlanır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /update public\.warehouse_cycle_count_tasks[\s\S]*status\s*=\s*'completed'[\s\S]*completed_at/i
    );
  }
);

test(
  "tolerans dışı ilk sayım kontrollü recount task oluşturur",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /if v_recount_required then/i
    );

    assert.match(
      source,
      /insert into\s+public\.warehouse_cycle_count_tasks/i
    );

    assert.match(
      source,
      /'recount'[\s\S]*'assigned'/i
    );

    assert.match(
      source,
      /assigned_user_id[\s\S]*v_user_id/i
    );

    assert.match(
      source,
      /greatest\([\s\S]*v_task\.priority[\s\S]*80/i
    );
  }
);

test(
  "variance veya recount gerektiğinde kontrollü exception persistence oluşturulur",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /insert into\s+public\.warehouse_cycle_count_exceptions/i
    );

    assert.match(
      source,
      /'damaged_stock'/i
    );

    assert.match(
      source,
      /'recount_required'/i
    );

    assert.match(
      source,
      /'variance_exceeded'/i
    );
  }
);

test(
  "parent Cycle Count item durumlarına göre recount_required veya counted yenilenir",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /recount_required\s*=\s*true/i
    );

    assert.match(
      source,
      /bool_and\([\s\S]*'counted'[\s\S]*'under_review'[\s\S]*'approved'[\s\S]*'adjusted'/i
    );

    assert.match(
      source,
      /when v_has_recount[\s\S]*then 'recount_required'/i
    );

    assert.match(
      source,
      /when v_all_counted[\s\S]*then 'counted'/i
    );
  }
);

test(
  "blind-count RPC cevabı expected variance yönü miktarı veya maliyeti açmaz",
  async () => {
    const source =
      responseBlock(
        await sql()
      );

    for (
      const forbidden
      of [
        "expectedQuantity",
        "expected_quantity",
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
        "surplus",
        "missing_stock",
        "unexpected_stock"
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

    assert.match(
      source,
      /'recountRequired'/
    );

    assert.match(
      source,
      /'reviewRequired'/
    );
  }
);

test(
  "A7.3.1 inventory adjustment approval veya ikinci sayım mutationı yapmaz",
  async () => {
    const source =
      functionBody(
        await sql()
      );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_(balances|movements)/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_(adjustments|approvals)/i
    );

    assert.doesNotMatch(
      source,
      /^\s*second_count_quantity\s*=/im
    );

    assert.doesNotMatch(
      source,
      /^\s*first_count_quantity\s*=/im
    );

    assert.doesNotMatch(
      source,
      /update\s+public\.warehouse_inventory_/i
    );

    assert.doesNotMatch(
      source,
      /insert into\s+public\.warehouse_inventory_/i
    );
  }
);

test(
  "Result ve Exception direct read kör sayım için kapalı kalır",
  async () => {
    const persistence =
      await readFile(
        PERSISTENCE,
        "utf8"
      );

    assert.match(
      persistence,
      /revoke all\s+on table public\.warehouse_cycle_count_results\s+from authenticated/i
    );

    assert.match(
      persistence,
      /revoke all\s+on table public\.warehouse_cycle_count_exceptions\s+from authenticated/i
    );

    assert.doesNotMatch(
      persistence,
      /grant select[\s\S]*warehouse_cycle_count_(results|exceptions)[\s\S]*authenticated/i
    );
  }
);

test(
  "evaluation RPC yalnız authenticated execute sınırındadır",
  async () => {
    const source =
      await sql();

    const signatures =
      source.match(
        /warehouse_cycle_count_evaluate_first_count\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*uuid\s*\)/gi
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

    assert.doesNotMatch(
      source,
      /service_role|SUPABASE_SERVICE_ROLE_KEY/i
    );
  }
);
