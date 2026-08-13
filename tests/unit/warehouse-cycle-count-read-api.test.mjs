import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  CYCLE_COUNT_ITEM_SELECT,
  extractBearerToken,
  loadCycleCountReadModel,
  normalizeUuid,
  selectAuthorizedAccount,
} from "../../functions/api/warehouse/cycle-count.js";

const ACCOUNT =
  "11111111-1111-4111-8111-111111111111";

const WAREHOUSE =
  "22222222-2222-4222-8222-222222222222";

const USER =
  "33333333-3333-4333-8333-333333333333";

const COUNT =
  "44444444-4444-4444-8444-444444444444";

const ITEM =
  "55555555-5555-4555-8555-555555555555";

const TASK =
  "66666666-6666-4666-8666-666666666666";

const LOCATION =
  "77777777-7777-4777-8777-777777777777";

const PRODUCT =
  "88888888-8888-4888-8888-888888888888";

const SKU =
  "99999999-9999-4999-8999-999999999999";

const OTHER_SKU =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const API =
  "https://istebul.com/api/warehouse/cycle-count";

function jsonResponse(
  value,
  status = 200,
) {
  return new Response(
    JSON.stringify(value),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
      },
    },
  );
}

function buildFetch(
  calls,
  overrides = {},
) {
  return async (
    input,
    init = {},
  ) => {
    const url =
      new URL(
        typeof input === "string"
          ? input
          : input.toString(),
      );

    calls.push({
      url,
      init,
    });

    if (
      url.pathname ===
      "/rest/v1/warehouse_users"
    ) {
      return jsonResponse(
        overrides.memberships ?? [
          {
            account_id:
              ACCOUNT,
            role:
              "inventory_controller",
            status:
              "active",
            created_at:
              "2026-08-13T10:00:00.000Z",
          },
        ],
      );
    }

    if (
      url.pathname ===
      "/rest/v1/warehouse_accounts"
    ) {
      return jsonResponse(
        overrides.accounts ?? [
          {
            id:
              ACCOUNT,
            code:
              "IST",
            name:
              "İSTEBUL",
            status:
              "active",
            timezone:
              "Europe/Istanbul",
            country_code:
              "TR",
          },
        ],
      );
    }

    if (
      url.pathname ===
      "/rest/v1/warehouses"
    ) {
      return jsonResponse(
        overrides.warehouses ?? [
          {
            id:
              WAREHOUSE,
            account_id:
              ACCOUNT,
            code:
              "D01",
            name:
              "Ana Depo",
            status:
              "active",
            timezone:
              "Europe/Istanbul",
          },
        ],
      );
    }

    if (
      url.pathname ===
      "/rest/v1/warehouse_cycle_count_tasks"
    ) {
      return jsonResponse(
        overrides.tasks ?? [
          {
            id:
              TASK,
            cycle_count_id:
              COUNT,
            cycle_count_item_id:
              ITEM,
            warehouse_id:
              WAREHOUSE,
            location_id:
              LOCATION,
            product_id:
              PRODUCT,
            type:
              "count_location",
            status:
              "assigned",
            priority:
              80,
            sequence:
              1,
            assigned_user_id:
              USER,
            assigned_team_id:
              null,
            assigned_equipment_id:
              null,
            planned_at:
              "2026-08-13T12:00:00.000Z",
            started_at:
              null,
            completed_at:
              null,
            notes:
              null,
            created_at:
              "2026-08-13T10:00:00.000Z",
            updated_at:
              "2026-08-13T10:00:00.000Z",
          },
        ],
      );
    }

    if (
      url.pathname ===
      "/rest/v1/warehouse_cycle_counts"
    ) {
      return jsonResponse(
        overrides.counts ?? [
          {
            id:
              COUNT,
            cycle_count_number:
              "SAY-20260813-000001",
            warehouse_id:
              WAREHOUSE,
            strategy:
              "location_based",
            status:
              "assigned",
            reference_type:
              null,
            reference_number:
              null,
            blind_count:
              true,
            freeze_inventory:
              false,
            priority:
              80,
            planned_at:
              "2026-08-13T12:00:00.000Z",
            released_at:
              "2026-08-13T11:00:00.000Z",
            started_at:
              null,
            counted_at:
              null,
            created_at:
              "2026-08-13T10:00:00.000Z",
            updated_at:
              "2026-08-13T10:00:00.000Z",
          },
        ],
      );
    }

    if (
      url.pathname ===
      "/rest/v1/warehouse_cycle_count_items"
    ) {
      return jsonResponse(
        overrides.items ?? [
          {
            id:
              ITEM,
            cycle_count_id:
              COUNT,
            line_number:
              1,
            warehouse_id:
              WAREHOUSE,
            location_id:
              LOCATION,
            product_id:
              PRODUCT,
            sku_id:
              SKU,
            stock_status:
              "available",
            tracking:
              null,
            unit:
              "adet",
            status:
              "assigned",
            blind_count:
              true,
            recount_required:
              false,
            adjustment_required:
              false,
            counted_at:
              null,
            recounted_at:
              null,
            approved_at:
              null,
            created_at:
              "2026-08-13T10:00:00.000Z",
            updated_at:
              "2026-08-13T10:00:00.000Z",
          },
        ],
      );
    }

    if (
      url.pathname ===
      "/rest/v1/warehouse_locations"
    ) {
      return jsonResponse(
        overrides.locations ?? [
          {
            id:
              LOCATION,
            warehouse_id:
              WAREHOUSE,
            code:
              "A-01",
            full_code:
              "ANA/A-01",
            barcode:
              "LOC-A-01",
            name:
              "A Koridoru 01",
            location_type:
              "bin",
            status:
              "active",
            active:
              true,
          },
        ],
      );
    }

    if (
      url.pathname ===
      "/rest/v1/warehouse_products"
    ) {
      return jsonResponse(
        overrides.products ?? [
          {
            id:
              PRODUCT,
            code:
              "URUN-001",
            name:
              "Örnek Ürün",
            status:
              "active",
            base_unit:
              "piece",
          },
        ],
      );
    }

    if (
      url.pathname ===
      "/rest/v1/warehouse_product_skus"
    ) {
      return jsonResponse(
        overrides.skus ?? [
          {
            id:
              SKU,
            product_id:
              PRODUCT,
            sku_code:
              "SKU-001",
            name:
              "Örnek Ürün / Adet",
            unit:
              "piece",
            active:
              true,
          },
        ],
      );
    }

    if (
      url.pathname ===
      "/rest/v1/warehouse_product_barcodes"
    ) {
      return jsonResponse(
        overrides.barcodes ?? [
          {
            id:
              "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            product_id:
              PRODUCT,
            sku_id:
              null,
            value:
              "8690000000001",
            type:
              "ean13",
            is_primary:
              true,
          },
          {
            id:
              "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            product_id:
              PRODUCT,
            sku_id:
              SKU,
            value:
              "SKU001-BARKOD",
            type:
              "code128",
            is_primary:
              false,
          },
          {
            id:
              "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            product_id:
              PRODUCT,
            sku_id:
              OTHER_SKU,
            value:
              "BASKA-SKU",
            type:
              "code128",
            is_primary:
              false,
          },
        ],
      );
    }

    throw new Error(
      `Beklenmeyen fetch: ${url}`,
    );
  };
}

