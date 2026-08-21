import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  extractBearerToken,
  mapRpcError,
  normalizeUuid,
  normalizeWriteAction,
  normalizeWriteRequest,
  onRequestOptions,
  onRequestPost,
} from "../../functions/api/warehouse/packing.js";

const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";

const REQUEST_ID =
  "22222222-2222-4222-8222-222222222222";

const PICKING_ID =
  "33333333-3333-4333-8333-333333333333";

const PACKING_LOCATION_ID =
  "44444444-4444-4444-8444-444444444444";

const SHIPPING_LOCATION_ID =
  "55555555-5555-4555-8555-555555555555";

const PACKING_ID =
  "66666666-6666-4666-8666-666666666666";

const CONTAINER_ID =
  "77777777-7777-4777-8777-777777777777";

const PACKING_ITEM_ID =
  "88888888-8888-4888-8888-888888888888";

const PACKAGE_ID =
  "99999999-9999-4999-8999-999999999999";

const USER_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function authResponse() {
  return new Response(
    JSON.stringify({
      id: USER_ID,
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

test(
  "Packing API Bearer tokenı güvenli ayıklar",
  () => {
    const request =
      new Request(
        "https://istebul.com/api/warehouse/packing",
        {
          headers: {
            Authorization:
              "Bearer kullanici-token",
          },
        },
      );

    assert.equal(
      extractBearerToken(request),
      "kullanici-token",
    );

    assert.equal(
      extractBearerToken(
        new Request(
          "https://istebul.com/api/warehouse/packing",
        ),
      ),
      null,
    );
  },
);

test(
  "Packing API exact dokuz write actionını açar",
  () => {
    assert.equal(
      normalizeWriteAction(
        "create_from_picking",
      ),
      "create_from_picking",
    );

    assert.equal(
      normalizeWriteAction(
        "create_package",
      ),
      "create_package",
    );

    assert.equal(
      normalizeWriteAction(
        "confirm_item",
      ),
      "confirm_item",
    );

    for (const allowed of [
      "seal_package",
      "generate_package_label",
      "resolve_exception",
      "complete",
      "mark_shipping_ready",
      "cancel",
    ]) {
      assert.equal(
        normalizeWriteAction(
          allowed,
        ),
        allowed,
      );
    }

    for (const blocked of [
      "create",
      "add_item",
      "create_label",
      "generate_label",
      "mark_label_printed",
      "mark_label_failed",
      "cancel_label",
    ]) {
      assert.equal(
        normalizeWriteAction(
          blocked,
        ),
        null,
      );
    }

    assert.equal(
      normalizeUuid(
        ACCOUNT_ID,
      ),
      ACCOUNT_ID,
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
  "Packing write isteği Idempotency-Key olmadan kabul edilmez",
  () => {
    const result =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "create_from_picking",

          payload: {
            pickingId:
              PICKING_ID,

            packingLocationId:
              PACKING_LOCATION_ID,
          },
        },
        null,
      );

    assert.deepEqual(
      result,
      {
        ok: false,
        reason:
          "request_id_invalid",
      },
    );
  },
);

test(
  "create_from_picking payload exact normalize edilir",
  () => {
    const result =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "create_from_picking",

          payload: {
            pickingId:
              PICKING_ID,

            packingLocationId:
              PACKING_LOCATION_ID,

            shippingLocationId:
              SHIPPING_LOCATION_ID,

            strategy:
              "cartonization",

            priority:
              40,

            notes:
              "Mobil paketleme",
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
          "create_from_picking",

        requestId:
          REQUEST_ID,

        payload: {
          pickingId:
            PICKING_ID,

          packingLocationId:
            PACKING_LOCATION_ID,

          shippingLocationId:
            SHIPPING_LOCATION_ID,

          strategy:
            "cartonization",

          priority:
            40,

          notes:
            "Mobil paketleme",
        },
      },
    );
  },
);

test(
  "create_package gerekli Packing ve container UUID alanlarını doğrular",
  () => {
    const invalid =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "create_package",

          payload: {
            packingId:
              PACKING_ID,

            containerId:
              "container-x",
          },
        },
        REQUEST_ID,
      );

    assert.deepEqual(
      invalid,
      {
        ok: false,
        reason:
          "container_id_invalid",
      },
    );

    const valid =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "create_package",

          payload: {
            packingId:
              PACKING_ID,

            containerId:
              CONTAINER_ID,

            weightUnit:
              "kg",

            volumeUnit:
              "cm3",
          },
        },
        REQUEST_ID,
      );

    assert.equal(
      valid.ok,
      true,
    );

    assert.equal(
      valid.value.payload
        .containerId,
      CONTAINER_ID,
    );
  },
);

