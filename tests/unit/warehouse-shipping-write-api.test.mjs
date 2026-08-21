import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  extractBearerToken,
  normalizeShippingCreateRequest,
  onRequestOptions,
  onRequestPost,
  rpcErrorStatus,
  shippingRpcRequest,
} from "../../functions/api/warehouse/shipping.js";

const ACCOUNT =
  "11111111-1111-4111-8111-111111111111";

const REQUEST =
  "22222222-2222-4222-8222-222222222222";

const PACKING =
  "33333333-3333-4333-8333-333333333333";

const LOCATION =
  "44444444-4444-4444-8444-444444444444";

const SHIPPING =
  "55555555-5555-4555-8555-555555555555";

const WAREHOUSE =
  "66666666-6666-4666-8666-666666666666";

const USER =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function validBody() {
  return {
    accountId: ACCOUNT,
    action:
      "create_from_packing",
    payload: {
      packingId: PACKING,
      shippingLocationId:
        LOCATION,
      strategy:
        "single_shipment"
    }
  };
}

function authResponse() {
  return new Response(
    JSON.stringify({
      id: USER
    }),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/json"
      }
    }
  );
}

function shippingResponse() {
  return new Response(
    JSON.stringify({
      ok: true,
      action:
        "create_from_packing",
      requestId: REQUEST,
      shippingId: SHIPPING,
      shippingNumber:
        "SVK-20260822-000001",
      packingId: PACKING,
      warehouseId: WAREHOUSE,
      shippingLocationId:
        LOCATION,
      status: "draft",
      itemCount: 2,
      packageCount: 1
    }),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/json"
      }
    }
  );
}

test(
  "Shipping API Bearer tokenı güvenli ayıklar",
  () => {
    assert.equal(
      extractBearerToken(
        new Request(
          "https://istebul.com/api/warehouse/shipping",
          {
            headers: {
              Authorization:
                "Bearer jwt"
            }
          }
        )
      ),
      "jwt"
    );

    assert.equal(
      extractBearerToken(
        new Request(
          "https://istebul.com/api/warehouse/shipping"
        )
      ),
      null
    );
  }
);

test(
  "create_from_packing payload exact normalize edilir",
  () => {
    const result =
      normalizeShippingCreateRequest(
        {
          accountId: ACCOUNT,
          action:
            "create_from_packing",

          payload: {
            packingId:
              PACKING,

            shippingLocationId:
              LOCATION,

            strategy:
              "single_shipment",

            priority: 50,

            plannedAt:
              "2026-08-22T08:00:00Z",

            expectedDeliveryAt:
              "2026-08-23T08:00:00Z",

            notes:
              "  not  "
          }
        },
        REQUEST
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.value
        .payload.notes,
      "not"
    );

    assert.equal(
      result.value
        .payload.priority,
      50
    );
  }
);

test(
  "Shipping API fail closed alan doğrulaması uygular",
  () => {
    assert.equal(
      normalizeShippingCreateRequest(
        validBody(),
        null
      ).reason,
      "request_id_invalid"
    );

    assert.equal(
      normalizeShippingCreateRequest(
        {
          ...validBody(),
          extra: true
        },
        REQUEST
      ).reason,
      "body_fields_invalid"
    );

    assert.equal(
      normalizeShippingCreateRequest(
        {
          ...validBody(),
          action: "invalid"
        },
        REQUEST
      ).reason,
      "action_invalid"
    );

    assert.equal(
      normalizeShippingCreateRequest(
        {
          ...validBody(),

          payload: {
            ...validBody()
              .payload,

            carrierId: USER
          }
        },
        REQUEST
      ).reason,
      "payload_fields_invalid"
    );
  }
);

test(
  "Shipping RPC exact dokuz parametre ile yönlendirilir",
  () => {
    const normalized =
      normalizeShippingCreateRequest(
        validBody(),
        REQUEST
      );

    const rpc =
      shippingRpcRequest(
        normalized.value
      );

    assert.equal(
      rpc.path,
      "/rest/v1/rpc/warehouse_shipping_create_from_packing_write"
    );

    assert.deepEqual(
      Object.keys(
        rpc.body
      ),
      [
        "p_request_id",
        "p_account_id",
        "p_packing_id",
        "p_shipping_location_id",
        "p_strategy",
        "p_priority",
        "p_planned_at",
        "p_expected_delivery_at",
        "p_notes"
      ]
    );
  }
);

