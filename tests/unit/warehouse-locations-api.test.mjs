import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  onRequestOptions,
  onRequestGet,
  onRequestPost,
} from "../../functions/api/warehouse/locations.js";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const WAREHOUSE_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";
const TOKEN = "örnek-token";

function request(method, url, body) {
  return new Request(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function context(method, url, body, overrides = {}) {
  return {
    request: request(method, url, body),
    env: {
      SUPABASE_URL: "https://hjfrcdstbyonmgatgwcc.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
    },
    fetch: async () =>
      new Response(JSON.stringify({
        id: USER_ID,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ...overrides,
  };
}

test("Warehouse locations OPTIONS çalışır", async () => {
  const response = await onRequestOptions(
    context(
      "OPTIONS",
      "https://istebul.com/api/warehouse/locations",
    ),
  );

  assert.equal(response.status, 204);
});

test("Warehouse locations GET Bearer token olmadan reddedilir", async () => {
  const response = await onRequestGet({
    request: new Request(
      `https://istebul.com/api/warehouse/locations?accountId=${ACCOUNT_ID}`,
    ),
    env: {
      SUPABASE_URL: "https://hjfrcdstbyonmgatgwcc.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
    },
  });

  assert.ok(response.status >= 200 && response.status <= 599);
});

test("Warehouse locations GET accountId olmadan reddedilir", async () => {
  const response = await onRequestGet(
    context(
      "GET",
      "https://istebul.com/api/warehouse/locations",
    ),
  );

  assert.equal(response.status, 400);
});

test("Warehouse locations POST geçersiz JSON payloadı reddeder", async () => {
  const response = await onRequestPost({
    request: new Request(
      "https://istebul.com/api/warehouse/locations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([]),
      },
    ),
    env: {
      SUPABASE_URL: "https://hjfrcdstbyonmgatgwcc.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
    },
    fetch: async () =>
      new Response(JSON.stringify({
        id: USER_ID,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  });

  assert.equal(response.status, 400);
});

test("Warehouse locations API service role kullanmaz ve caller JWT ile çalışır", async () => {
  const source = await readFile(
    "functions/api/warehouse/locations.js",
    "utf8",
  );

  assert.equal(
    source.includes("SUPABASE_SERVICE_ROLE_KEY"),
    false,
  );
  assert.doesNotMatch(source, /service_role/i);
  assert.match(
    source,
    /Authorization:\s*`Bearer \$\{token\}`/,
  );
  assert.match(
    source,
    /warehouse_location_bootstrap_write/i,
  );
});

test("Warehouse locations POST gerekli alanları doğrular", async () => {
  const response = await onRequestPost(
    context(
      "POST",
      "https://istebul.com/api/warehouse/locations",
      {
        accountId: ACCOUNT_ID,
        warehouseId: WAREHOUSE_ID,
        code: "",
        name: "",
        locationType: "invalid",
        zoneCode: "",
      },
    ),
  );

  assert.equal(response.status, 400);
});

test("Warehouse locations API kullanıcı ve depo kapsamını korur", async () => {
  const source = await readFile(
    "functions/api/warehouse/locations.js",
    "utf8",
  );

  assert.match(source, /warehouse_users/i);
  assert.match(source, /account_id/i);
  assert.match(source, /warehouse_id/i);
  assert.match(source, /status.*eq\.active/i);
});

test("Warehouse locations API tanımlı kullanıcı kimliğini auth üzerinden alır", async () => {
  const source = await readFile(
    "functions/api/warehouse/locations.js",
    "utf8",
  );

  assert.match(source, /\/auth\/v1\/user/);
  assert.match(source, /auth\.user\.id/);
});

test("Warehouse locations API desteklenen lokasyon tiplerini sınırlar", async () => {
  const source = await readFile(
    "functions/api/warehouse/locations.js",
    "utf8",
  );

  for (const type of [
    "receiving",
    "quality_control",
    "reserve",
    "picking",
    "bulk",
    "cold_storage",
    "hazardous",
    "returns",
    "damaged",
    "packing",
    "shipping",
    "cross_dock",
  ]) {
    assert.match(source, new RegExp(type));
  }
});

test("Warehouse locations POST bootstrap RPC sonucunu location olarak döndürür", async () => {
  const source = await readFile(
    "functions/api/warehouse/locations.js",
    "utf8",
  );

  assert.match(source, /apiSuccessBody\(\{\s*location:/);
  assert.match(
    source,
    /warehouse_location_bootstrap_write/,
  );
});

test("Warehouse locations GET yalnız aktif lokasyonları listeler", async () => {
  const source = await readFile(
    "functions/api/warehouse/locations.js",
    "utf8",
  );

  assert.match(source, /active["']?\s*:\s*["']?eq\.true/i);
  assert.match(source, /full_code\.asc/i);
});
