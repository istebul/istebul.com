import assert from "node:assert/strict";
import { test } from "node:test";
import {
  onRequestGet,
  onRequestOptions,
  onRequestPatch,
  onRequestPost,
} from "../../functions/api/warehouse/users.js";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "44444444-4444-4444-8444-444444444444";
const INVITED_ID = "55555555-5555-4555-8555-555555555555";
const WAREHOUSE_ID = "22222222-2222-4222-8222-222222222222";
const TOKEN = "test-token";
const SERVICE_KEY = "test-service-role-secret";
const ENV = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
};

function response(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function request(method, body, authorization = `Bearer ${TOKEN}`, url = "https://www.istebul.com/api/warehouse/users") {
  return new Request(url, {
    method,
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function context(requestObject, fetchImpl, env = ENV) {
  return { request: requestObject, env, fetch: fetchImpl };
}
function mockFetch({ list = { ok: true, users: [] }, validate = { ok: true }, upsert = { ok: true, user: { user_id: INVITED_ID } }, legacyConvert = { ok: true, role: "admin" }, inviteStatus = 200, invitePayload = { id: INVITED_ID }, validateStatus = 200, deleteStatus = 200 } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, options });
    if (parsed.pathname === "/auth/v1/user") return response({ id: USER_ID });
    if (parsed.pathname === "/rest/v1/rpc/warehouse_admin_list_users") return response(list, list?.ok === false ? 403 : 200);
    if (parsed.pathname === "/rest/v1/rpc/warehouse_admin_validate_user_request") return response(validate, validateStatus);
    if (parsed.pathname === "/rest/v1/rpc/warehouse_admin_convert_own_legacy_owner") return response(legacyConvert, legacyConvert?.ok === false ? 403 : 200);
    if (parsed.pathname === "/rest/v1/rpc/warehouse_admin_upsert_user") return response(upsert, upsert?.ok === false ? 400 : 200);
    if (parsed.pathname === "/auth/v1/invite") return response(invitePayload, inviteStatus);
    if (parsed.pathname === "/auth/v1/admin/users" && options.method === "POST") return response({ id: INVITED_ID });
    if (parsed.pathname.startsWith("/auth/v1/admin/users/") && options.method === "DELETE") return response({ id: INVITED_ID }, deleteStatus);
    return response({ message: `unexpected request ${parsed.pathname}` }, 500);
  };
  return { fetchImpl, calls };
}

const validBody = (overrides = {}) => ({
  accountId: ACCOUNT_ID,
  email: "worker@example.com",
  displayName: "Depo Kullanıcısı",
  role: "receiver",
  status: "invited",
  permissions: ["receiving"],
  warehouseIds: [WAREHOUSE_ID],
  ...overrides,
});

test("OPTIONS returns 204 and discloses no cacheable response", async () => {
  const result = await onRequestOptions();
  assert.equal(result.status, 204);
  assert.equal(result.headers.get("Cache-Control"), "no-store, max-age=0");
});

test("GET without a bearer token returns 401 without contacting Supabase", async () => {
  let called = false;
  const result = await onRequestGet(context(request("GET", undefined, null), async () => { called = true; return response({}); }));
  assert.equal(result.status, 401);
  assert.equal(called, false);
});

test("GET rejects malformed account id", async () => {
  const { fetchImpl } = mockFetch();
  const result = await onRequestGet(context(request("GET", undefined, `Bearer ${TOKEN}`, "https://www.istebul.com/api/warehouse/users?accountId=bad"), fetchImpl));
  assert.equal(result.status, 400);
});

test("GET delegates admin authorization to the protected database RPC", async () => {
  const { fetchImpl } = mockFetch({ list: { message: "warehouse_admin_required", code: "42501" } });
  const result = await onRequestGet(context(request("GET", undefined, `Bearer ${TOKEN}`, `https://www.istebul.com/api/warehouse/users?accountId=${ACCOUNT_ID}`), fetchImpl));
  assert.equal(result.status, 403);
  assert.equal((await result.json()).error.code, "admin_required");
});

test("POST permits only the narrow self-conversion RPC for a legacy owner", async () => {
  const { fetchImpl, calls } = mockFetch();
  const result = await onRequestPost(context(request("POST", {
    action: "convert_own_legacy_owner",
    accountId: ACCOUNT_ID,
  }), fetchImpl));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).role, "admin");
  assert.equal(calls.some((call) => call.url.pathname === "/rest/v1/rpc/warehouse_admin_convert_own_legacy_owner"), true);
  assert.equal(calls.some((call) => call.url.pathname === "/auth/v1/invite"), false);
});

