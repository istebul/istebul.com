import assert from "node:assert/strict";
import { test } from "node:test";

import {
  onRequestGet,
  onRequestOptions,
  onRequestPatch,
  onRequestPost,
} from "../../functions/api/warehouse/warehouses.js";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const WAREHOUSE_ID = "22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";
const TOKEN = "test-token";

const ENV = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
};

const WAREHOUSE = {
  id: WAREHOUSE_ID,
  account_id: ACCOUNT_ID,
  code: "ANA-DEPO",
  name: "Ana Depo",
  description: "Merkez depo",
  status: "active",
  timezone: "Europe/Istanbul",
  address_line: "Organize Sanayi",
  district: "Selçuklu",
  city: "Konya",
  postal_code: "42000",
  country_code: "TR",
  total_area_square_meters: 1000,
  usable_area_square_meters: 800,
  maximum_pallet_capacity: 500,
  maximum_bin_capacity: 2000,
  created_by: USER_ID,
  created_at: "2026-09-09T10:00:00Z",
  updated_at: "2026-09-09T10:00:00Z",
};

function response(body, status = 200) {
  return new Response(
    body === null ? null : JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function request(method, body = undefined, authorization = `Bearer ${TOKEN}`) {
  return new Request(
    `https://www.istebul.com/api/warehouse/warehouses`,
    {
      method,
      headers: {
        ...(authorization
          ? { Authorization: authorization }
          : {}),
        ...(body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    },
  );
}

function context(requestObject, fetchImpl) {
  return {
    request: requestObject,
    env: ENV,
    fetch: fetchImpl,
  };
}

function mockFetch({
  role = "owner",
  warehouses = [WAREHOUSE],
  rpcResponse = null,
  rpcStatus = 200,
  userResponse = { id: USER_ID },
  userStatus = 200,
  membershipStatus = 200,
} = {}) {
  const calls = [];

  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    calls.push({
      url: parsed,
      options,
    });

    if (parsed.pathname === "/auth/v1/user") {
      return response(userResponse, userStatus);
    }

    if (parsed.pathname === "/rest/v1/warehouse_users") {
      if (membershipStatus !== 200) {
        return response(
          { message: "membership lookup failed" },
          membershipStatus,
        );
      }

      return response([
        {
          account_id: ACCOUNT_ID,
          role,
          status: "active",
        },
      ]);
    }

    if (parsed.pathname === "/rest/v1/warehouses") {
      return response(warehouses, 200);
    }

    if (parsed.pathname.startsWith("/rest/v1/rpc/")) {
      return response(
        rpcResponse ?? {
          ...WAREHOUSE,
        },
        rpcStatus,
      );
    }

    return response(
      { message: "unexpected request" },
      500,
    );
  };

  return {
    fetchImpl,
    calls,
  };
}

test("OPTIONS returns 204", async () => {
  const result = await onRequestOptions(
    context(
      request("OPTIONS"),
      mockFetch().fetchImpl,
    ),
  );

  assert.equal(result.status, 204);
});

test("GET without bearer token returns 401", async () => {
  const result = await onRequestGet(
    context(
      request("GET", undefined, null),
      mockFetch().fetchImpl,
    ),
  );

  assert.equal(result.status, 401);
});

test("GET with invalid accountId returns 400", async () => {
  const { fetchImpl } = mockFetch();

  const result = await onRequestGet(
    context(
      new Request(
        "https://www.istebul.com/api/warehouse/warehouses?accountId=invalid",
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
          },
        },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);
});

test("GET without active membership returns 403", async () => {
  const { fetchImpl } = mockFetch({
    membershipStatus: 200,
  });

  const customFetch = async (url, options = {}) => {
    const parsed = new URL(url);

    if (parsed.pathname === "/auth/v1/user") {
      return response({ id: USER_ID });
    }

    if (parsed.pathname === "/rest/v1/warehouse_users") {
      return response([]);
    }

    return fetchImpl(url, options);
  };

  const result = await onRequestGet(
    context(
      new Request(
        `https://www.istebul.com/api/warehouse/warehouses?accountId=${ACCOUNT_ID}`,
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
          },
        },
      ),
      customFetch,
    ),
  );

  assert.equal(result.status, 403);
});

test("GET returns warehouses scoped to account", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestGet(
    context(
      new Request(
        `https://www.istebul.com/api/warehouse/warehouses?accountId=${ACCOUNT_ID}`,
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
          },
        },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);

  const payload = await result.json();

  assert.equal(payload.data.count, 1);
  assert.equal(payload.data.warehouses[0].id, WAREHOUSE_ID);
  assert.equal(payload.data.warehouses[0].account_id, ACCOUNT_ID);

  const warehouseCall = calls.find(
    (call) =>
      call.url.pathname === "/rest/v1/warehouses",
  );

  assert.ok(warehouseCall);
  assert.equal(
    warehouseCall.url.searchParams.get("account_id"),
    `eq.${ACCOUNT_ID}`,
  );
  assert.equal(
    warehouseCall.url.searchParams.get("order"),
    "code.asc",
  );
});

