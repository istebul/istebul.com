import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const MIGRATION =
  "supabase/migrations/20260813170000_warehouse_cycle_count_quantity_write.sql";

async function sql() {
  return readFile(
    MIGRATION,
    "utf8"
  );
}

test(
  "A7.2.0 ayrı Cycle Count idempotency tablosu kurar",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /create table if not exists[\s\S]*warehouse_cycle_count_write_requests/i
    );

    assert.match(
      source,
      /primary key\s*\(\s*account_id,\s*request_id\s*\)/i
    );

    assert.match(
      source,
      /user_id uuid not null[\s\S]*references auth\.users/i
    );

    assert.match(
      source,
      /action in\s*\(\s*'record_quantity'\s*\)/i
    );

    assert.match(
      source,
      /request_payload jsonb/i
    );

    assert.match(
      source,
      /response_payload jsonb/i
    );
  }
);

test(
  "write request RLS yalnız isteğin sahibi ve account üyesi için okunur",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /alter table[\s\S]*warehouse_cycle_count_write_requests[\s\S]*enable row level security/i
    );

    assert.match(
      source,
      /user_id\s*=\s*auth\.uid\(\)/i
    );

    assert.match(
      source,
      /warehouse_has_account_access\s*\(\s*account_id\s*\)/i
    );

    assert.match(
      source,
      /revoke insert,\s*update,\s*delete[\s\S]*warehouse_cycle_count_write_requests[\s\S]*from authenticated/i
    );
  }
);

test(
  "Cycle Count doğrudan authenticated mutation kapatılır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /revoke insert,\s*update,\s*delete[\s\S]*warehouse_cycle_counts,[\s\S]*warehouse_cycle_count_items,[\s\S]*warehouse_cycle_count_tasks[\s\S]*from authenticated/i
    );

    assert.match(
      source,
      /grant select[\s\S]*warehouse_cycle_counts,[\s\S]*warehouse_cycle_count_items,[\s\S]*warehouse_cycle_count_tasks[\s\S]*to authenticated/i
    );
  }
);

test(
  "quantity RPC caller JWT ve dar rol listesi kullanır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /create or replace function[\s\S]*warehouse_cycle_count_record_quantity_write/i
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

    assert.doesNotMatch(
      source,
      /service_role|SUPABASE_SERVICE_ROLE_KEY/i
    );
  }
);

test(
  "quantity sıfır dahil negatif olmayan değer kabul eder",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /v_quantity is null[\s\S]*v_quantity < 0/i
    );

    assert.doesNotMatch(
      source,
      /v_quantity\s*<=\s*0/i
    );

    assert.match(
      source,
      /Sayılan miktar sıfır veya daha büyük olmalıdır/
    );
  }
);

test(
  "Idempotency-Key aynı kullanıcı action ve payload ile stabil çalışır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /p_request_id is null/i
    );

    assert.match(
      source,
      /on conflict\s*\(\s*account_id,\s*request_id\s*\)\s*do nothing/i
    );

    assert.match(
      source,
      /for update/i
    );

    assert.match(
      source,
      /v_existing_user_id\s*<>\s*v_user_id/i
    );

    assert.match(
      source,
      /v_existing_action\s*<>\s*v_action[\s\S]*v_existing_payload\s*<>\s*v_payload/i
    );

    assert.match(
      source,
      /v_existing_response is not null[\s\S]*return v_existing_response/i
    );

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
  }
);

test(
  "parent item ve task aynı transaction içinde account scope ile kilitlenir",
  async () => {
    const source =
      await sql();

    for (
      const table
      of [
        "warehouse_cycle_counts",
        "warehouse_cycle_count_items",
        "warehouse_cycle_count_tasks"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `from public\\.${table}[\\s\\S]*?account_id[\\s\\S]*?for update`,
          "i"
        )
      );
    }

    assert.match(
      source,
      /v_count\.status\s*<>\s*'in_progress'/i
    );

    assert.match(
      source,
      /v_item\.status not in\s*\(\s*'assigned',\s*'in_progress'\s*\)/i
    );

    assert.match(
      source,
      /v_task\.status not in\s*\(\s*'assigned',\s*'in_progress'\s*\)/i
    );
  }
);

test(
  "quantity yalnız giriş yapan kullanıcıya atanmış görevden kaydedilir",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /v_task\.assigned_user_id is null[\s\S]*v_task\.assigned_user_id\s*<>\s*v_user_id/i
    );

    assert.match(
      source,
      /Bu sayım görevi giriş yapan kullanıcıya atanmış değildir/
    );
  }
);

test(
  "lokasyon taraması DB üzerinde item lokasyonuna karşı doğrulanır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /from public\.warehouse_locations/i
    );

    assert.match(
      source,
      /warehouse_id\s*=\s*v_item\.warehouse_id/i
    );

    assert.match(
      source,
      /id\s*=\s*v_item\.location_id/i
    );

    assert.match(
      source,
      /v_location\.barcode/i
    );

    assert.match(
      source,
      /v_location\.code/i
    );

    assert.match(
      source,
      /v_location\.full_code/i
    );

    assert.match(
      source,
      /Okutulan lokasyon seçili sayım göreviyle uyuşmuyor/
    );
  }
);