test(
  "confirm_item miktar ve paket kimliklerini doğrular",
  () => {
    const empty =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "confirm_item",

          payload: {
            packingId:
              PACKING_ID,

            packingItemId:
              PACKING_ITEM_ID,

            packageId:
              PACKAGE_ID,

            quantity:
              0,

            damagedQuantity:
              0,

            missingQuantity:
              0,
          },
        },
        REQUEST_ID,
      );

    assert.deepEqual(
      empty,
      {
        ok: false,
        reason:
          "quantity_empty",
      },
    );

    const valid =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,

          action:
            "confirm_item",

          payload: {
            packingId:
              PACKING_ID,

            packingItemId:
              PACKING_ITEM_ID,

            packageId:
              PACKAGE_ID,

            quantity:
              2,

            damagedQuantity:
              1,

            missingQuantity:
              0,

            barcode:
              "8690000000001",

            lotNumber:
              "LOT-01",
          },
        },
        REQUEST_ID,
      );

    assert.equal(
      valid.ok,
      true,
    );

    assert.equal(
      valid.value.payload
        .quantity,
      2,
    );

    assert.equal(
      valid.value.payload
        .damagedQuantity,
      1,
    );
  },
);

test(
  "Packing API service role kullanmaz ve kullanıcı JWT'sini Supabase'e iletir",
  async () => {
    const source =
      await readFile(
        "functions/api/warehouse/packing.js",
        "utf8",
      );

    assert.equal(
      source.includes(
        "SUPABASE_SERVICE_ROLE_KEY",
      ),
      false,
    );

    assert.match(
      source,
      /Authorization:\s*`Bearer \$\{token\}`/,
    );

    assert.match(
      source,
      /warehouse_packing_create_from_picking/,
    );

    assert.match(
      source,
      /warehouse_packing_confirm_item_write/,
    );

    assert.match(
      source,
      /warehouse_packing_write/,
    );

    assert.match(
      source,
      /Idempotency-Key/,
    );

    assert.match(
      source,
      /private, no-store/,
    );
  },
);

