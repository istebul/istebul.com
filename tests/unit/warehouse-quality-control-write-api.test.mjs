import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  extractBearerToken,
  mapRpcError,
  normalizeWriteAction,
  normalizeWriteRequest,
  onRequestOptions,
  onRequestPost,
} from "../../functions/api/warehouse/quality-control.js";


const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";

const WAREHOUSE_ID =
  "22222222-2222-4222-8222-222222222222";

const LOCATION_ID =
  "33333333-3333-4333-8333-333333333333";

const INSPECTION_ID =
  "44444444-4444-4444-8444-444444444444";

const PRODUCT_ID =
  "55555555-5555-4555-8555-555555555555";

const SKU_ID =
  "66666666-6666-4666-8666-666666666666";

const RECEIVING_ID =
  "77777777-7777-4777-8777-777777777777";

const RECEIVING_ITEM_ID =
  "88888888-8888-4888-8888-888888888888";

const REQUEST_ID =
  "99999999-9999-4999-8999-999999999999";

const USER_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const API_URL =
  "https://istebul.com/api/warehouse/quality-control";


function createRequest(
  body,
  headers = {},
) {
  return new Request(
    API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        ...headers,
      },

      body:
        JSON.stringify(body),
    },
  );
}


test(
  "Quality write API Bearer tokenı ayıklar",
  () => {
    const request =
      new Request(
        API_URL,
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
        new Request(API_URL),
      ),
      null,
    );
  },
);


test(
  "Quality write API yalnız create add_item ve start actionlarını açar",
  () => {
    assert.equal(
      normalizeWriteAction(
        "create",
      ),
      "create",
    );

    assert.equal(
      normalizeWriteAction(
        "add_item",
      ),
      "add_item",
    );

    assert.equal(
      normalizeWriteAction(
        "start",
      ),
      "start",
    );

    for (const forbidden of [
      "record_result",
      "complete",
      "cancel",
      "create_sample",
      "add_document",
      "create_task",
      "create_exception",
      "resolve_exception",
    ]) {
      assert.equal(
        normalizeWriteAction(
          forbidden,
        ),
        null,
      );
    }
  },
);


test(
  "Quality write isteği Idempotency-Key olmadan kabul edilmez",
  () => {
    const result =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "start",

          payload: {
            inspectionId:
              INSPECTION_ID,
          },
        },
        null,
      );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      result.reason,
      "request_id_invalid",
    );
  },
);


test(
  "Quality write payload yalnız JSON nesnesi olabilir",
  () => {
    for (const payload of [
      undefined,
      null,
      [],
      "değer",
    ]) {
      const result =
        normalizeWriteRequest(
          {
            accountId:
              ACCOUNT_ID,

            action:
              "start",

            payload,
          },
          REQUEST_ID,
        );

      assert.equal(
        result.ok,
        false,
      );

      assert.equal(
        result.reason,
        "payload_invalid",
      );
    }
  },
);


test(
  "create payload gerekli kimlikleri normalize eder",
  () => {
    const result =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "create",

          payload: {
            warehouseId:
              WAREHOUSE_ID,

            locationId:
              LOCATION_ID,

            receivingId:
              RECEIVING_ID,

            referenceType:
              " receiving ",

            referenceId:
              " ref-1 ",

            referenceNumber:
              " KK-REF ",

            plannedAt:
              " 2026-08-13T12:00:00Z ",

            notes:
              " Kontrol notu ",
          },
        },
        REQUEST_ID,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      result.value,
      {
        accountId:
          ACCOUNT_ID,

        action:
          "create",

        requestId:
          REQUEST_ID,

        payload: {
          warehouseId:
            WAREHOUSE_ID,

          locationId:
            LOCATION_ID,

          receivingId:
            RECEIVING_ID,

          referenceType:
            "receiving",

          referenceId:
            "ref-1",

          referenceNumber:
            "KK-REF",

          plannedAt:
            "2026-08-13T12:00:00Z",

          notes:
            "Kontrol notu",
        },
      },
    );
  },
);


