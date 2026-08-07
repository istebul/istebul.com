import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  extractBearerToken,
  normalizeUuid,
  selectAuthorizedAccount
} from "../../functions/api/warehouse/operations-center.js";

test("WarehouseIQ API Bearer tokenı ayıklar", () => {
  const request = new Request("https://istebul.com/api/warehouse/operations-center", {
    headers: { Authorization: "Bearer örnek-token" }
  });
  assert.equal(extractBearerToken(request), "örnek-token");
  assert.equal(extractBearerToken(new Request("https://istebul.com/api/warehouse/operations-center")), null);
});

test("WarehouseIQ API UUID doğrular", () => {
  assert.equal(normalizeUuid("11111111-1111-4111-8111-111111111111"), "11111111-1111-4111-8111-111111111111");
  assert.equal(normalizeUuid("firma-1"), null);
});

test("WarehouseIQ API yalnız aktif üyelikten firma seçer", () => {
  const membership = {
    account_id: "11111111-1111-4111-8111-111111111111",
    role: "warehouse_manager",
    status: "active"
  };
  const result = selectAuthorizedAccount([membership], membership.account_id);
  assert.equal(result.ok, true);
  assert.deepEqual(result.membership, membership);
});

test("WarehouseIQ API yetkisiz firma seçimini reddeder", () => {
  const result = selectAuthorizedAccount([
    {
      account_id: "11111111-1111-4111-8111-111111111111",
      role: "viewer",
      status: "active"
    }
  ], "22222222-2222-4222-8222-222222222222");
  assert.deepEqual(result, { ok: false, reason: "account_forbidden" });
});

test("WarehouseIQ API servis rolü kullanmaz ve kullanıcı JWT'sini RLS için iletir", async () => {
  const source = await readFile("functions/api/warehouse/operations-center.js", "utf8");
  assert.equal(source.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
  assert.match(source, /Authorization:\s*`Bearer \$\{token\}`/);
  assert.match(source, /warehouse_users/);
  assert.match(source, /status:\s*"eq\.active"/);
  assert.match(source, /onRequestGet/);
  assert.match(source, /onRequestOptions/);
  assert.equal(source.includes("onRequestPost"), false);
});
