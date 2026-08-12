import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const sourcePath =
  "src/warehouse/services/SupabasePickingRepository.ts";

const indexPath =
  "src/warehouse/index.ts";

const source =
  fs.readFileSync(sourcePath, "utf8");

const indexSource =
  fs.readFileSync(indexPath, "utf8");

async function loadRepositoryModule() {
  const directory = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "warehouse-picking-repository-",
    ),
  );

  const output =
    path.join(directory, "repository.mjs");

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

  return import(
    pathToFileURL(output).href +
      "?v=" +
      Date.now()
  );
}

test(
  "SupabasePickingRepository PickingRepository uygular ve tüm read tablolarını kullanır",
  () => {
    assert.match(
      source,
      /implements PickingRepository/,
    );

    for (const table of [
      "warehouse_pickings",
      "warehouse_picking_items",
      "warehouse_picking_suggestions",
      "warehouse_picking_tasks",
      "warehouse_picking_routes",
      "warehouse_picking_exceptions",
      "warehouse_picking_waves",
      "warehouse_picking_batches",
    ]) {
      assert.match(
        source,
        new RegExp(table),
      );
    }
  },
);

test(
  "repository tüm temel Picking filtrelerini account sınırı ile taşır",
  () => {
    assert.match(
      source,
      /\.eq\("account_id",\s*filter\.tenantId\)/,
    );

    for (const field of [
      "warehouse_id",
      "destination_location_id",
      "strategy",
      "status",
      "order_id",
      "wave_id",
      "batch_id",
      "reference_type",
      "reference_id",
    ]) {
      assert.match(
        source,
        new RegExp(
          `\\.eq\\(\\s*"${field}"`,
        ),
      );
    }

    assert.match(
      source,
      /\.maybeSingle\(\)/,
    );
  },
);

test(
  "repository araması picking, sipariş ve referans numaralarını kapsar",
  () => {
    assert.match(
      source,
      /picking_number/,
    );

    assert.match(
      source,
      /order_number/,
    );

    assert.match(
      source,
      /reference_number/,
    );

    assert.match(
      source,
      /toLocaleLowerCase\("tr-TR"\)/,
    );
  },
);

test(
  "Picking item mapper takip, rezervasyon ve stok hareket kimliklerini korur",
  () => {
    assert.match(
      source,
      /lotNumber:/,
    );

    assert.match(
      source,
      /serialNumber:/,
    );

    assert.match(
      source,
      /productionDate:/,
    );

    assert.match(
      source,
      /expiryDate:/,
    );

    assert.match(
      source,
      /reservationId:/,
    );

    assert.match(
      source,
      /inventoryMovementIds:/,
    );

    assert.match(
      source,
      /transactionGroupIds:/,
    );

    assert.match(
      source,
      /suggestionId:/,
    );
  },
);

test(
  "Picking suggestion balance ve score domain nesnelerini korur",
  () => {
    assert.match(
      source,
      /balance:\s*row\.balance/,
    );

    assert.match(
      source,
      /score:\s*row\.score/,
    );

    assert.match(
      source,
      /right\.score\.totalScore\s*-\s*left\.score\.totalScore/,
    );
  },
);

test(
  "Picking görev, rota ve istisna alanları map edilir",
  () => {
    assert.match(
      source,
      /sequence:\s*row\.sequence/,
    );

    assert.match(
      source,
      /assignedEquipmentId:/,
    );

    assert.match(
      source,
      /estimatedDurationSeconds:/,
    );

    assert.match(
      source,
      /steps:\s*row\.steps\s*\?\?\s*\[\]/,
    );

    assert.match(
      source,
      /taskId:/,
    );

    assert.match(
      source,
      /resolutionNotes:/,
    );
  },
);

test(
  "Picking parent hydration item suggestion exception ve route koleksiyonlarını okur",
  () => {
    assert.match(
      source,
      /this\.listItems\(row\.account_id,\s*row\.id\)/,
    );

    assert.match(
      source,
      /this\.listSuggestions\(row\.account_id,\s*row\.id\)/,
    );

    assert.match(
      source,
      /this\.listExceptions\(row\.account_id,\s*row\.id\)/,
    );

    assert.match(
      source,
      /this\.listRoutes\(row\.account_id,\s*row\.id\)/,
    );
  },
);

test(
  "wave ve batch read modelleri Picking kimliklerini ve atamaları korur",
  () => {
    assert.match(
      source,
      /pickingIds:\s*row\.picking_ids\s*\?\?\s*\[\]/,
    );

    assert.match(
      source,
      /waveNumber:/,
    );

    assert.match(
      source,
      /batchNumber:/,
    );

    assert.match(
      source,
      /assignedUserId:/,
    );
  },
);

test(
  "SupabasePickingRepository doğrudan tablo mutation çağrısı içermez",
  () => {
    assert.doesNotMatch(
      source,
      /\.(insert|update|upsert|delete)\s*\(/,
    );

    assert.match(
      source,
      /Doğrudan Picking yazma kapalıdır/,
    );

    assert.match(
      source,
      /Güvenli Picking write RPC kullanılmalıdır/,
    );
  },
);

test(
  "SupabasePickingRepository yükseltilmiş sunucu anahtarı kullanmaz",
  () => {
    assert.doesNotMatch(
      source,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);

test(
  "SupabasePickingRepository warehouse public exportuna eklenir",
  () => {
    assert.match(
      indexSource,
      /SupabasePickingRepository/,
    );
  },
);

test(
  "repository derlenir ve sekiz mutation metodu güvenli biçimde reddedilir",
  async () => {
    const module =
      await loadRepositoryModule();

    const repository =
      new module.SupabasePickingRepository({});

    for (const call of [
      () => repository.save({}),
      () => repository.saveItem({}),
      () => repository.saveSuggestion({}),
      () => repository.saveTask({}),
      () => repository.saveRoute({}),
      () => repository.saveException({}),
      () => repository.saveWave({}),
      () => repository.saveBatch({}),
    ]) {
      await assert.rejects(
        call(),
        /Güvenli Picking write RPC/,
      );
    }
  },
);
