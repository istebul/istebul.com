import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const sourcePath =
  "src/warehouse/services/SupabaseShippingRepository.ts";

const source =
  fs.readFileSync(
    sourcePath,
    "utf8",
  );

const indexSource =
  fs.readFileSync(
    "src/warehouse/index.ts",
    "utf8",
  );

async function loadRepositoryModule() {
  const directory =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "warehouse-shipping-repository-",
      ),
    );

  const output =
    path.join(
      directory,
      "repository.mjs",
    );

  await build({
    entryPoints: [sourcePath],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: output,
    external: [
      "@supabase/supabase-js",
    ],
    logLevel: "silent",
  });

  return import(
    pathToFileURL(output).href +
      "?v=" +
      Date.now()
  );
}

test(
  "SupabaseShippingRepository tüm Shipping persistence tablolarını kapsar",
  () => {
    assert.match(
      source,
      /implements ShippingRepository/,
    );

    for (const table of [
      "warehouse_shippings",
      "warehouse_shipping_items",
      "warehouse_shipping_packages",
      "warehouse_shipping_tasks",
      "warehouse_shipping_exceptions",
      "warehouse_shipping_manifests",
      "warehouse_shipping_asns",
      "warehouse_shipping_tracking_events",
      "warehouse_shipping_proofs_of_delivery",
      "warehouse_shipping_suggestions",
      "warehouse_shipping_carriers",
      "warehouse_shipping_service_levels",
      "warehouse_shipping_vehicles",
      "warehouse_shipping_docks",
    ]) {
      assert.match(
        source,
        new RegExp(table),
      );
    }
  },
);

test(
  "Shipping okumaları account scope taşır",
  () => {
    assert.match(
      source,
      /\.eq\("account_id",\s*tenantId\)/,
    );

    assert.match(
      source,
      /\.eq\("account_id",\s*filter\.tenantId\)/,
    );

    assert.match(
      source,
      /\.maybeSingle\(\)/,
    );
  },
);

test(
  "Shipping parent hydration item package exception koleksiyonlarını okur",
  () => {
    assert.match(
      source,
      /this\.listItems\([\s\S]*?row\.account_id[\s\S]*?row\.id/,
    );

    assert.match(
      source,
      /this\.listPackages\([\s\S]*?row\.account_id[\s\S]*?row\.id/,
    );

    assert.match(
      source,
      /this\.listExceptions\([\s\S]*?row\.account_id[\s\S]*?row\.id/,
    );
  },
);

test(
  "Shipping item mapper operasyon miktarlarını korur",
  () => {
    for (const token of [
      "requestedQuantity:",
      "loadedQuantity:",
      "deliveredQuantity:",
      "returnedQuantity:",
      "damagedQuantity:",
      "missingQuantity:",
      "remainingQuantity:",
      "tracking:",
      "temperatureControlled:",
      "hazardousMaterial:",
    ]) {
      assert.ok(
        source.includes(token),
        token,
      );
    }
  },
);

test(
  "Shipping package mapper Packing handoff ve yükleme metadata korur",
  () => {
    for (const token of [
      "packingId:",
      "packingPackageId:",
      "packageNumber:",
      "loadingSequence:",
      "loadedBy:",
      "loadedAt:",
      "dispatchedAt:",
      "deliveredAt:",
      "returnedAt:",
    ]) {
      assert.ok(
        source.includes(token),
        token,
      );
    }
  },
);

test(
  "Carrier master read modeli servis seviyelerini hydrate eder",
  () => {
    assert.match(
      source,
      /listCarriers/,
    );

    assert.match(
      source,
      /listServiceLevels/,
    );

    assert.match(
      source,
      /integrationCode:/,
    );

    assert.match(
      source,
      /serviceLevels,/,
    );
  },
);

test(
  "Shipping master listeleri activeOnly filtresini kullanır",
  () => {
    assert.match(
      source,
      /if\s*\(activeOnly\)\s*\{[\s\S]*?\.eq\("active",\s*true\)/,
    );
  },
);

test(
  "Manifest ASN tracking POD suggestion read modelleri mevcut",
  () => {
    for (const token of [
      "manifestNumber:",
      "asnNumber:",
      "occurredAt:",
      "recipientName:",
      "photoUrls:",
      "documentUrls:",
      "score: row.score",
      "reasons: row.reasons",
      "warnings: row.warnings",
    ]) {
      assert.ok(
        source.includes(token),
        token,
      );
    }
  },
);

test(
  "Suggestion sonuçları totalScore ile sıralanır",
  () => {
    assert.match(
      source,
      /right\.score\.totalScore\s*-\s*left\.score\.totalScore/,
    );
  },
);

test(
  "Repository doğrudan tablo mutation yapmaz",
  () => {
    assert.doesNotMatch(
      source,
      /\.(insert|update|upsert|delete)\s*\(/,
    );

    assert.match(
      source,
      /Doğrudan Shipping yazma kapalıdır/,
    );

    assert.match(
      source,
      /Güvenli Shipping write RPC kullanılmalıdır/,
    );
  },
);

test(
  "Repository service-role credential içermez",
  () => {
    assert.doesNotMatch(
      source,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);

test(
  "SupabaseShippingRepository public exportta bulunur",
  () => {
    assert.match(
      indexSource,
      /export \* from "\.\/services\/SupabaseShippingRepository";/,
    );
  },
);

test(
  "on dört mutation metodu güvenli RPC bulunana kadar reddedilir",
  async () => {
    const module =
      await loadRepositoryModule();

    const repository =
      new module
        .SupabaseShippingRepository({});

    const calls = [
      () => repository.save({}),
      () => repository.saveItem({}),
      () => repository.savePackage({}),
      () => repository.saveTask({}),
      () => repository.saveException({}),
      () => repository.saveManifest({}),
      () => repository.saveAsn({}),
      () => repository.saveTrackingEvent({}),
      () => repository.saveProofOfDelivery({}),
      () => repository.saveSuggestion({}),
      () => repository.saveCarrier({}),
      () => repository.saveServiceLevel({}),
      () => repository.saveVehicle({}),
      () => repository.saveDock({}),
    ];

    assert.equal(
      calls.length,
      14,
    );

    for (const call of calls) {
      await assert.rejects(
        call(),
        /Güvenli Shipping write RPC/,
      );
    }
  },
);