test(
  "Cycle Count read API Bearer tokenı ayıklar",
  () => {
    const request =
      new Request(
        API,
        {
          headers: {
            Authorization:
              "Bearer örnek-token",
          },
        },
      );

    assert.equal(
      extractBearerToken(request),
      "örnek-token",
    );

    assert.equal(
      extractBearerToken(
        new Request(API),
      ),
      null,
    );
  },
);

test(
  "Cycle Count read API UUID doğrular",
  () => {
    assert.equal(
      normalizeUuid(ACCOUNT),
      ACCOUNT,
    );

    assert.equal(
      normalizeUuid(
        "firma-1",
      ),
      null,
    );
  },
);

test(
  "Cycle Count yalnız aktif üyelikten firma seçer",
  () => {
    const membership = {
      account_id:
        ACCOUNT,
      role:
        "inventory_controller",
      status:
        "active",
    };

    const result =
      selectAuthorizedAccount(
        [membership],
        ACCOUNT,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      result.membership,
      membership,
    );
  },
);

test(
  "Cycle Count yetkisiz firma seçimini reddeder",
  () => {
    const result =
      selectAuthorizedAccount(
        [
          {
            account_id:
              ACCOUNT,
            role:
              "viewer",
            status:
              "active",
          },
        ],
        WAREHOUSE,
      );

    assert.deepEqual(
      result,
      {
        ok: false,
        reason:
          "account_forbidden",
      },
    );
  },
);