test(
  "create_from_picking specialized RPC'ye exact parametrelerle gider",
  async () => {
    const calls = [];

    const fetchMock =
      async (
        url,
        options = {},
      ) => {
        calls.push({
          url:
            String(url),
          options,
        });

        if (
          String(url).includes(
            "/auth/v1/user",
          )
        ) {
          return authResponse();
        }

        if (
          String(url).endsWith(
            "/rest/v1/rpc/warehouse_packing_create_from_picking",
          )
        ) {
          return new Response(
            JSON.stringify({
              ok: true,
              action:
                "create_from_picking",
              packingId:
                PACKING_ID,
              status:
                "draft",
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
          `Beklenmeyen URL: ${url}`,
        );
      };

    const request =
      new Request(
        "https://istebul.com/api/warehouse/packing",
        {
          method:
            "POST",

          headers: {
            Authorization:
              "Bearer kullanici-token",

            "Content-Type":
              "application/json",

            "Idempotency-Key":
              REQUEST_ID,

            Origin:
              "https://www.istebul.com",
          },

          body:
            JSON.stringify({
              accountId:
                ACCOUNT_ID,

              action:
                "create_from_picking",

              payload: {
                pickingId:
                  PICKING_ID,

                packingLocationId:
                  PACKING_LOCATION_ID,

                shippingLocationId:
                  SHIPPING_LOCATION_ID,

                strategy:
                  "cartonization",

                priority:
                  50,
              },
            }),
        },
      );

    const response =
      await onRequestPost({
        request,

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",
        },

        fetch:
          fetchMock,
      });

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      calls.length,
      2,
    );

    assert.match(
      calls[1].url,
      /warehouse_packing_create_from_picking$/,
    );

    assert.deepEqual(
      JSON.parse(
        calls[1].options.body,
      ),
      {
        p_request_id:
          REQUEST_ID,

        p_account_id:
          ACCOUNT_ID,

        p_picking_id:
          PICKING_ID,

        p_packing_location_id:
          PACKING_LOCATION_ID,

        p_shipping_location_id:
          SHIPPING_LOCATION_ID,

        p_strategy:
          "cartonization",

        p_priority:
          50,

        p_planned_at:
          null,

        p_notes:
          null,
      },
    );

    assert.equal(
      calls[1].options
        .headers.Authorization,
      "Bearer kullanici-token",
    );

    const body =
      await response.json();

    assert.equal(
      body.ok,
      true,
    );

    assert.equal(
      body.data.packingId,
      PACKING_ID,
    );
  },
);

test(
  "create_package generic Packing RPC'ye p_payload ile yönlendirilir",
  async () => {
    const calls = [];

    const fetchMock =
      async (
        url,
        options = {},
      ) => {
        calls.push({
          url:
            String(url),
          options,
        });

        if (
          String(url).includes(
            "/auth/v1/user",
          )
        ) {
          return authResponse();
        }

        if (
          String(url).endsWith(
            "/rest/v1/rpc/warehouse_packing_write",
          )
        ) {
          return new Response(
            JSON.stringify({
              ok: true,
              action:
                "create_package",
              packingId:
                PACKING_ID,
              packageId:
                PACKAGE_ID,
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
          `Beklenmeyen URL: ${url}`,
        );
      };

    const request =
      new Request(
        "https://istebul.com/api/warehouse/packing",
        {
          method:
            "POST",

          headers: {
            Authorization:
              "Bearer kullanici-token",

            "Content-Type":
              "application/json",

            "Idempotency-Key":
              REQUEST_ID,
          },

          body:
            JSON.stringify({
              accountId:
                ACCOUNT_ID,

              action:
                "create_package",

              payload: {
                packingId:
                  PACKING_ID,

                containerId:
                  CONTAINER_ID,

                weightUnit:
                  "kg",

                volumeUnit:
                  "cm3",
              },
            }),
        },
      );

    const response =
      await onRequestPost({
        request,

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",
        },

        fetch:
          fetchMock,
      });

    assert.equal(
      response.status,
      200,
    );

    assert.match(
      calls[1].url,
      /warehouse_packing_write$/,
    );

    assert.deepEqual(
      JSON.parse(
        calls[1].options.body,
      ),
      {
        p_action:
          "create_package",

        p_request_id:
          REQUEST_ID,

        p_account_id:
          ACCOUNT_ID,

        p_payload: {
          packingId:
            PACKING_ID,

          containerId:
            CONTAINER_ID,

          weightUnit:
            "kg",

          volumeUnit:
            "cm3",
        },
      },
    );
  },
);

test(
  "confirm_item atomik specialized RPC'ye exact body ile yönlendirilir",
  async () => {
    const calls = [];

    const fetchMock =
      async (
        url,
        options = {},
      ) => {
        calls.push({
          url:
            String(url),
          options,
        });

        if (
          String(url).includes(
            "/auth/v1/user",
          )
        ) {
          return authResponse();
        }

        if (
          String(url).endsWith(
            "/rest/v1/rpc/warehouse_packing_confirm_item_write",
          )
        ) {
          return new Response(
            JSON.stringify({
              ok: true,
              action:
                "confirm_item",
              packingId:
                PACKING_ID,
              packingItemId:
                PACKING_ITEM_ID,
              packageId:
                PACKAGE_ID,
              remainingQuantity:
                0,
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
          `Beklenmeyen URL: ${url}`,
        );
      };

    const request =
      new Request(
        "https://istebul.com/api/warehouse/packing",
        {
          method:
            "POST",

          headers: {
            Authorization:
              "Bearer kullanici-token",

            "Content-Type":
              "application/json",

            "Idempotency-Key":
              REQUEST_ID,
          },

          body:
            JSON.stringify({
              accountId:
                ACCOUNT_ID,

              action:
                "confirm_item",

              payload: {
                packingId:
                  PACKING_ID,

                packingItemId:
                  PACKING_ITEM_ID,

                packageId:
                  PACKAGE_ID,

                quantity:
                  3,

                damagedQuantity:
                  0,

                missingQuantity:
                  0,

                barcode:
                  "8690000000001",

                lotNumber:
                  "LOT-01",

                serialNumber:
                  "SER-01",

                notes:
                  "Kontrol edildi",
              },
            }),
        },
      );

    const response =
      await onRequestPost({
        request,

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",
        },

        fetch:
          fetchMock,
      });

    assert.equal(
      response.status,
      200,
    );

    assert.match(
      calls[1].url,
      /warehouse_packing_confirm_item_write$/,
    );

    assert.deepEqual(
      JSON.parse(
        calls[1].options.body,
      ),
      {
        p_request_id:
          REQUEST_ID,

        p_account_id:
          ACCOUNT_ID,

        p_packing_id:
          PACKING_ID,

        p_packing_item_id:
          PACKING_ITEM_ID,

        p_package_id:
          PACKAGE_ID,

        p_quantity:
          3,

        p_damaged_quantity:
          0,

        p_missing_quantity:
          0,

        p_barcode:
          "8690000000001",

        p_lot_number:
          "LOT-01",

        p_serial_number:
          "SER-01",

        p_notes:
          "Kontrol edildi",
      },
    );
  },
);

test(
  "Packing API kimlik doğrulaması olmadan RPC çağırmaz",
  async () => {
    let called = false;

    const response =
      await onRequestPost({
        request:
          new Request(
            "https://istebul.com/api/warehouse/packing",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "Idempotency-Key":
                  REQUEST_ID,
              },

              body:
                JSON.stringify({
                  accountId:
                    ACCOUNT_ID,

                  action:
                    "create_package",

                  payload: {
                    packingId:
                      PACKING_ID,

                    containerId:
                      CONTAINER_ID,
                  },
                }),
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
              "Çağrılmamalı",
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
  "Packing API OPTIONS güvenli CORS ve no-store başlıklarını döndürür",
  () => {
    const response =
      onRequestOptions({
        request:
          new Request(
            "https://istebul.com/api/warehouse/packing",
            {
              method:
                "OPTIONS",

              headers: {
                Origin:
                  "https://www.istebul.com",
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
      ),
      /Idempotency-Key/,
    );

    assert.equal(
      response.headers.get(
        "Cache-Control",
      ),
      "private, no-store",
    );
  },
);

test(
  "Packing RPC hata kodları güvenli HTTP hata kodlarına çevrilir",
  () => {
    assert.deepEqual(
      mapRpcError({
        status: 400,

        data: {
          code:
            "42501",

          message:
            "Yetki yok.",
        },
      }),
      {
        status: 403,
        code:
          "forbidden",
        message:
          "Yetki yok.",
      },
    );

    assert.equal(
      mapRpcError({
        status: 400,

        data: {
          code:
            "23505",

          message:
            "Çakışma.",
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

          message:
            "Bulunamadı.",
        },
      }).status,
      404,
    );

    assert.equal(
      mapRpcError({
        status: 500,

        data: {
          code:
            "XX000",

          message:
            "DB hata.",
        },
      }).status,
      502,
    );
  },
);

test(
  "Packing lifecycle payloadları fail closed normalize edilir",
  () => {
    const seal =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,
          action:
            "seal_package",
          payload: {
            packingId:
              PACKING_ID,
            packageId:
              PACKAGE_ID,
            sealNumber:
              "SEAL-001",
            actualWeight:
              4.25,
          },
        },
        REQUEST_ID,
      );

    assert.equal(
      seal.ok,
      true,
    );

    assert.equal(
      seal.value.payload
        .sealNumber,
      "SEAL-001",
    );

    const label =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,
          action:
            "generate_package_label",
          payload: {
            packingId:
              PACKING_ID,
            packageId:
              PACKAGE_ID,
          },
        },
        REQUEST_ID,
      );

    assert.equal(
      label.ok,
      true,
    );

    assert.equal(
      label.value.payload
        .format,
      "zpl",
    );

    const invalidCancel =
      normalizeWriteRequest(
        {
          accountId:
            ACCOUNT_ID,
          action:
            "cancel",
          payload: {
            packingId:
              PACKING_ID,
            reason:
              "   ",
          },
        },
        REQUEST_ID,
      );

    assert.deepEqual(
      invalidCancel,
      {
        ok: false,
        reason:
          "cancellation_reason_invalid",
      },
    );
  },
);

test(
  "Packing lifecycle exact altı dedicated RPC contractını taşır",
  async () => {
    const source =
      await readFile(
        "functions/api/warehouse/packing.js",
        "utf8",
      );

    for (const rpc of [
      "warehouse_packing_seal_package_write",
      "warehouse_packing_generate_package_label_write",
      "warehouse_packing_resolve_exception_write",
      "warehouse_packing_complete_write",
      "warehouse_packing_mark_shipping_ready_write",
      "warehouse_packing_cancel_write",
    ]) {
      assert.match(
        source,
        new RegExp(rpc),
      );
    }

    for (const parameter of [
      "p_seal_number",
      "p_actual_weight",
      "p_actual_volume",
      "p_exception_id",
      "p_resolution_notes",
      "p_reason",
    ]) {
      assert.match(
        source,
        new RegExp(parameter),
      );
    }
  },
);