test(
  "Shipping API service role kullanmaz ve caller JWT taşır",
  async () => {
    const source =
      await readFile(
        new URL(
          "../../functions/api/warehouse/shipping.js",
          import.meta.url
        ),
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY|\bservice_role\b/i
    );

    assert.match(
      source,
      /SUPABASE_ANON_KEY/
    );

    assert.match(
      source,
      /Authorization:\s*`Bearer \$\{token\}`/
    );
  }
);

test(
  "Shipping API caller JWT ve anon key ile existing RPC çağırır",
  async () => {
    const calls = [];

    const response =
      await onRequestPost({
        request:
          new Request(
            "https://istebul.com/api/warehouse/shipping",
            {
              method: "POST",

              headers: {
                Authorization:
                  "Bearer jwt",

                "Idempotency-Key":
                  REQUEST,

                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  validBody()
                )
            }
          ),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon"
        },

        fetch:
          async (
            url,
            options = {}
          ) => {
            calls.push(
              String(url)
            );

            if (
              String(url).includes(
                "/auth/v1/user"
              )
            ) {
              return authResponse();
            }

            assert.equal(
              String(url),
              "https://example.supabase.co/rest/v1/rpc/warehouse_shipping_create_from_packing_write"
            );

            assert.equal(
              options.headers.apikey,
              "anon"
            );

            assert.equal(
              options.headers.Authorization,
              "Bearer jwt"
            );

            assert.deepEqual(
              Object.keys(
                JSON.parse(
                  options.body
                )
              ),
              [
                "p_request_id",
                "p_account_id",
                "p_packing_id",
                "p_shipping_location_id",
                "p_strategy",
                "p_priority",
                "p_planned_at",
                "p_expected_delivery_at",
                "p_notes"
              ]
            );

            return shippingResponse();
          }
      });

    assert.equal(
      response.status,
      200
    );

    const body =
      await response.json();

    assert.equal(
      body.ok,
      true
    );

    assert.equal(
      body.data.shippingId,
      SHIPPING
    );

    assert.equal(
      calls.length,
      2
    );
  }
);

test(
  "Shipping API auth olmadan upstream çağırmaz",
  async () => {
    let called = false;

    const response =
      await onRequestPost({
        request:
          new Request(
            "https://istebul.com/api/warehouse/shipping",
            {
              method: "POST",

              headers: {
                "Idempotency-Key":
                  REQUEST,

                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  validBody()
                )
            }
          ),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon"
        },

        fetch:
          async () => {
            called = true;

            throw new Error(
              "çağrılmamalı"
            );
          }
      });

    assert.equal(
      response.status,
      401
    );

    assert.equal(
      called,
      false
    );
  }
);

test(
  "Shipping RPC hata kodları güvenli HTTP durumlarına çevrilir",
  () => {
    assert.equal(
      rpcErrorStatus(
        "42501"
      ),
      403
    );

    assert.equal(
      rpcErrorStatus(
        "23505"
      ),
      409
    );

    assert.equal(
      rpcErrorStatus(
        "P0002"
      ),
      404
    );

    assert.equal(
      rpcErrorStatus(
        "22023"
      ),
      422
    );
  }
);

test(
  "Shipping API OPTIONS güvenli CORS ve no-store döndürür",
  () => {
    const response =
      onRequestOptions({
        request:
          new Request(
            "https://istebul.com/api/warehouse/shipping",
            {
              method:
                "OPTIONS",

              headers: {
                Origin:
                  "https://www.istebul.com"
              }
            }
          )
      });

    assert.equal(
      response.status,
      204
    );

    assert.match(
      response.headers.get(
        "Access-Control-Allow-Headers"
      ),
      /Idempotency-Key/
    );

    assert.equal(
      response.headers.get(
        "Cache-Control"
      ),
      "private, no-store"
    );
  }
);
