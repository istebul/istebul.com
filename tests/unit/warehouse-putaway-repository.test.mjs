import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const sourcePath =
  "src/warehouse/services/SupabasePutawayRepository.ts";
const indexPath = "src/warehouse/index.ts";

const source = fs.readFileSync(sourcePath, "utf8");
const indexSource = fs.readFileSync(indexPath, "utf8");

async function loadRepositoryModule() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "warehouse-putaway-repository-"),
  );
  const output = path.join(directory, "repository.mjs");

  await build({
    entryPoints: [sourcePath],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: output,
    external: ["@supabase/supabase-js"],
    logLevel: "silent",
  });

  return import(pathToFileURL(output).href + "?v=" + Date.now());
}

test(
  "SupabasePutawayRepository PutawayRepository uygular ve tüm okuma tablolarını kullanır",
  () => {
    assert.match(source, /implements PutawayRepository/);

    for (const table of [
      "warehouse_putaways",
      "warehouse_putaway_items",
      "warehouse_putaway_suggestions",
      "warehouse_putaway_tasks",
      "warehouse_putaway_exceptions",
    ]) {
      assert.match(source, new RegExp(table));
    }
  },
);

test(
  "repository tenant ve putaway filtrelerini RLS okumalarında taşır",
  () => {
    assert.match(source, /\.eq\("account_id",\s*tenantId\)/);
    assert.match(source, /\.eq\("putaway_id",\s*putawayId\)/);
    assert.match(source, /\.maybeSingle\(\)/);
  },
);

test(
  "repository item tracking ve transfer kimliklerini map eder",
  () => {
    assert.match(source, /lotNumber:/);
    assert.match(source, /serialNumber:/);
    assert.match(source, /inventoryMovementIds:/);
    assert.match(source, /transactionGroupIds:/);
    assert.match(source, /suggestionId:/);
  },
);

test(
  "repository suggestion skorunu ve görev/istisna alanlarını map eder",
  () => {
    assert.match(source, /capacityScore:/);
    assert.match(source, /compatibilityScore:/);
    assert.match(source, /totalScore:/);
    assert.match(source, /assignedEquipmentId:/);
    assert.match(source, /resolutionNotes:/);
  },
);

test(
  "SupabasePutawayRepository doğrudan tablo mutation çağrısı içermez",
  () => {
    assert.doesNotMatch(
      source,
      /\.(insert|update|upsert|delete)\s*\(/,
    );
    assert.match(source, /Doğrudan Putaway yazma kapalıdır/);
    assert.match(source, /write RPC kullanılmalıdır/);
  },
);

test(
  "SupabasePutawayRepository service role kullanmaz",
  () => {
    assert.doesNotMatch(
      source,
      /service_role|SUPABASE_SERVICE_ROLE_KEY/i,
    );
  },
);

test(
  "SupabasePutawayRepository public warehouse exportuna eklenir",
  () => {
    assert.match(indexSource, /SupabasePutawayRepository/);
  },
);

test(
  "repository derlenir ve mutation metotları güvenli biçimde reddedilir",
  async () => {
    const module = await loadRepositoryModule();
    const repository =
      new module.SupabasePutawayRepository({});

    for (const call of [
      () => repository.save({}),
      () => repository.saveItem({}),
      () => repository.saveSuggestion({}),
      () => repository.saveTask({}),
      () => repository.saveException({}),
    ]) {
      await assert.rejects(
        call(),
        /Güvenli Putaway write RPC/,
      );
    }
  },
);