test(
  "SKU satırı generic ürün barkodu yerine doğru SKU kodu veya barkodunu zorunlu tutar",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /if v_item\.sku_id is not null then/i
    );

    assert.match(
      source,
      /from public\.warehouse_product_skus/i
    );

    assert.match(
      source,
      /v_sku\.sku_code/i
    );

    assert.match(
      source,
      /from public\.warehouse_product_barcodes/i
    );

    assert.match(
      source,
      /sku_id\s*=\s*v_item\.sku_id/i
    );

    assert.match(
      source,
      /active\s*=\s*true/i
    );
  }
);

test(
  "ürün seviyesindeki satır yalnız ürün kodu veya generic aktif ürün barkodunu kabul eder",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /v_product\.code/i
    );

    assert.match(
      source,
      /sku_id is null/i
    );

    assert.match(
      source,
      /product_id\s*=\s*v_item\.product_id/i
    );
  }
);

test(
  "A7.2.0 yalnız first_count_quantity counted_by counted_at alanlarını yazar",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /update public\.warehouse_cycle_count_items[\s\S]*first_count_quantity\s*=\s*v_quantity/i
    );

    assert.match(
      source,
      /counted_by\s*=\s*v_user_id/i
    );

    assert.match(
      source,
      /counted_at\s*=\s*v_now/i
    );

    assert.match(
      source,
      /status\s*=\s*'in_progress'/i
    );
  }
);

test(
  "ilk fiziksel sayım yeni request kimliğiyle üzerine yazılamaz",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /v_item\.first_count_quantity is not null/i
    );

    assert.match(
      source,
      /errcode\s*=\s*'23505'[\s\S]*ilk fiziksel sayım miktarı zaten kaydedildi/i
    );

    assert.match(
      source,
      /Yeniden sayım için ayrı kontrollü akışı kullanın/
    );
  }
);

test(
  "A7.2.0 taskı başlatabilir ama tamamlamaz",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /update public\.warehouse_cycle_count_tasks[\s\S]*status\s*=\s*'in_progress'/i
    );

    assert.match(
      source,
      /started_at\s*=\s*coalesce/i
    );

    assert.doesNotMatch(
      source,
      /update public\.warehouse_cycle_count_tasks[\s\S]{0,400}?status\s*=\s*'completed'/i
    );
  }
);

test(
  "A7.2.0 stok/result/exception/adjustment mutationı oluşturmaz",
  async () => {
    const source =
      await sql();

    assert.doesNotMatch(
      source,
      /warehouse_inventory_/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_results/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_exceptions/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_adjustments/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_approvals/i
    );

    assert.doesNotMatch(
      source,
      /second_count_quantity/i
    );

    assert.doesNotMatch(
      source,
      /final_count_quantity/i
    );

    assert.doesNotMatch(
      source,
      /variance_quantity|variance_percentage|variance_value|unit_cost/i
    );
  }
);

test(
  "RPC yanıtı kör sayım için hassas beklenen stok veya maliyet alanı döndürmez",
  async () => {
    const source =
      await sql();

    const resultIndex =
      source.indexOf(
        "v_result :="
      );

    assert.notEqual(
      resultIndex,
      -1
    );

    const resultBlock =
      source.slice(
        resultIndex
      );

    assert.match(
      resultBlock,
      /'countedQuantity'/i
    );

    assert.match(
      resultBlock,
      /'recordedBy'/i
    );

    assert.doesNotMatch(
      resultBlock,
      /expected_quantity|expectedQuantity|unit_cost|unitCost/i
    );
  }
);

test(
  "RPC yalnız authenticated role execute edilir",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /revoke all[\s\S]*warehouse_cycle_count_record_quantity_write[\s\S]*from public/i
    );

    assert.match(
      source,
      /revoke all[\s\S]*warehouse_cycle_count_record_quantity_write[\s\S]*from anon/i
    );

    assert.match(
      source,
      /grant execute[\s\S]*warehouse_cycle_count_record_quantity_write[\s\S]*to authenticated/i
    );
  }
);

test(
  "quantity write seçili WarehouseIQ deposuna açıkça bağlanır",
  async () => {
    const source =
      await sql();

    assert.match(
      source,
      /p_warehouse_id uuid/i
    );

    assert.match(
      source,
      /if p_account_id is null[\s\S]*p_warehouse_id is null/i
    );

    assert.match(
      source,
      /'warehouseId'\s*,\s*p_warehouse_id/i
    );

    assert.match(
      source,
      /from public\.warehouse_cycle_counts[\s\S]*where account_id\s*=\s*p_account_id[\s\S]*warehouse_id\s*=\s*p_warehouse_id[\s\S]*id\s*=\s*p_cycle_count_id[\s\S]*for update/i
    );

    const warehousePayloadMatches =
      source.match(
        /'warehouseId'\s*,\s*p_warehouse_id/gi
      ) || [];

    assert.equal(
      warehousePayloadMatches.length,
      2
    );
  }
);