test(
  "Cycle Count read modeli account warehouse ve aktif task kapsamında okunur",
  async () => {
    const calls = [];
    const fetchImpl =
      buildFetch(calls);

    const result =
      await loadCycleCountReadModel({
        env: {
          SUPABASE_URL:
            "https://example.supabase.co",
          SUPABASE_ANON_KEY:
            "anon-key",
        },
        token:
          "kullanici-token",
        user: {
          id:
            USER,
        },
        requestedAccountId:
          ACCOUNT,
        requestedWarehouseId:
          WAREHOUSE,
        fetchImpl,
      });

    assert.equal(
      result.ok,
      true,
    );

    assert.equal(
      result.data.selection.accountId,
      ACCOUNT,
    );

    assert.equal(
      result.data.selection.warehouseId,
      WAREHOUSE,
    );

    assert.equal(
      result.data.tasks.length,
      1,
    );

    assert.equal(
      result.data.tasks[0].cycleCount.id,
      COUNT,
    );

    assert.equal(
      result.data.tasks[0].item.id,
      ITEM,
    );

    assert.equal(
      result.data.tasks[0]
        .location.full_code,
      "ANA/A-01",
    );

    assert.equal(
      result.data.tasks[0]
        .product.code,
      "URUN-001",
    );

    assert.equal(
      result.data.tasks[0]
        .sku.sku_code,
      "SKU-001",
    );

    assert.deepEqual(
      result.data.tasks[0]
        .barcodes
        .map(
          (barcode) =>
            barcode.value,
        ),
      [
        "8690000000001",
        "SKU001-BARKOD",
      ],
    );

    const taskCall =
      calls.find(
        ({ url }) =>
          url.pathname ===
          "/rest/v1/warehouse_cycle_count_tasks",
      );

    assert.ok(taskCall);

    assert.equal(
      taskCall.url.searchParams.get(
        "account_id",
      ),
      `eq.${ACCOUNT}`,
    );

    assert.equal(
      taskCall.url.searchParams.get(
        "warehouse_id",
      ),
      `eq.${WAREHOUSE}`,
    );

    assert.equal(
      taskCall.url.searchParams.get(
        "status",
      ),
      "in.(pending,assigned,in_progress)",
    );
  },
);

test(
  "Cycle Count metadata okumaları yalnız aktif görev ürün lokasyon ve SKU kapsamındadır",
  async () => {
    const calls = [];

    await loadCycleCountReadModel({
      env: {
        SUPABASE_URL:
          "https://example.supabase.co",
        SUPABASE_ANON_KEY:
          "anon-key",
      },
      token:
        "kullanici-token",
      user: {
        id:
          USER,
      },
      requestedAccountId:
        ACCOUNT,
      requestedWarehouseId:
        WAREHOUSE,
      fetchImpl:
        buildFetch(calls),
    });

    const locationCall =
      calls.find(
        ({ url }) =>
          url.pathname ===
          "/rest/v1/warehouse_locations",
      );

    const productCall =
      calls.find(
        ({ url }) =>
          url.pathname ===
          "/rest/v1/warehouse_products",
      );

    const skuCall =
      calls.find(
        ({ url }) =>
          url.pathname ===
          "/rest/v1/warehouse_product_skus",
      );

    const barcodeCall =
      calls.find(
        ({ url }) =>
          url.pathname ===
          "/rest/v1/warehouse_product_barcodes",
      );

    assert.ok(locationCall);
    assert.ok(productCall);
    assert.ok(skuCall);
    assert.ok(barcodeCall);

    assert.equal(
      locationCall.url.searchParams.get(
        "account_id",
      ),
      `eq.${ACCOUNT}`,
    );

    assert.equal(
      locationCall.url.searchParams.get(
        "warehouse_id",
      ),
      `eq.${WAREHOUSE}`,
    );

    assert.equal(
      locationCall.url.searchParams.get(
        "id",
      ),
      `in.(${LOCATION})`,
    );

    assert.equal(
      productCall.url.searchParams.get(
        "account_id",
      ),
      `eq.${ACCOUNT}`,
    );

    assert.equal(
      productCall.url.searchParams.get(
        "id",
      ),
      `in.(${PRODUCT})`,
    );

    assert.equal(
      skuCall.url.searchParams.get(
        "account_id",
      ),
      `eq.${ACCOUNT}`,
    );

    assert.equal(
      skuCall.url.searchParams.get(
        "product_id",
      ),
      `in.(${PRODUCT})`,
    );

    assert.equal(
      skuCall.url.searchParams.get(
        "id",
      ),
      `in.(${SKU})`,
    );

    assert.equal(
      barcodeCall.url.searchParams.get(
        "account_id",
      ),
      `eq.${ACCOUNT}`,
    );

    assert.equal(
      barcodeCall.url.searchParams.get(
        "product_id",
      ),
      `in.(${PRODUCT})`,
    );

    assert.equal(
      barcodeCall.url.searchParams.get(
        "active",
      ),
      "eq.true",
    );
  },
);

