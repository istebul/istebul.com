import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl =
  new URL(
    "../../supabase/migrations/20260818020500_warehouse_packing_generate_suggestions.sql",
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
  "generate_suggestions SECURITY DEFINER RPC'dir",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_generate_suggestions_write/i,
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
  "caller JWT auth.uid kullanılır",
  () => {
    assert.match(
      executableSql,
      /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i,
    );
  },
);

test(
  "account role authorization vardır",
  () => {
    assert.match(
      executableSql,
      /warehouse_has_account_role\s*\(/i,
    );
  },
);

test(
  "generate_suggestions stable idempotency kullanır",
  () => {
    assert.match(
      executableSql,
      /v_action constant text\s*:=\s*'generate_suggestions'/i,
    );
    assert.match(
      executableSql,
      /v_existing_user_id\s*<>\s*v_user_id/i,
    );
    assert.match(
      executableSql,
      /on conflict\s*\(\s*account_id\s*,\s*request_id\s*\)\s*do nothing/i,
    );
  },
);

test(
  "Packing terminal states kapalıdır",
  () => {
    assert.match(
      executableSql,
      /v_packing\.status\s+in\s*\(\s*'packed'\s*,\s*'shipping_ready'\s*,\s*'cancelled'\s*\)/i,
    );
  },
);

test(
  "varsayılan item set remaining_quantity pozitif satırlardır",
  () => {
    assert.match(
      executableSql,
      /if p_packing_item_ids is null[\s\S]*?remaining_quantity\s*>\s*0/i,
    );
  },
);

test(
  "explicit item kimlikleri normalize edilir",
  () => {
    assert.match(
      executableSql,
      /group by id/i,
    );
    assert.match(
      executableSql,
      /cardinality\(v_item_ids\)/i,
    );
  },
);

test(
  "Packing item set account ve parent scope içinde doğrulanır",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_items[\s\S]*?account_id\s*=\s*p_account_id[\s\S]*?packing_id\s*=\s*v_packing\.id/i,
    );
  },
);

test(
  "selected items FOR SHARE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_items[\s\S]*?id\s*=\s*any\(v_item_ids\)[\s\S]*?for share/i,
    );
  },
);

test(
  "weight remaining quantity üzerinden hesaplanır",
  () => {
    assert.match(
      executableSql,
      /unit_weight\s*\/\s*1000[\s\S]*?remaining_quantity/i,
    );
  },
);

test(
  "volume remaining quantity üzerinden hesaplanır",
  () => {
    assert.match(
      executableSql,
      /unit_volume\s*\*\s*1000000[\s\S]*?remaining_quantity/i,
    );
  },
);