test("legacy role conversion is rejected when the signed-in user is not an active owner", async () => {
  const { fetchImpl } = mockFetch({ legacyConvert: { message: "warehouse_legacy_owner_required", code: "42501" } });
  const result = await onRequestPost(context(request("POST", {
    action: "convert_own_legacy_owner",
    accountId: ACCOUNT_ID,
  }), fetchImpl));
  assert.equal(result.status, 403);
  assert.equal((await result.json()).error.code, "legacy_owner_not_found");
});

test("POST refuses owner and never sends an Auth invitation", async () => {
  const { fetchImpl, calls } = mockFetch();
  const result = await onRequestPost(context(request("POST", validBody({ role: "owner" })), fetchImpl));
  assert.equal(result.status, 400);
  assert.equal((await result.json()).error.code, "role_invalid");
  assert.equal(calls.some((call) => call.url.pathname === "/auth/v1/invite"), false);
});

test("POST creates an immediately active account with an admin-set password", async () => {
  const password = "Warehouse-Test-2026!";
  const { fetchImpl, calls } = mockFetch();
  const result = await onRequestPost(context(request("POST", validBody({
    action: "create_with_password",
    password,
  })), fetchImpl));

  assert.equal(result.status, 201);
  const body = await result.json();
  assert.equal(body.ok, true);
  assert.equal(body.creationMode, "password");
  assert.equal(JSON.stringify(body).includes(password), false);

  const authCreate = calls.find((call) =>
    call.url.pathname === "/auth/v1/admin/users" && call.options.method === "POST");
  assert.ok(authCreate);
  assert.equal(authCreate.options.headers.Authorization, `Bearer ${SERVICE_KEY}`);
  const authPayload = JSON.parse(authCreate.options.body);
  assert.equal(authPayload.email, "worker@example.com");
  assert.equal(authPayload.password, password);
  assert.equal(authPayload.email_confirm, true);
  assert.equal(calls.some((call) => call.url.pathname === "/auth/v1/invite"), false);

  const upsert = calls.find((call) =>
    call.url.pathname === "/rest/v1/rpc/warehouse_admin_upsert_user");
  assert.equal(JSON.parse(upsert.options.body).target_user_id, INVITED_ID);
  assert.equal(JSON.parse(upsert.options.body).target_status, "active");
});

test("POST rejects a short initial password before creating an Auth identity", async () => {
  const { fetchImpl, calls } = mockFetch();
  const result = await onRequestPost(context(request("POST", validBody({
    action: "create_with_password",
    password: "short",
  })), fetchImpl));

  assert.equal(result.status, 400);
  assert.equal((await result.json()).error.code, "password_invalid");
  assert.equal(calls.some((call) => call.url.pathname === "/auth/v1/admin/users"), false);
});

test("POST creates an invited membership after Supabase Auth invite succeeds", async () => {
  const { fetchImpl, calls } = mockFetch();
  const result = await onRequestPost(context(request("POST", validBody()), fetchImpl));
  assert.equal(result.status, 201);
  assert.equal((await result.json()).ok, true);
  const invite = calls.find((call) => call.url.pathname === "/auth/v1/invite");
  assert.equal(invite.options.headers.Authorization, `Bearer ${SERVICE_KEY}`);
  const upsert = calls.find((call) => call.url.pathname === "/rest/v1/rpc/warehouse_admin_upsert_user");
  assert.equal(JSON.parse(upsert.options.body).target_user_id, INVITED_ID);
  assert.equal(JSON.parse(upsert.options.body).target_status, "invited");
  assert.equal(result.headers.get("Cache-Control"), "no-store, max-age=0");
});