test(
  "Cycle Count read modeli caller JWT ve anon key ile bütün REST okumalarını yapar",
  async () => {
    const calls = [];
    const fetchImpl =
      buildFetch(calls);

    await loadCycleCountReadModel({
      env: {
        SUPABASE_URL:
          "https://example.supabase.co",
        SUPABASE_ANON_KEY:
          "anon-key",
      },
      token:
        "kullanici-token",
      user: {
        id:
          USER,
      },
      requestedAccountId:
        ACCOUNT,
      requestedWarehouseId:
        WAREHOUSE,
      fetchImpl,
    });

    assert.ok(
      calls.length >= 6,
    );

    for (
      const call
      of calls
    ) {
      assert.equal(
        call.init.headers.Authorization,
        "Bearer kullanici-token",
      );

      assert.equal(
        call.init.headers.apikey,
        "anon-key",
      );
    }
  },
);

test(
  "Aktif görev yoksa parent ve item sorgusu yapılmadan güvenli boş model döner",
  async () => {
    const calls = [];
    const fetchImpl =
      buildFetch(
        calls,
        {
          tasks: [],
        },
      );

    const result =
      await loadCycleCountReadModel({
        env: {
          SUPABASE_URL:
            "https://example.supabase.co",
          SUPABASE_ANON_KEY:
            "anon-key",
        },
        token:
          "kullanici-token",
        user: {
          id:
            USER,
        },
        requestedAccountId:
          ACCOUNT,
        requestedWarehouseId:
          WAREHOUSE,
        fetchImpl,
      });

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      result.data.counts,
      [],
    );

    assert.deepEqual(
      result.data.items,
      [],
    );

    assert.deepEqual(
      result.data.tasks,
      [],
    );

    assert.equal(
      calls.some(
        ({ url }) =>
          url.pathname ===
          "/rest/v1/warehouse_cycle_counts",
      ),
      false,
    );

    assert.equal(
      calls.some(
        ({ url }) =>
          url.pathname ===
          "/rest/v1/warehouse_cycle_count_items",
      ),
      false,
    );
  },
);

test(
  "Başka depoya ait WarehouseIQ seçimi reddedilir",
  async () => {
    const calls = [];

    const result =
      await loadCycleCountReadModel({
        env: {
          SUPABASE_URL:
            "https://example.supabase.co",
          SUPABASE_ANON_KEY:
            "anon-key",
        },
        token:
          "kullanici-token",
        user: {
          id:
            USER,
        },
        requestedAccountId:
          ACCOUNT,
        requestedWarehouseId:
          WAREHOUSE,
        fetchImpl:
          buildFetch(
            calls,
            {
              warehouses: [],
            },
          ),
      });

    assert.deepEqual(
      result,
      {
        ok: false,
        reason:
          "warehouse_forbidden",
      },
    );
  },
);

test(
  "A7.0.2 kör sayımda beklenen miktar variance ve maliyet alanlarını istemciye açmaz",
  () => {
    for (
      const forbidden
      of [
        "expected_quantity",
        "first_count_quantity",
        "second_count_quantity",
        "final_count_quantity",
        "variance_quantity",
        "variance_percentage",
        "variance_value",
        "unit_cost",
      ]
    ) {
      assert.equal(
        CYCLE_COUNT_ITEM_SELECT
          .split(",")
          .includes(forbidden),
        false,
        `Salt-okunur modelde yasaklı alan: ${forbidden}`,
      );
    }

    assert.ok(
      CYCLE_COUNT_ITEM_SELECT
        .split(",")
        .includes(
          "blind_count",
        ),
    );
  },
);

test(
  "Cycle Count API salt-okunurdur service role RPC ve mutation yüzeyi açmaz",
  async () => {
    const source =
      await readFile(
        "functions/api/warehouse/cycle-count.js",
        "utf8",
      );

    assert.match(
      source,
      /onRequestGet/,
    );

    assert.match(
      source,
      /onRequestOptions/,
    );

    assert.equal(
      source.includes(
        "onRequestPost",
      ),
      false,
    );

    assert.equal(
      /SUPABASE_SERVICE_ROLE_KEY|service_role|serviceRole/i
        .test(source),
      false,
    );

    assert.equal(
      /\/rest\/v1\/rpc\//i
        .test(source),
      false,
    );

    assert.equal(
      /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i
        .test(source),
      false,
    );

    assert.equal(
      /warehouse_inventory_(?:balances|movements)/i
        .test(source),
      false,
    );
  },
);

test(
  "Cycle Count API yalnız sayım ve görev kapsamındaki metadata tablolarını okur",
  async () => {
    const source =
      await readFile(
        "functions/api/warehouse/cycle-count.js",
        "utf8",
      );

    for (
      const table
      of [
        "warehouse_cycle_counts",
        "warehouse_cycle_count_items",
        "warehouse_cycle_count_tasks",
        "warehouse_locations",
        "warehouse_products",
        "warehouse_product_skus",
        "warehouse_product_barcodes",
      ]
    ) {
      assert.ok(
        source.includes(table),
        `Eksik tablo: ${table}`,
      );
    }
  },
);