test("POST with unauthorized role returns 403 and does not call RPC", async () => {
  const { fetchImpl, calls } = mockFetch({
    role: "supervisor",
  });

  const result = await onRequestPost(
    context(
      request("POST", {
        requestId: REQUEST_ID,
        accountId: ACCOUNT_ID,
        code: "YENI-DEPO",
        name: "Yeni Depo",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 403);

  const rpcCalls = calls.filter((call) =>
    call.url.pathname.startsWith("/rest/v1/rpc/"),
  );

  assert.equal(rpcCalls.length, 0);
});

test("POST calls warehouse_create_write with mapped parameters", async () => {
  const { fetchImpl, calls } = mockFetch({
    rpcResponse: {
      ...WAREHOUSE,
      code: "YENI-DEPO",
      name: "Yeni Depo",
      status: "draft",
    },
  });

  const result = await onRequestPost(
    context(
      request("POST", {
        requestId: REQUEST_ID,
        accountId: ACCOUNT_ID,
        code: " yeni-depo ",
        name: " Yeni Depo ",
        description: " Test depo ",
        timezone: "Europe/Istanbul",
        addressLine: "Adres",
        district: "Selçuklu",
        city: "Konya",
        postalCode: "42000",
        countryCode: "tr",
        totalAreaSquareMeters: 1000,
        usableAreaSquareMeters: 800,
        maximumPalletCapacity: 500,
        maximumBinCapacity: 2000,
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 201);

  const rpcCall = calls.find(
    (call) =>
      call.url.pathname ===
      "/rest/v1/rpc/warehouse_create_write",
  );

  assert.ok(rpcCall);

  const body = JSON.parse(rpcCall.options.body);

  assert.equal(body.p_request_id, REQUEST_ID);
  assert.equal(body.p_account_id, ACCOUNT_ID);
  assert.equal(body.p_code, "YENI-DEPO");
  assert.equal(body.p_name, "Yeni Depo");
  assert.equal(body.p_country_code, "TR");
  assert.equal(body.p_total_area_square_meters, 1000);
  assert.equal(body.p_maximum_pallet_capacity, 500);
});

test("POST rejects invalid JSON with 400", async () => {
  const { fetchImpl } = mockFetch();

  const result = await onRequestPost(
    context(
      new Request(
        "https://www.istebul.com/api/warehouse/warehouses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
          },
          body: "{invalid-json",
        },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);
});

test("PATCH update calls warehouse_update_write", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPatch(
    context(
      request("PATCH", {
        requestId: REQUEST_ID,
        accountId: ACCOUNT_ID,
        warehouseId: WAREHOUSE_ID,
        name: "Güncellenmiş Depo",
        city: "Konya",
        maximumPalletCapacity: 600,
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);

  const rpcCall = calls.find(
    (call) =>
      call.url.pathname ===
      "/rest/v1/rpc/warehouse_update_write",
  );

  assert.ok(rpcCall);

  const body = JSON.parse(rpcCall.options.body);

  assert.equal(body.p_request_id, REQUEST_ID);
  assert.equal(body.p_account_id, ACCOUNT_ID);
  assert.equal(body.p_warehouse_id, WAREHOUSE_ID);
  assert.equal(body.p_name, "Güncellenmiş Depo");
  assert.equal(body.p_city, "Konya");
  assert.equal(body.p_maximum_pallet_capacity, 600);
});

test("PATCH status calls warehouse_change_status_write", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPatch(
    context(
      request("PATCH", {
        requestId: REQUEST_ID,
        accountId: ACCOUNT_ID,
        warehouseId: WAREHOUSE_ID,
        status: "temporarily_closed",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);

  const rpcCall = calls.find(
    (call) =>
      call.url.pathname ===
      "/rest/v1/rpc/warehouse_change_status_write",
  );

  assert.ok(rpcCall);

  const body = JSON.parse(rpcCall.options.body);

  assert.equal(body.p_request_id, REQUEST_ID);
  assert.equal(body.p_account_id, ACCOUNT_ID);
  assert.equal(body.p_warehouse_id, WAREHOUSE_ID);
  assert.equal(body.p_status, "temporarily_closed");
});

test("PATCH rejects invalid status with 400", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPatch(
    context(
      request("PATCH", {
        requestId: REQUEST_ID,
        accountId: ACCOUNT_ID,
        warehouseId: WAREHOUSE_ID,
        status: "deleted",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);

  const rpcCalls = calls.filter((call) =>
    call.url.pathname.startsWith("/rest/v1/rpc/"),
  );

  assert.equal(rpcCalls.length, 0);
});

test("PATCH rejects empty update patch with 400", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPatch(
    context(
      request("PATCH", {
        requestId: REQUEST_ID,
        accountId: ACCOUNT_ID,
        warehouseId: WAREHOUSE_ID,
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);

  const rpcCalls = calls.filter((call) =>
    call.url.pathname.startsWith("/rest/v1/rpc/"),
  );

  assert.equal(rpcCalls.length, 0);
});

test("PATCH rejects fractional pallet capacity with 400", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPatch(
    context(
      request("PATCH", {
        requestId: REQUEST_ID,
        accountId: ACCOUNT_ID,
        warehouseId: WAREHOUSE_ID,
        maximumPalletCapacity: 12.5,
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);

  const rpcCalls = calls.filter((call) =>
    call.url.pathname.startsWith("/rest/v1/rpc/"),
  );

  assert.equal(rpcCalls.length, 0);
});

test("RPC failure is converted to controlled API error", async () => {
  const { fetchImpl, calls } = mockFetch({
    rpcStatus: 409,
    rpcResponse: {
      message: "WAREHOUSE_DUPLICATE_CODE",
    },
  });

  const result = await onRequestPost(
    context(
      request("POST", {
        requestId: REQUEST_ID,
        accountId: ACCOUNT_ID,
        code: "ANA-DEPO",
        name: "Ana Depo",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 409);

  const payload = await result.json();

  assert.equal(
    payload.error?.message,
    "WAREHOUSE_DUPLICATE_CODE",
  );

  const rpcCall = calls.find(
    (call) =>
      call.url.pathname ===
      "/rest/v1/rpc/warehouse_create_write",
  );

  assert.ok(rpcCall);
});
