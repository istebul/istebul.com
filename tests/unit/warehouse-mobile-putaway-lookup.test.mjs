import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";

const PUTAWAY_ID =
  "22222222-2222-4222-8222-222222222222";

const WAREHOUSE_ID =
  "33333333-3333-4333-8333-333333333333";

const SOURCE_LOCATION_ID =
  "44444444-4444-4444-8444-444444444444";

const TARGET_LOCATION_ID =
  "55555555-5555-4555-8555-555555555555";

const PRODUCT_ID =
  "66666666-6666-4666-8666-666666666666";

const SKU_ID =
  "77777777-7777-4777-8777-777777777777";

function createClient({
  barcode = null,
  items = [],
  location = null,
  barcodeError = null,
  itemsError = null,
  locationError = null
} = {}) {
  const calls = [];

  function makeQuery(table) {
    const filters = [];
    let selectValue = "";

    const result =
      table === "warehouse_product_barcodes"
        ? {
            data: barcode,
            error: barcodeError
          }
        : table === "warehouse_putaway_items"
          ? {
              data: items,
              error: itemsError
            }
          : {
              data: location,
              error: locationError
            };

    const query = {
      select(value) {
        selectValue = value;
        return query;
      },

      eq(field, value) {
        filters.push([field, value]);
        return query;
      },

      maybeSingle() {
        calls.push({
          table,
          selectValue,
          filters
        });

        return Promise.resolve(result);
      },

      then(resolve, reject) {
        calls.push({
          table,
          selectValue,
          filters
        });

        return Promise.resolve(result).then(
          resolve,
          reject
        );
      }
    };

    return query;
  }

  return {
    calls,
    client: {
      from(table) {
        return makeQuery(table);
      }
    }
  };
}

test("SKU barkodu yalnız aynı açık Putaway satırıyla eşleşir", async () => {
  const {
    resolvePutawayProductBarcode
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  const fixture = createClient({
    barcode: {
      product_id: PRODUCT_ID,
      sku_id: SKU_ID,
      value: "8690000000001",
      active: true
    },
    items: [
      {
        id: "88888888-8888-4888-8888-888888888888",
        product_id: PRODUCT_ID,
        sku_id: SKU_ID,
        remaining_quantity: 6,
        unit: "piece"
      }
    ]
  });

  const result =
    await resolvePutawayProductBarcode({
      client: fixture.client,
      accountId: ACCOUNT_ID,
      putawayId: PUTAWAY_ID,
      barcodeValue: "8690000000001"
    });

  assert.equal(result.status, "matched");
  assert.equal(result.remainingQuantity, 6);
  assert.equal(result.item.sku_id, SKU_ID);

  assert.equal(fixture.calls.length, 2);

  assert.deepEqual(
    fixture.calls[0].filters,
    [
      ["account_id", ACCOUNT_ID],
      ["value", "8690000000001"],
      ["active", true]
    ]
  );

  assert.deepEqual(
    fixture.calls[1].filters,
    [
      ["account_id", ACCOUNT_ID],
      ["putaway_id", PUTAWAY_ID],
      ["product_id", PRODUCT_ID]
    ]
  );
});

test("ürün seviyeli barkod birden fazla açık SKU satırında tahmin yapmaz", async () => {
  const {
    matchPutawayProductLine
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  const result = matchPutawayProductLine(
    {
      product_id: PRODUCT_ID,
      sku_id: null
    },
    [
      {
        product_id: PRODUCT_ID,
        sku_id: SKU_ID,
        remaining_quantity: 2
      },
      {
        product_id: PRODUCT_ID,
        sku_id:
          "99999999-9999-4999-8999-999999999999",
        remaining_quantity: 3
      }
    ]
  );

  assert.equal(result.status, "sku_required");
  assert.equal(result.candidateCount, 2);
});

test("Putaway içinde olmayan ürün barkodu write adayına dönüşmez", async () => {
  const {
    matchPutawayProductLine
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  const result = matchPutawayProductLine(
    {
      product_id: PRODUCT_ID,
      sku_id: SKU_ID
    },
    []
  );

  assert.equal(result.status, "not_in_putaway");
});

test("tamamlanmış Putaway satırı yeniden yerleştirme için kapalıdır", async () => {
  const {
    matchPutawayProductLine
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  const result = matchPutawayProductLine(
    {
      product_id: PRODUCT_ID,
      sku_id: SKU_ID
    },
    [
      {
        product_id: PRODUCT_ID,
        sku_id: SKU_ID,
        remaining_quantity: 0
      }
    ]
  );

  assert.equal(result.status, "line_complete");
  assert.equal(result.remainingQuantity, 0);
});

test("hedef lokasyon barkodu firma ve depo kapsamıyla salt okunur çözülür", async () => {
  const {
    resolvePutawayLocationBarcode
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  const fixture = createClient({
    location: {
      id: TARGET_LOCATION_ID,
      account_id: ACCOUNT_ID,
      warehouse_id: WAREHOUSE_ID,
      barcode: "LOC-A-01",
      status: "available",
      active: true
    }
  });

  const result =
    await resolvePutawayLocationBarcode({
      client: fixture.client,
      accountId: ACCOUNT_ID,
      warehouseId: WAREHOUSE_ID,
      sourceLocationId: SOURCE_LOCATION_ID,
      barcodeValue: "LOC-A-01"
    });

  assert.equal(result.status, "matched");
  assert.equal(
    result.location.id,
    TARGET_LOCATION_ID
  );

  assert.deepEqual(
    fixture.calls[0].filters,
    [
      ["account_id", ACCOUNT_ID],
      ["warehouse_id", WAREHOUSE_ID],
      ["barcode", "LOC-A-01"],
      ["active", true]
    ]
  );
});

test("kaynak lokasyon barkodu hedef olarak kabul edilmez", async () => {
  const {
    validatePutawayTargetLocation
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  const result =
    validatePutawayTargetLocation(
      {
        id: SOURCE_LOCATION_ID,
        status: "available",
        active: true
      },
      SOURCE_LOCATION_ID
    );

  assert.equal(
    result.status,
    "source_location"
  );
});

test("blokajlı veya bakım lokasyonu hedef olarak kabul edilmez", async () => {
  const {
    validatePutawayTargetLocation
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  for (const status of [
    "blocked",
    "maintenance",
    "inactive"
  ]) {
    const result =
      validatePutawayTargetLocation(
        {
          id: TARGET_LOCATION_ID,
          status,
          active: true
        },
        SOURCE_LOCATION_ID
      );

    assert.equal(
      result.status,
      "location_unavailable"
    );
  }
});

test("Putaway lookup hiçbir write veya barkod event bağlantısı yapmaz", async () => {
  const source = await readFile(
    "js/warehouse/putaway-lookup.js",
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /warehouse:barcode-scan/
  );

  assert.doesNotMatch(
    source,
    /\bfetch\s*\(/
  );

  assert.doesNotMatch(
    source,
    /\.(insert|update|upsert|delete)\s*\(/
  );

  assert.doesNotMatch(
    source,
    /warehouse_putaway_(write|execute_write|complete_write)/
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY|service_role/
  );
});