test(
  "weight metadata eksikliği detected edilir",
  () => {
    assert.match(
      executableSql,
      /bool_and\(\s*unit_weight is not null/i,
    );
    assert.match(
      executableSql,
      /v_total_weight\s*:=\s*null/i,
    );
  },
);

test(
  "volume metadata eksikliği detected edilir",
  () => {
    assert.match(
      executableSql,
      /bool_and\(\s*unit_volume is not null/i,
    );
    assert.match(
      executableSql,
      /v_total_volume\s*:=\s*null/i,
    );
  },
);

test(
  "mixed SKU hesaplanır",
  () => {
    assert.match(
      executableSql,
      /count\(\s*distinct\s*\(/i,
    );
  },
);

test(
  "yalnız aktif persisted containerlar kullanılır",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_containers[\s\S]*?active\s*=\s*true/i,
    );
  },
);

test(
  "client container snapshot kabul edilmez",
  () => {
    assert.match(
      executableSql,
      /p_container_ids\s+uuid\[\]/i,
    );
    assert.doesNotMatch(
      executableSql,
      /p_containers\s+jsonb/i,
    );
  },
);

test(
  "container set FOR SHARE kilitlenir",
  () => {
    assert.match(
      executableSql,
      /warehouse_packing_containers[\s\S]*?for share/i,
    );
  },
);

test(
  "temperature compatibility fail closed",
  () => {
    assert.match(
      executableSql,
      /not v_container\.temperature_controlled[\s\S]*?continue/i,
    );
  },
);

test(
  "hazardous compatibility fail closed",
  () => {
    assert.match(
      executableSql,
      /not v_container\.hazardous_material_allowed[\s\S]*?continue/i,
    );
  },
);

test(
  "container weight kg normalize edilir",
  () => {
    assert.match(
      executableSql,
      /maximum_weight\s*\/\s*1000/i,
    );
  },
);

test(
  "container volume dimensions üzerinden hesaplanabilir",
  () => {
    assert.match(
      executableSql,
      /dimensions[\s\S]*?'length'/i,
    );
    assert.match(
      executableSql,
      /dimensions[\s\S]*?'width'/i,
    );
    assert.match(
      executableSql,
      /dimensions[\s\S]*?'height'/i,
    );
  },
);

test(
  "package count ceil weight ve volume maksimumudur",
  () => {
    assert.match(
      executableSql,
      /ceil\([\s\S]*?v_total_weight/i,
    );
    assert.match(
      executableSql,
      /ceil\([\s\S]*?v_total_volume/i,
    );
    assert.match(
      executableSql,
      /greatest\(\s*1,\s*v_weight_package_count,\s*v_volume_package_count/i,
    );
  },
);

test(
  "utilization thresholds korunur",
  () => {
    for (const threshold of [
      "0.85",
      "0.70",
      "0.50",
      "0.25",
    ]) {
      assert.ok(
        executableSql.includes(
          threshold,
        ),
      );
    }
  },
);

test(
  "compatibility score 70 taban kullanır",
  () => {
    assert.match(
      executableSql,
      /v_compatibility_score\s*:=\s*70/i,
    );
  },
);

test(
  "strategy score tüm strategyleri kapsar",
  () => {
    for (const strategy of [
      "palletization",
      "temperature_controlled",
      "hazardous_material",
      "single_package",
      "multi_package",
      "single_sku",
      "mixed_sku",
      "weight_based",
      "volume_based",
      "cartonization",
      "carrier_optimized",
    ]) {
      assert.ok(
        executableSql.includes(
          `'${strategy}'`,
        ),
        `Eksik strategy: ${strategy}`,
      );
    }
  },
);

test(
  "total score domain ağırlıklarını korur",
  () => {
    assert.match(
      executableSql,
      /v_weight_score\s*\*\s*0\.20[\s\S]*?v_volume_score\s*\*\s*0\.25[\s\S]*?v_compatibility_score\s*\*\s*0\.25[\s\S]*?v_utilization_score\s*\*\s*0\.20[\s\S]*?v_strategy_score\s*\*\s*0\.10/i,
    );
  },
);

test(
  "packing_item_ids uuid[] olarak persist edilir",
  () => {
    assert.match(
      executableSql,
      /insert into public\.warehouse_packing_suggestions[\s\S]*?packing_item_ids/i,
    );

    assert.doesNotMatch(
      executableSql,
      /insert\s+into\s+public\.warehouse_packing_suggestions[\s\S]*?values\s*\([\s\S]*?to_jsonb\(v_item_ids\)/i,
    );
  },
);

test(
  "reasons ve warnings text[] kullanır",
  () => {
    assert.match(
      executableSql,
      /v_reasons\s+text\[\]/i,
    );
    assert.match(
      executableSql,
      /v_warnings\s+text\[\]/i,
    );
    assert.match(
      executableSql,
      /array_append\(\s*v_reasons/i,
    );
    assert.match(
      executableSql,
      /array_append\(\s*v_warnings/i,
    );
  },
);

test(
  "score JSONB tutulur",
  () => {
    assert.match(
      executableSql,
      /v_score\s+jsonb/i,
    );
    assert.match(
      executableSql,
      /v_score\s*:=\s*jsonb_build_object/i,
    );
  },
);

test(
  "container snapshot JSONB ve DB row kaynaklıdır",
  () => {
    assert.match(
      executableSql,
      /v_container_snapshot\s+jsonb/i,
    );
    assert.match(
      executableSql,
      /'createdBy'\s*,\s*v_container\.created_by/i,
    );
  },
);

test(
  "suggestion exact persistence kolonlarına yazılır",
  () => {
    assert.match(
      executableSql,
      /insert into public\.warehouse_packing_suggestions/i,
    );

    for (const column of [
      "packing_item_ids",
      "container_snapshot",
      "score",
      "reasons",
      "warnings",
      "selected",
    ]) {
      assert.ok(
        executableSql.includes(
          column,
        ),
        `Eksik column: ${column}`,
      );
    }
  },
);

test(
  "highest score selected true olur",
  () => {
    assert.match(
      executableSql,
      /v_total_score\s*>\s*v_best_score/i,
    );
    assert.match(
      executableSql,
      /selected\s*=\s*true[\s\S]*?v_best_suggestion_id/i,
    );
  },
);

test(
  "response totalScore azalan sırada döner",
  () => {
    assert.match(
      executableSql,
      /totalScore[\s\S]*?numeric desc/i,
    );
  },
);

test(
  "Packing Picking inventory mutation yapılmaz",
  () => {
    for (const table of [
      "warehouse_packings",
      "warehouse_packing_items",
      "warehouse_packing_packages",
      "warehouse_packing_package_items",
      "warehouse_pickings",
      "warehouse_picking_items",
      "warehouse_inventory_balances",
      "warehouse_inventory_movements",
    ]) {
      assert.doesNotMatch(
        executableSql,
        new RegExp(
          `(?:insert into|update|delete from)\\s+public\\.${table}\\b`,
          "i",
        ),
      );
    }
  },
);

test(
  "public anon kapalı authenticated execute açık service role yok",
  () => {
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_generate_suggestions_write[\s\S]*?from public/i,
    );
    assert.match(
      sql,
      /revoke all on function[\s\S]*?warehouse_packing_generate_suggestions_write[\s\S]*?from anon/i,
    );
    assert.match(
      sql,
      /grant execute on function[\s\S]*?warehouse_packing_generate_suggestions_write[\s\S]*?to authenticated/i,
    );
    assert.doesNotMatch(
      executableSql,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);
