import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  pathToFileURL,
} from "node:url";

import {
  build,
} from "esbuild";

const sourcePath =
  "src/warehouse/services/SupabaseReservationRepository.ts";

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
        "warehouse-reservation-repository-",
      ),
    );

  const output =
    path.join(
      directory,
      "repository.mjs",
    );

  await build({
    entryPoints: [
      sourcePath,
    ],
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
      Date.now(),
  );
}

test(
  "SupabaseReservationRepository ReservationRepository uygular",
  () => {
    assert.match(
      source,
      /implements ReservationRepository/,
    );

    assert.match(
      source,
      /warehouse_inventory_reservations/,
    );
  },
);

test(
  "repository account sınırı ve tüm reservation filtrelerini kullanır",
  () => {
    assert.match(
      source,
      /\.eq\(\s*"account_id"/,
    );

    for (const field of [
      "warehouse_id",
      "location_id",
      "product_id",
      "sku_id",
      "lot_number",
      "serial_number",
      "reference_type",
      "reference_id",
      "status",
    ]) {
      assert.match(
        source,
        new RegExp(
          `\\.eq\\(\\s*"${field}"`,
        ),
        `Eksik filtre: ${field}`,
      );
    }
  },
);

test(
  "activeOnly yalnız aktif ve kısmen tüketilmiş rezervasyonları kapsar",
  () => {
    assert.match(
      source,
      /\.in\(\s*"status"[\s\S]*?"active"[\s\S]*?"partially_consumed"/,
    );
  },
);

test(
  "reservation mapper quantity ve consumedQuantity sayı olarak map eder",
  () => {
    assert.match(
      source,
      /quantity:\s*Number\(row\.quantity\)/,
    );

    assert.match(
      source,
      /consumedQuantity:\s*Number\(row\.consumed_quantity\)/,
    );
  },
);

test(
  "reservation mapper SKU lot seri ve referans alanlarını korur",
  () => {
    for (const field of [
      "skuId",
      "lotNumber",
      "serialNumber",
      "referenceType",
      "referenceId",
      "referenceNumber",
      "expiresAt",
    ]) {
      assert.ok(
        source.includes(
          field,
        ),
        `Eksik mapper alanı: ${field}`,
      );
    }
  },
);

test(
  "getReservedQuantity kalan aktif rezervasyon miktarını toplar",
  () => {
    assert.match(
      source,
      /reservation\.quantity\s*-\s*reservation\.consumedQuantity/,
    );

    assert.match(
      source,
      /activeOnly:\s*true/,
    );
  },
);

test(
  "repository maybeSingle ile tekil okumaları yapar",
  () => {
    assert.match(
      source,
      /\.maybeSingle\(\)/,
    );

    assert.match(
      source,
      /reservation_number/,
    );
  },
);

test(
  "SupabaseReservationRepository doğrudan mutation içermez",
  () => {
    assert.doesNotMatch(
      source,
      /\.(insert|update|upsert|delete)\s*\(/,
    );

    assert.match(
      source,
      /Doğrudan stok rezervasyonu yazma kapalıdır/,
    );
  },
);

test(
  "SupabaseReservationRepository yükseltilmiş anahtar kullanmaz",
  () => {
    assert.doesNotMatch(
      source,
      /service_role|SUPABASE_SERVICE_ROLE_KEY|serviceRole/i,
    );
  },
);

test(
  "SupabaseReservationRepository public exporta eklenir",
  () => {
    assert.match(
      indexSource,
      /SupabaseReservationRepository/,
    );
  },
);

test(
  "repository derlenir ve save güvenli biçimde reddedilir",
  async () => {
    const module =
      await loadRepositoryModule();

    const repository =
      new module
        .SupabaseReservationRepository(
          {},
        );

    await assert.rejects(
      repository.save({}),
      /WarehouseIQ reservation write RPC/,
    );
  },
);
