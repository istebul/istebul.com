import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";

const RECEIVING_ID =
  "33333333-3333-4333-8333-333333333333";

const PRODUCT_ID =
  "44444444-4444-4444-8444-444444444444";

const SKU_ID =
  "55555555-5555-4555-8555-555555555555";

function createClient({
  barcode = null,
  items = [],
  barcodeError = null,
  itemsError = null
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
        : {
            data: items,
            error: itemsError
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
          select: selectValue,
          filters: [...filters],
          mode: "single"
        });

        return Promise.resolve(result);
      },

      then(resolve, reject) {
        calls.push({
          table,
          select: selectValue,
          filters: [...filters],
          mode: "many"
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

test("Barkod çözümleme firma ve aktif barkod RLS kapsamını korur", async () => {
  const {
    resolveReceivingBarcode
  } = await import(
    "../../js/warehouse/receiving-lookup.js"
  );

  const fixture = createClient({
    barcode: {
      id: "66666666-6666-4666-8666-666666666666",
      product_id: PRODUCT_ID,
      sku_id: SKU_ID,
      value: "8690000000001",
      type: "ean13",
      is_primary: true,
      active: true
    },
    items: [
      {
        id: "77777777-7777-4777-8777-777777777777",
        receiving_id: RECEIVING_ID,
        product_id: PRODUCT_ID,
        sku_id: SKU_ID,
        expected_quantity: 10,
        received_quantity: 4,
        unit: "piece"
      }
    ]
  });

  const result = await resolveReceivingBarcode({
    client: fixture.client,
    accountId: ACCOUNT_ID,
    receivingId: RECEIVING_ID,
    barcodeValue: "8690000000001"
  });

  assert.equal(result.status, "matched");
  assert.equal(result.remainingQuantity, 6);

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
      ["receiving_id", RECEIVING_ID],
      ["product_id", PRODUCT_ID]
    ]
  );
});

test("SKU barkodu yalnız aynı SKU receiving satırıyla eşleşir", async () => {
  const {
    matchReceivingLine
  } = await import(
    "../../js/warehouse/receiving-lookup.js"
  );

  const result = matchReceivingLine(
    {
      product_id: PRODUCT_ID,
      sku_id: SKU_ID
    },
    [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        product_id: PRODUCT_ID,
        sku_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        expected_quantity: 5,
        received_quantity: 0
      },
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        product_id: PRODUCT_ID,
        sku_id: SKU_ID,
        expected_quantity: 8,
        received_quantity: 3
      }
    ]
  );

  assert.equal(result.status, "matched");
  assert.equal(
    result.item.id,
    "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
  );
  assert.equal(result.remainingQuantity, 5);
});

test("Ürün seviyeli barkod tek receiving satırında güvenli eşleşir", async () => {
  const {
    matchReceivingLine
  } = await import(
    "../../js/warehouse/receiving-lookup.js"
  );

  const result = matchReceivingLine(
    {
      product_id: PRODUCT_ID,
      sku_id: null
    },
    [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        product_id: PRODUCT_ID,
        sku_id: SKU_ID,
        expected_quantity: 12,
        received_quantity: 2
      }
    ]
  );

  assert.equal(result.status, "matched");
  assert.equal(result.remainingQuantity, 10);
});

test("Ürün seviyeli barkod birden fazla SKU satırında tahmin yapmaz", async () => {
  const {
    matchReceivingLine
  } = await import(
    "../../js/warehouse/receiving-lookup.js"
  );

  const result = matchReceivingLine(
    {
      product_id: PRODUCT_ID,
      sku_id: null
    },
    [
      {
        product_id: PRODUCT_ID,
        sku_id: SKU_ID,
        expected_quantity: 5,
        received_quantity: 0
      },
      {
        product_id: PRODUCT_ID,
        sku_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        expected_quantity: 5,
        received_quantity: 0
      }
    ]
  );

  assert.equal(result.status, "sku_required");
  assert.equal(result.candidateCount, 2);
});

test("Receiving içinde olmayan barkod write işlemine dönüşmez", async () => {
  const {
    resolveReceivingBarcode
  } = await import(
    "../../js/warehouse/receiving-lookup.js"
  );

  const fixture = createClient({
    barcode: null
  });

  const result = await resolveReceivingBarcode({
    client: fixture.client,
    accountId: ACCOUNT_ID,
    receivingId: RECEIVING_ID,
    barcodeValue: "8699999999999"
  });

  assert.equal(result.status, "barcode_not_found");
  assert.equal(fixture.calls.length, 1);
});

test("Tamamlanmış receiving satırı yeniden kabul için kapalıdır", async () => {
  const {
    matchReceivingLine
  } = await import(
    "../../js/warehouse/receiving-lookup.js"
  );

  const result = matchReceivingLine(
    {
      product_id: PRODUCT_ID,
      sku_id: SKU_ID
    },
    [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        product_id: PRODUCT_ID,
        sku_id: SKU_ID,
        expected_quantity: 10,
        received_quantity: 10
      }
    ]
  );

  assert.equal(result.status, "line_complete");
  assert.equal(result.remainingQuantity, 0);
});

test("Receiving lookup hiçbir stok veya receiving write işlemi yapmaz", async () => {
  const source = await readFile(
    "js/warehouse/receiving-lookup.js",
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
    /\.insert\s*\(/
  );

  assert.doesNotMatch(
    source,
    /\.update\s*\(/
  );

  assert.doesNotMatch(
    source,
    /\.upsert\s*\(/
  );

  assert.doesNotMatch(
    source,
    /\.delete\s*\(/
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY/
  );
});