test("POST detects an existing account membership and does not reinvite it", async () => {
  const { fetchImpl, calls } = mockFetch({ list: { ok: true, users: [{ auth_email: "worker@example.com" }] } });
  const result = await onRequestPost(context(request("POST", validBody()), fetchImpl));
  assert.equal(result.status, 409);
  assert.equal((await result.json()).error.code, "membership_exists");
  assert.equal(calls.some((call) => call.url.pathname === "/auth/v1/invite"), false);
});

test("PATCH reports last active admin protection from database validation", async () => {
  const { fetchImpl } = mockFetch({
    validate: { message: "warehouse_last_active_admin", code: "23514" },
    validateStatus: 400,
  });
  const result = await onRequestPatch(context(request("PATCH", validBody({
    userId: USER_ID,
    email: undefined,
    role: "viewer",
    status: "inactive",
    permissions: [],
    warehouseIds: [],
  })), fetchImpl));
  assert.equal(result.status, 409);
  assert.equal((await result.json()).error.code, "last_active_admin");
});

test("PATCH rejects cross-account warehouse assignment", async () => {
  const { fetchImpl } = mockFetch({
    validate: { message: "warehouse_assignment_out_of_account", code: "22023" },
    validateStatus: 400,
  });
  const result = await onRequestPatch(context(request("PATCH", validBody({ userId: INVITED_ID })), fetchImpl));
  assert.equal(result.status, 400);
  assert.equal((await result.json()).error.code, "warehouse_assignment_invalid");
});

test("failed membership write compensates the newly created password Auth identity", async () => {
  const password = "Warehouse-Test-2026!";
  const { fetchImpl, calls } = mockFetch({
    upsert: { message: "warehouse_user_email_required", code: "22023" },
  });

  const result = await onRequestPost(context(request("POST", validBody({
    action: "create_with_password",
    password,
  })), fetchImpl));

  assert.equal(result.status, 400);
  const responseBody = await result.json();
  assert.equal(JSON.stringify(responseBody).includes(password), false);

  const authCreate = calls.find((call) =>
    call.url.pathname === "/auth/v1/admin/users" && call.options.method === "POST");
  assert.ok(authCreate);
  assert.equal(JSON.parse(authCreate.options.body).password, password);

  assert.equal(calls.some((call) =>
    call.options.method === "DELETE" &&
    call.url.pathname === `/auth/v1/admin/users/${INVITED_ID}`), true);
});



test("Auth cleanup failure returns 502", async () => {
  const { fetchImpl, calls } = mockFetch({
    upsert: { message: "warehouse_user_email_required", code: "22023" },
    deleteStatus: 500,
  });
  const result = await onRequestPost(context(request("POST", validBody({
    action: "create_with_password",
    password: "Warehouse-Test-2026!",
  })), fetchImpl));

  assert.equal(result.status, 502);
  const deletion = calls.find((call) =>
    call.options.method === "DELETE" &&
    call.url.pathname === `/auth/v1/admin/users/${INVITED_ID}`);
  assert.ok(deletion);
  assert.equal((await response({}, 500)).status, 500);
});

test("failed membership write compensates the newly invited Auth identity", async () => {
  const { fetchImpl, calls } = mockFetch({ upsert: { message: "warehouse_user_email_required", code: "22023" } });
  const result = await onRequestPost(context(request("POST", validBody()), fetchImpl));
  assert.equal(result.status, 400);
  assert.equal(calls.some((call) => call.options.method === "DELETE" && call.url.pathname === `/auth/v1/admin/users/${INVITED_ID}`), true);
});