test(
  "create geçersiz depo lokasyon ve receiving UUID değerlerini reddeder",
  () => {
    const cases = [
      [
        {
          warehouseId: "x",
          locationId:
            LOCATION_ID,
        },
        "warehouse_id_invalid",
      ],

      [
        {
          warehouseId:
            WAREHOUSE_ID,
          locationId: "x",
        },
        "location_id_invalid",
      ],

      [
        {
          warehouseId:
            WAREHOUSE_ID,
          locationId:
            LOCATION_ID,
          receivingId: "x",
        },
        "receiving_id_invalid",
      ],
    ];

    for (
      const [
        payload,
        reason,
      ] of cases
    ) {
      const result =
        normalizeWriteRequest(
          {
            accountId:
              ACCOUNT_ID,

            action:
              "create",

            payload,
          },
          REQUEST_ID,
        );

      assert.equal(
        result.ok,
        false,
      );

      assert.equal(
        result.reason,
        reason,
      );
    }
  },
);


test(
  "add_item payload domain alanlarını normalize eder",
  () => {
    const result =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "add_item",

          payload: {
            inspectionId:
              INSPECTION_ID,

            productId:
              PRODUCT_ID,

            skuId:
              SKU_ID,

            receivingId:
              RECEIVING_ID,

            receivingItemId:
              RECEIVING_ITEM_ID,

            warehouseId:
              WAREHOUSE_ID,

            locationId:
              LOCATION_ID,

            controlType:
              " VISUAL_INSPECTION ",

            inspectedQuantity:
              "12.5",

            unit:
              " adet ",

            tracking: {
              lotNumber:
                "LOT-1",
            },

            expectedValue:
              true,

            notes:
              " Ambalaj kontrolü ",
          },
        },
        REQUEST_ID,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      result.value,
      {
        accountId:
          ACCOUNT_ID,

        action:
          "add_item",

        requestId:
          REQUEST_ID,

        payload: {
          inspectionId:
            INSPECTION_ID,

          productId:
            PRODUCT_ID,

          warehouseId:
            WAREHOUSE_ID,

          locationId:
            LOCATION_ID,

          controlType:
            "visual_inspection",

          inspectedQuantity:
            12.5,

          unit:
            "adet",

          skuId:
            SKU_ID,

          receivingId:
            RECEIVING_ID,

          receivingItemId:
            RECEIVING_ITEM_ID,

          tracking: {
            lotNumber:
              "LOT-1",
          },

          expectedValue:
            true,

          notes:
            "Ambalaj kontrolü",
        },
      },
    );
  },
);


test(
  "add_item geçersiz control type miktar unit tracking ve expectedValue değerlerini reddeder",
  () => {
    const base = {
      inspectionId:
        INSPECTION_ID,

      productId:
        PRODUCT_ID,

      warehouseId:
        WAREHOUSE_ID,

      locationId:
        LOCATION_ID,

      controlType:
        "visual_inspection",

      inspectedQuantity:
        1,

      unit:
        "adet",
    };

    const cases = [
      [
        {
          ...base,
          controlType:
            "bilinmeyen",
        },
        "control_type_invalid",
      ],

      [
        {
          ...base,
          inspectedQuantity:
            0,
        },
        "quantity_invalid",
      ],

      [
        {
          ...base,
          unit: "",
        },
        "unit_invalid",
      ],

      [
        {
          ...base,
          tracking: [],
        },
        "tracking_invalid",
      ],

      [
        {
          ...base,
          expectedValue: {},
        },
        "expected_value_invalid",
      ],
    ];

    for (
      const [
        payload,
        reason,
      ] of cases
    ) {
      const result =
        normalizeWriteRequest(
          {
            accountId:
              ACCOUNT_ID,

            action:
              "add_item",

            payload,
          },
          REQUEST_ID,
        );

      assert.equal(
        result.ok,
        false,
      );

      assert.equal(
        result.reason,
        reason,
      );
    }
  },
);


