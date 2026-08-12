import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";

const WAREHOUSE_ID =
  "22222222-2222-4222-8222-222222222222";

const PICKING_ID =
  "33333333-3333-4333-8333-333333333333";

const TASK_ID =
  "44444444-4444-4444-8444-444444444444";

const ITEM_ID =
  "55555555-5555-4555-8555-555555555555";

const SOURCE_LOCATION_ID =
  "66666666-6666-4666-8666-666666666666";

const DESTINATION_LOCATION_ID =
  "77777777-7777-4777-8777-777777777777";

const PRODUCT_ID =
  "88888888-8888-4888-8888-888888888888";

const SKU_ID =
  "99999999-9999-4999-8999-999999999999";

function createClient({
  task = null,
  picking = null,
  item = null,
  location = null,
  barcode = null,
  items = [],
  errors = {}
} = {}) {
  const calls = [];

  function resultFor(
    table
  ) {
    if (
      table ===
      "warehouse_picking_tasks"
    ) {
      return {
        data: task,
        error:
          errors.task || null
      };
    }

    if (
      table ===
      "warehouse_pickings"
    ) {
      return {
        data: picking,
        error:
          errors.picking || null
      };
    }

    if (
      table ===
      "warehouse_locations"
    ) {
      return {
        data: location,
        error:
          errors.location || null
      };
    }

    if (
      table ===
      "warehouse_product_barcodes"
    ) {
      return {
        data: barcode,
        error:
          errors.barcode || null
      };
    }

    return {
      data:
        item !== null
          ? item
          : items,
      error:
        errors.items || null
    };
  }

  function makeQuery(
    table
  ) {
    const filters = [];
    let selectValue = "";

    const query = {
      select(value) {
        selectValue =
          value;
        return query;
      },

      eq(
        field,
        value
      ) {
        filters.push([
          field,
          value
        ]);

        return query;
      },

      maybeSingle() {
        calls.push({
          table,
          selectValue,
          filters: [
            ...filters
          ],
          mode:
            "single"
        });

        return Promise.resolve(
          resultFor(table)
        );
      },

      then(
        resolve,
        reject
      ) {
        calls.push({
          table,
          selectValue,
          filters: [
            ...filters
          ],
          mode:
            "list"
        });

        const result =
          table ===
          "warehouse_picking_items"
            ? {
                data: items,
                error:
                  errors.items ||
                  null
              }
            : resultFor(
                table
              );

        return Promise.resolve(
          result
        ).then(
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
        return makeQuery(
          table
        );
      }
    }
  };
}

function activeTask(
  overrides = {}
) {
  return {
    id:
      TASK_ID,
    picking_id:
      PICKING_ID,
    picking_item_id:
      ITEM_ID,
    warehouse_id:
      WAREHOUSE_ID,
    source_location_id:
      SOURCE_LOCATION_ID,
    destination_location_id:
      DESTINATION_LOCATION_ID,
    status:
      "in_progress",
    priority:
      50,
    sequence:
      1,
    ...overrides
  };
}

function activePicking(
  overrides = {}
) {
  return {
    id:
      PICKING_ID,
    picking_number:
      "PK-20260812-001",
    warehouse_id:
      WAREHOUSE_ID,
    destination_location_id:
      DESTINATION_LOCATION_ID,
    status:
      "in_progress",
    ...overrides
  };
}

function openItem(
  overrides = {}
) {
  return {
    id:
      ITEM_ID,
    picking_id:
      PICKING_ID,
    line_number:
      1,
    warehouse_id:
      WAREHOUSE_ID,
    product_id:
      PRODUCT_ID,
    sku_id:
      SKU_ID,
    remaining_quantity:
      6,
    unit:
      "piece",
    stock_status:
      "available",
    source_location_id:
      SOURCE_LOCATION_ID,
    destination_location_id:
      DESTINATION_LOCATION_ID,
    ...overrides
  };
}

test(
  "aktif Picking görevi parent ve bağlı item ile salt okunur doğrulanır",
  async () => {
    const {
      resolvePickingTaskContext
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    const fixture =
      createClient({
        task:
          activeTask(),
        picking:
          activePicking(),
        item:
          openItem()
      });

    const result =
      await resolvePickingTaskContext({
        client:
          fixture.client,
        accountId:
          ACCOUNT_ID,
        warehouseId:
          WAREHOUSE_ID,
        taskId:
          TASK_ID
      });

    assert.equal(
      result.status,
      "matched"
    );

    assert.equal(
      result.sourceLocationId,
      SOURCE_LOCATION_ID
    );

    assert.equal(
      result.item.id,
      ITEM_ID
    );

    assert.equal(
      fixture.calls.length,
      3
    );
  }
);

test(
  "kapalı Picking görevi write adayına dönüşmez",
  async () => {
    const {
      validatePickingTaskContext
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    const result =
      validatePickingTaskContext({
        task:
          activeTask({
            status:
              "completed"
          }),
        picking:
          activePicking(),
        item:
          openItem()
      });

    assert.equal(
      result.status,
      "task_closed"
    );
  }
);

test(
  "kapalı Picking parent görevi kullanılamaz",
  async () => {
    const {
      validatePickingTaskContext
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    const result =
      validatePickingTaskContext({
        task:
          activeTask(),
        picking:
          activePicking({
            status:
              "completed"
          }),
        item:
          openItem()
      });

    assert.equal(
      result.status,
      "picking_closed"
    );
  }
);

test(
  "işlenmiş Picking satırı yeniden toplama adayı olmaz",
  async () => {
    const {
      validatePickingTaskContext
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    const result =
      validatePickingTaskContext({
        task:
          activeTask(),
        picking:
          activePicking(),
        item:
          openItem({
            remaining_quantity:
              0
          })
      });

    assert.equal(
      result.status,
      "line_complete"
    );
  }
);

test(
  "kaynak lokasyon barkodu firma depo ve beklenen task lokasyonuyla eşleşir",
  async () => {
    const {
      resolvePickingSourceLocationBarcode
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    const fixture =
      createClient({
        location: {
          id:
            SOURCE_LOCATION_ID,
          account_id:
            ACCOUNT_ID,
          warehouse_id:
            WAREHOUSE_ID,
          barcode:
            "LOC-A-01",
          status:
            "available",
          active:
            true
        }
      });

    const result =
      await resolvePickingSourceLocationBarcode({
        client:
          fixture.client,
        accountId:
          ACCOUNT_ID,
        warehouseId:
          WAREHOUSE_ID,
        expectedSourceLocationId:
          SOURCE_LOCATION_ID,
        barcodeValue:
          "LOC-A-01"
      });

    assert.equal(
      result.status,
      "matched"
    );

    assert.deepEqual(
      fixture.calls[0].filters,
      [
        [
          "account_id",
          ACCOUNT_ID
        ],
        [
          "warehouse_id",
          WAREHOUSE_ID
        ],
        [
          "barcode",
          "LOC-A-01"
        ]
      ]
    );
  }
);

test(
  "yanlış kaynak lokasyon barkodu reddedilir",
  async () => {
    const {
      validatePickingSourceLocation
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    const result =
      validatePickingSourceLocation(
        {
          id:
            DESTINATION_LOCATION_ID,
          status:
            "available",
          active:
            true
        },
        SOURCE_LOCATION_ID
      );

    assert.equal(
      result.status,
      "wrong_source_location"
    );
  }
);

test(
  "blokajlı veya bakım kaynak lokasyonu reddedilir",
  async () => {
    const {
      validatePickingSourceLocation
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    for (const status of [
      "blocked",
      "maintenance",
      "inactive"
    ]) {
      const result =
        validatePickingSourceLocation(
          {
            id:
              SOURCE_LOCATION_ID,
            status,
            active:
              true
          },
          SOURCE_LOCATION_ID
        );

      assert.equal(
        result.status,
        "location_unavailable"
      );
    }
  }
);

test(
  "SKU barkodu yalnız seçili task item ile eşleşir",
  async () => {
    const {
      matchPickingProductLine
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    const result =
      matchPickingProductLine({
        barcode: {
          product_id:
            PRODUCT_ID,
          sku_id:
            SKU_ID,
          value:
            "8690000000001"
        },
        task:
          activeTask(),
        items: [
          openItem()
        ]
      });

    assert.equal(
      result.status,
      "matched"
    );

    assert.equal(
      result.item.id,
      ITEM_ID
    );

    assert.equal(
      result.remainingQuantity,
      6
    );
  }
);

test(
  "başka SKU barkodu seçili görev için tahmin edilmez",
  async () => {
    const {
      matchPickingProductLine
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    const result =
      matchPickingProductLine({
        barcode: {
          product_id:
            PRODUCT_ID,
          sku_id:
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        },
        task:
          activeTask(),
        items: [
          openItem()
        ]
      });

    assert.equal(
      result.status,
      "not_in_task"
    );
  }
);

test(
  "ürün seviyeli barkod birden fazla açık satırda tahmin yapmaz",
  async () => {
    const {
      matchPickingProductLine
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    const task =
      activeTask({
        picking_item_id:
          null
      });

    const result =
      matchPickingProductLine({
        barcode: {
          product_id:
            PRODUCT_ID,
          sku_id:
            null
        },
        task,
        items: [
          openItem({
            id:
              ITEM_ID,
            sku_id:
              SKU_ID
          }),
          openItem({
            id:
              "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            sku_id:
              "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
          })
        ]
      });

    assert.equal(
      result.status,
      "sku_required"
    );

    assert.equal(
      result.candidateCount,
      2
    );
  }
);

test(
  "ürün barkodu account picking product ve task item kapsamında salt okunur çözülür",
  async () => {
    const {
      resolvePickingProductBarcode
    } =
      await import(
        "../../js/warehouse/picking-lookup.js"
      );

    const fixture =
      createClient({
        barcode: {
          product_id:
            PRODUCT_ID,
          sku_id:
            SKU_ID,
          value:
            "8690000000001",
          active:
            true
        },
        items: [
          openItem()
        ]
      });

    const result =
      await resolvePickingProductBarcode({
        client:
          fixture.client,
        accountId:
          ACCOUNT_ID,
        pickingId:
          PICKING_ID,
        task:
          activeTask(),
        barcodeValue:
          "8690000000001"
      });

    assert.equal(
      result.status,
      "matched"
    );

    assert.equal(
      fixture.calls.length,
      2
    );

    assert.deepEqual(
      fixture.calls[0].filters,
      [
        [
          "account_id",
          ACCOUNT_ID
        ],
        [
          "value",
          "8690000000001"
        ],
        [
          "active",
          true
        ]
      ]
    );

    assert.deepEqual(
      fixture.calls[1].filters,
      [
        [
          "account_id",
          ACCOUNT_ID
        ],
        [
          "picking_id",
          PICKING_ID
        ],
        [
          "product_id",
          PRODUCT_ID
        ],
        [
          "id",
          ITEM_ID
        ]
      ]
    );
  }
);

test(
  "Picking lookup barkod eventine veya write yüzeyine bağlanmaz",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-lookup.js",
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
      /warehouse_picking_(write|execute_write|complete_write|resolve_exception_write)/
    );

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY|service_role/i
    );
  }
);
