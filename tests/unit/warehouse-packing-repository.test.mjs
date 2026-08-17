import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const sourcePath =
  "src/warehouse/services/SupabasePackingRepository.ts";

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
      "warehouse-packing-repository-",
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
  "SupabasePackingRepository PackingRepository uygular ve tüm read tablolarını kullanır",
  () => {
    assert.match(
      source,
      /implements PackingRepository/,
    );

    for (const table of [
      "warehouse_packings",
      "warehouse_packing_items",
      "warehouse_packing_containers",
      "warehouse_packing_packages",
      "warehouse_packing_package_items",
      "warehouse_packing_labels",
      "warehouse_packing_suggestions",
      "warehouse_packing_tasks",
      "warehouse_packing_exceptions",
    ]) {
      assert.match(
        source,
        new RegExp(table),
        `${table} repository read modelinde yok`,
      );
    }
  },
);

test(
  "Packing list sorguları account scope ve domain filtrelerini korur",
  () => {
    assert.match(
      source,
      /\.eq\("account_id",\s*filter\.tenantId\)/,
    );

    for (const field of [
      "warehouse_id",
      "packing_location_id",
      "shipping_location_id",
      "strategy",
      "status",
      "picking_id",
      "order_id",
      "reference_type",
      "reference_id",
    ]) {
      assert.match(
        source,
        new RegExp(
          `\\.eq\\(\\s*"${field}"`,
        ),
        `${field} filtresi eksik`,
      );
    }
  },
);

test(
  "Packing tekil okumaları account sınırı ve maybeSingle kullanır",
  () => {
    assert.match(
      source,
      /\.eq\("account_id",\s*tenantId\)/,
    );

    assert.match(
      source,
      /\.maybeSingle\(\)/,
    );

    assert.match(
      source,
      /findByPickingId/,
    );

    assert.match(
      source,
      /findByOrderId/,
    );

    assert.match(
      source,
      /findByReference/,
    );
  },
);

test(
  "Packing araması paketleme sipariş ve referans numaralarını kapsar",
  () => {
    for (const field of [
      "packing_number",
      "order_number",
      "reference_number",
    ]) {
      assert.match(
        source,
        new RegExp(field),
      );
    }

    assert.match(
      source,
      /toLocaleLowerCase\("tr-TR"\)/,
    );
  },
);

test(
  "Packing item read modeli miktar takip ve fiziksel ürün özelliklerini korur",
  () => {
    for (const field of [
      "requestedQuantity",
      "packedQuantity",
      "damagedQuantity",
      "missingQuantity",
      "remainingQuantity",
      "tracking",
      "barcode",
      "unitWeight",
      "unitVolume",
      "temperatureControlled",
      "hazardousMaterial",
    ]) {
      assert.match(
        source,
        new RegExp(`${field}:`),
      );
    }
  },
);

test(
  "Packing package hydration fiziksel package item satırlarını okur",
  () => {
    assert.match(
      source,
      /this\.listPackageItems\(\s*row\.account_id,\s*row\.packing_id,\s*row\.id,\s*\)/,
    );

    for (const field of [
      "packingItemId",
      "productId",
      "quantity",
      "tracking",
      "weight",
      "volume",
    ]) {
      assert.match(
        source,
        new RegExp(`${field}:`),
      );
    }

    assert.match(
      source,
      /items,/,
    );
  },
);

test(
  "Container label suggestion task ve exception mapperları domain metadata korur",
  () => {
    for (const token of [
      "hazardousMaterialAllowed:",
      "labelNumber:",
      "generatedAt:",
      "printedAt:",
      "container: row.container_snapshot",
      "score: row.score",
      "assignedEquipmentId:",
      "stationId:",
      "resolutionNotes:",
    ]) {
      assert.ok(
        source.includes(token),
        `Eksik mapper token: ${token}`,
      );
    }
  },
);

test(
  "Packing suggestion sonuçları toplam puana göre sıralanır",
  () => {
    assert.match(
      source,
      /right\.score\.totalScore\s*-\s*left\.score\.totalScore/,
    );
  },
);

test(
  "Packing parent hydration gerekli child koleksiyonlarını birlikte yükler",
  () => {
    for (const call of [
      "listItems",
      "listPackages",
      "listLabels",
      "listSuggestions",
      "listExceptions",
    ]) {
      assert.match(
        source,
        new RegExp(
          `this\\.${call}\\(\\s*row\\.account_id,\\s*row\\.id`,
        ),
        `${call} hydration çağrısı eksik`,
      );
    }
  },
);

test(
  "Container activeOnly filtresi yalnız aktif ambalajları seçebilir",
  () => {
    assert.match(
      source,
      /if\s*\(activeOnly\)[\s\S]*?\.eq\("active",\s*true\)/,
    );
  },
);

test(
  "SupabasePackingRepository doğrudan tablo mutation çağrısı içermez",
  () => {
    assert.doesNotMatch(
      source,
      /\.(insert|update|upsert|delete)\s*\(/,
    );

    assert.match(
      source,
      /Doğrudan Packing yazma kapalıdır/,
    );

    assert.match(
      source,
      /Güvenli Packing write RPC kullanılmalıdır/,
    );
  },
);

test(
  "SupabasePackingRepository yükseltilmiş sunucu anahtarı kullanmaz",
  () => {
    assert.doesNotMatch(
      source,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);

test(
  "SupabasePackingRepository warehouse public exportuna eklenir",
  () => {
    assert.match(
      indexSource,
      /export \* from "\.\/services\/SupabasePackingRepository";/,
    );
  },
);

test(
  "repository derlenir ve sekiz mutation metodu güvenli biçimde reddedilir",
  async () => {
    const module =
      await loadRepositoryModule();

    const repository =
      new module.SupabasePackingRepository({});

    for (const call of [
      () => repository.save({}),
      () => repository.saveItem({}),
      () => repository.savePackage({}),
      () => repository.saveLabel({}),
      () => repository.saveSuggestion({}),
      () => repository.saveTask({}),
      () => repository.saveException({}),
      () => repository.saveContainer({}),
    ]) {
      await assert.rejects(
        call(),
        /Güvenli Packing write RPC/,
      );
    }
  },
);