test(
  "add_item receiving item kullanıldığında receivingId zorunludur",
  () => {
    const result =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "add_item",

          payload: {
            inspectionId:
              INSPECTION_ID,

            productId:
              PRODUCT_ID,

            warehouseId:
              WAREHOUSE_ID,

            locationId:
              LOCATION_ID,

            controlType:
              "visual_inspection",

            inspectedQuantity:
              1,

            unit:
              "adet",

            receivingItemId:
              RECEIVING_ITEM_ID,
          },
        },
        REQUEST_ID,
      );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      result.reason,
      "receiving_pair_invalid",
    );
  },
);


test(
  "start payload yalnız inspectionId ile normalize edilir",
  () => {
    const result =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "start",

          payload: {
            inspectionId:
              INSPECTION_ID,

            ignored:
              "bu alan RPCye gitmemeli",
          },
        },
        REQUEST_ID,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      result.value.payload,
      {
        inspectionId:
          INSPECTION_ID,
      },
    );
  },
);


test(
  "Quality API kaynak sözleşmesi caller JWT anon key RPC ve Idempotency-Key kullanır",
  async () => {
    const source =
      await readFile(
        "functions/api/warehouse/quality-control.js",
        "utf8",
      );

    assert.match(
      source,
      /Authorization:\s*`Bearer \$\{token\}`/,
    );

    assert.match(
      source,
      /env\.SUPABASE_ANON_KEY/,
    );

    assert.match(
      source,
      /\/rest\/v1\/rpc\/warehouse_quality_control_write/,
    );

    assert.match(
      source,
      /Idempotency-Key/,
    );

    assert.doesNotMatch(
      source,
      /service_role/i,
    );
  },
);


test(
  "Quality API record_result complete cancel ve diğer kritik actionları RPCye açmaz",
  async () => {
    const source =
      await readFile(
        "functions/api/warehouse/quality-control.js",
        "utf8",
      );

    const actionBlock =
      source.match(
        /const WRITE_ACTIONS = Object\.freeze\(\[([\s\S]*?)\]\);/,
      )?.[1] ?? "";

    for (const forbidden of [
      "record_result",
      "complete",
      "cancel",
      "create_sample",
      "add_document",
      "create_task",
      "create_exception",
      "resolve_exception",
    ]) {
      assert.doesNotMatch(
        actionBlock,
        new RegExp(
          `"${forbidden}"`,
        ),
      );
    }
  },
);


test(
  "Quality API inventory veya Receiving mutation endpointi çağırmaz",
  async () => {
    const source =
      await readFile(
        "functions/api/warehouse/quality-control.js",
        "utf8",
      );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_post/i,
    );

    assert.doesNotMatch(
      source,
      /warehouse_receiving_(write|complete_write)/i,
    );

    assert.doesNotMatch(
      source,
      /\/rest\/v1\/warehouse_(inventory|receivings)/i,
    );
  },
);


test(
  "Quality POST caller JWT ve aynı Idempotency-Key verisini RPCye taşır",
  async () => {
    const calls = [];

    const fetchImpl =
      async (
        input,
        options = {},
      ) => {
        const url =
          String(input);

        calls.push({
          url,
          options,
        });

        if (
          url.endsWith(
            "/auth/v1/user",
          )
        ) {
          return new Response(
            JSON.stringify({
              id:
                USER_ID,
            }),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "application/json",
              },
            },
          );
        }

        if (
          url.endsWith(
            "/rest/v1/rpc/warehouse_quality_control_write",
          )
        ) {
          return new Response(
            JSON.stringify({
              action:
                "start",

              inspectionId:
                INSPECTION_ID,

              status:
                "in_progress",
            }),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "application/json",
              },
            },
          );
        }

        throw new Error(
          `Beklenmeyen fetch: ${url}`,
        );
      };

    const response =
      await onRequestPost({
        request:
          createRequest(
            {
              accountId:
                ACCOUNT_ID,

              action:
                "start",

              payload: {
                inspectionId:
                  INSPECTION_ID,
              },
            },
            {
              Authorization:
                "Bearer kullanici-token",

              "Idempotency-Key":
                REQUEST_ID,
            },
          ),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",
        },

        fetch:
          fetchImpl,
      });

    assert.equal(
      response.status,
      200,
    );

    const body =
      await response.json();

    assert.equal(
      body.data.status,
      "in_progress",
    );

    assert.equal(
      calls.length,
      2,
    );

    const authCall =
      calls[0];

    assert.match(
      authCall.url,
      /\/auth\/v1\/user$/,
    );

    assert.equal(
      authCall.options
        .headers.Authorization,
      "Bearer kullanici-token",
    );

    assert.equal(
      authCall.options
        .headers.apikey,
      "anon-key",
    );

    const rpcCall =
      calls[1];

    assert.match(
      rpcCall.url,
      /\/rest\/v1\/rpc\/warehouse_quality_control_write$/,
    );

    assert.equal(
      rpcCall.options.method,
      "POST",
    );

    assert.equal(
      rpcCall.options
        .headers.Authorization,
      "Bearer kullanici-token",
    );

    assert.equal(
      rpcCall.options
        .headers.apikey,
      "anon-key",
    );

    assert.deepEqual(
      JSON.parse(
        rpcCall.options.body,
      ),
      {
        p_action:
          "start",

        p_request_id:
          REQUEST_ID,

        p_account_id:
          ACCOUNT_ID,

        p_payload: {
          inspectionId:
            INSPECTION_ID,
        },
      },
    );
  },
);


test(
  "Quality POST Bearer token olmadan 401 döner ve upstream çağırmaz",
  async () => {
    let called =
      false;

    const response =
      await onRequestPost({
        request:
          createRequest(
            {
              accountId:
                ACCOUNT_ID,

              action:
                "start",

              payload: {
                inspectionId:
                  INSPECTION_ID,
              },
            },
            {
              "Idempotency-Key":
                REQUEST_ID,
            },
          ),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",
        },

        fetch:
          async () => {
            called = true;

            throw new Error(
              "çağrılmamalı",
            );
          },
      });

    assert.equal(
      response.status,
      401,
    );

    assert.equal(
      called,
      false,
    );
  },
);


test(
  "Quality OPTIONS CORS ile Authorization ve Idempotency-Key başlıklarını açar",
  () => {
    const response =
      onRequestOptions({
        request:
          new Request(
            API_URL,
            {
              method:
                "OPTIONS",

              headers: {
                Origin:
                  "https://istebul.com",
              },
            },
          ),
      });

    assert.equal(
      response.status,
      204,
    );

    assert.match(
      response.headers.get(
        "Access-Control-Allow-Headers",
      ) || "",
      /Authorization/,
    );

    assert.match(
      response.headers.get(
        "Access-Control-Allow-Headers",
      ) || "",
      /Idempotency-Key/,
    );

    assert.match(
      response.headers.get(
        "Access-Control-Allow-Methods",
      ) || "",
      /POST/,
    );
  },
);


test(
  "Quality RPC hata kodları HTTP statülerine güvenli eşlenir",
  () => {
    assert.equal(
      mapRpcError({
        status: 400,
        data: {
          code:
            "42501",
          message:
            "yetkisiz",
        },
      }).status,
      403,
    );

    assert.equal(
      mapRpcError({
        status: 400,
        data: {
          code:
            "23505",
        },
      }).status,
      409,
    );

    assert.equal(
      mapRpcError({
        status: 400,
        data: {
          code:
            "40001",
        },
      }).status,
      409,
    );

    assert.equal(
      mapRpcError({
        status: 400,
        data: {
          code:
            "P0002",
        },
      }).status,
      404,
    );

    for (const code of [
      "22023",
      "22P02",
      "22007",
    ]) {
      assert.equal(
        mapRpcError({
          status: 400,
          data: {
            code,
          },
        }).status,
        400,
      );
    }

    assert.equal(
      mapRpcError({
        status: 503,
        data: {},
      }).status,
      502,
    );
  },
);
