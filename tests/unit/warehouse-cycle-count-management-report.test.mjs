import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  handleReportRequest,
  mapManagementRpcStatus,
  normalizeReportRequest,
} from "../../functions/api/warehouse/cycle-count-report.js";

const MIGRATION =
  fs.readFileSync(
    "supabase/migrations/20260814013000_warehouse_cycle_count_management_read.sql",
    "utf8"
  );

const API =
  fs.readFileSync(
    "functions/api/warehouse/cycle-count-report.js",
    "utf8"
  );

const ACCOUNT_ID =
  "22222222-2222-4222-8222-222222222222";

const WAREHOUSE_ID =
  "33333333-3333-4333-8333-333333333333";

const COUNT_ID =
  "44444444-4444-4444-8444-444444444444";

const USER_ID =
  "55555555-5555-4555-8555-555555555555";

const ENV = {
  SUPABASE_URL:
    "https://warehouse.test",
  SUPABASE_ANON_KEY:
    "anon-key",
};

function makeRequest({
  countId = COUNT_ID,
  token = "caller-jwt",
  method = "GET",
} = {}) {
  const url =
    new URL(
      "https://istebul.com/api/warehouse/cycle-count-report"
    );

  url.searchParams.set(
    "accountId",
    ACCOUNT_ID
  );

  url.searchParams.set(
    "warehouseId",
    WAREHOUSE_ID
  );

  if (countId !== null) {
    url.searchParams.set(
      "cycleCountId",
      countId
    );
  }

  const headers =
    new Headers({
      Origin:
        "https://istebul.com",
    });

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  return new Request(
    url,
    {
      method,
      headers,
    }
  );
}

test("management RPC SECURITY DEFINER ve caller JWT kullanır", () => {
  assert.match(
    MIGRATION,
    /warehouse_cycle_count_management_read/i
  );

  assert.match(
    MIGRATION,
    /security definer/i
  );

  assert.match(
    MIGRATION,
    /auth\.uid\(\)/i
  );
});

test("management read yalnız yönetim rollerine açıktır", () => {
  for (
    const role of [
      "owner",
      "admin",
      "warehouse_manager",
      "supervisor",
      "inventory_controller",
    ]
  ) {
    assert.match(
      MIGRATION,
      new RegExp(
        `'${role}'`
      )
    );
  }

  assert.doesNotMatch(
    MIGRATION,
    /'operator'/
  );
});

test("management read account warehouse scope zorunludur", () => {
  assert.match(
    MIGRATION,
    /p_account_id is null[\s\S]*p_warehouse_id is null/i
  );

  assert.match(
    MIGRATION,
    /warehouse_id\s*=\s*p_warehouse_id/i
  );
});

test("liste modu aktif lifecycle sayımları ve immutable reports döndürür", () => {
  for (
    const status of [
      "in_progress",
      "counted",
      "recount_required",
      "under_review",
      "approved",
      "adjusted",
    ]
  ) {
    assert.match(
      MIGRATION,
      new RegExp(
        `'${status}'`
      )
    );
  }

  assert.match(
    MIGRATION,
    /warehouse_cycle_count_reports/i
  );

  assert.match(
    MIGRATION,
    /'activeCounts'/i
  );

  assert.match(
    MIGRATION,
    /'reports'/i
  );
});

test("completed detail immutable snapshotı doğrudan kullanır", () => {
  assert.match(
    MIGRATION,
    /v_count\.status = 'completed'/i
  );

  assert.match(
    MIGRATION,
    /'mode',\s*'report'/i
  );

  assert.match(
    MIGRATION,
    /r\.summary/i
  );

  assert.match(
    MIGRATION,
    /r\.items/i
  );
});

test("active management preview hassas sayım alanlarını yönetim için içerir", () => {
  for (
    const key of [
      "expectedQuantity",
      "firstCountQuantity",
      "secondCountQuantity",
      "finalCountQuantity",
      "damagedQuantity",
      "varianceQuantity",
      "variancePercentage",
      "varianceValue",
      "unitCost",
      "countedBy",
      "recountedBy",
      "approvedBy",
    ]
  ) {
    assert.match(
      MIGRATION,
      new RegExp(
        `'${key}'`
      )
    );
  }
});

test("management preview gerçek location product sku metadata kullanır", () => {
  assert.match(
    MIGRATION,
    /warehouse_locations/i
  );

  assert.match(
    MIGRATION,
    /l\.full_code/i
  );

  assert.match(
    MIGRATION,
    /warehouse_products/i
  );

  assert.match(
    MIGRATION,
    /p\.code/i
  );

  assert.match(
    MIGRATION,
    /warehouse_product_skus/i
  );

  assert.match(
    MIGRATION,
    /s\.sku_code/i
  );
});

test("management preview adjustment approval ve exception lifecycle döndürür", () => {
  assert.match(
    MIGRATION,
    /warehouse_cycle_count_adjustments/i
  );

  assert.match(
    MIGRATION,
    /warehouse_cycle_count_approvals/i
  );

  assert.match(
    MIGRATION,
    /warehouse_cycle_count_exceptions/i
  );

  assert.match(
    MIGRATION,
    /'adjustments'/i
  );

  assert.match(
    MIGRATION,
    /'approvals'/i
  );

  assert.match(
    MIGRATION,
    /'exceptions'/i
  );
});

test("management read hiçbir inventory mutation yapmaz", () => {
  assert.doesNotMatch(
    MIGRATION,
    /update\s+public\.warehouse_inventory_balances/i
  );

  assert.doesNotMatch(
    MIGRATION,
    /insert\s+into\s+public\.warehouse_inventory_movements/i
  );

  assert.doesNotMatch(
    MIGRATION,
    /delete\s+from/i
  );
});

test("management RPC public anon kapalı authenticated execute alır", () => {
  assert.match(
    MIGRATION,
    /from public;/i
  );

  assert.match(
    MIGRATION,
    /from anon;/i
  );

  assert.match(
    MIGRATION,
    /to authenticated;/i
  );
});

test("report request cycleCountId olmadan liste moduna izin verir", () => {
  const url =
    new URL(
      "https://istebul.com/api/warehouse/cycle-count-report"
    );

  url.searchParams.set(
    "accountId",
    ACCOUNT_ID
  );

  url.searchParams.set(
    "warehouseId",
    WAREHOUSE_ID
  );

  const normalized =
    normalizeReportRequest(url);

  assert.equal(
    normalized.ok,
    true
  );

  assert.equal(
    normalized.data.cycleCountId,
    null
  );
});

test("report request geçersiz cycleCountId reddeder", () => {
  const url =
    new URL(
      "https://istebul.com/api/warehouse/cycle-count-report"
    );

  url.searchParams.set(
    "accountId",
    ACCOUNT_ID
  );

  url.searchParams.set(
    "warehouseId",
    WAREHOUSE_ID
  );

  url.searchParams.set(
    "cycleCountId",
    "invalid"
  );

  assert.deepEqual(
    normalizeReportRequest(url),
    {
      ok: false,
      reason:
        "cycle_count_id_invalid",
    }
  );
});

test("Bearer olmadan report upstream çağrısı yapılmaz", async () => {
  let calls = 0;

  const response =
    await handleReportRequest(
      {
        request:
          makeRequest({
            token: null,
          }),
        env: ENV,
      },
      async () => {
        calls += 1;
        throw new Error(
          "çağrılmamalı"
        );
      }
    );

  assert.equal(
    response.status,
    401
  );

  assert.equal(
    calls,
    0
  );
});

test("başarılı report GET caller JWT ile yalnız management RPC çağırır", async () => {
  const calls = [];

  const fetchImpl =
    async (
      url,
      options = {}
    ) => {
      calls.push({
        url:
          String(url),
        options,
      });

      const path =
        new URL(url).pathname;

      if (
        path ===
        "/auth/v1/user"
      ) {
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
          }
        );
      }

      if (
        path ===
        "/rest/v1/rpc/warehouse_cycle_count_management_read"
      ) {
        return new Response(
          JSON.stringify({
            mode:
              "report",
            report: {
              cycleCountId:
                COUNT_ID,
              status:
                "completed",
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }

      throw new Error(
        `Beklenmeyen URL: ${url}`
      );
    };

  const response =
    await handleReportRequest(
      {
        request:
          makeRequest(),
        env: ENV,
      },
      fetchImpl
    );

  assert.equal(
    response.status,
    200
  );

  assert.equal(
    calls.length,
    2
  );

  const rpc =
    calls[1];

  assert.equal(
    new URL(
      rpc.url
    ).pathname,
    "/rest/v1/rpc/warehouse_cycle_count_management_read"
  );

  assert.equal(
    rpc.options.headers
      .apikey,
    ENV.SUPABASE_ANON_KEY
  );

  assert.equal(
    rpc.options.headers
      .Authorization,
    "Bearer caller-jwt"
  );

  assert.deepEqual(
    JSON.parse(
      rpc.options.body
    ),
    {
      p_account_id:
        ACCOUNT_ID,
      p_warehouse_id:
        WAREHOUSE_ID,
      p_cycle_count_id:
        COUNT_ID,
    }
  );
});

test("report API lifecycle ve güvenlik hata kodlarını map eder", () => {
  assert.equal(
    mapManagementRpcStatus({
      code: "22023",
    }),
    400
  );

  assert.equal(
    mapManagementRpcStatus({
      code: "28000",
    }),
    401
  );

  assert.equal(
    mapManagementRpcStatus({
      code: "42501",
    }),
    403
  );

  assert.equal(
    mapManagementRpcStatus({
      code: "P0002",
    }),
    404
  );

  assert.equal(
    mapManagementRpcStatus({
      code: "55000",
    }),
    409
  );

  assert.equal(
    mapManagementRpcStatus({
      code: "XX000",
    }),
    500
  );
});

test("report API service role veya doğrudan hassas tablo endpointi açmaz", () => {
  assert.match(
    API,
    /warehouse_cycle_count_management_read/
  );

  assert.match(
    API,
    /SUPABASE_ANON_KEY/
  );

  assert.doesNotMatch(
    API,
    /SERVICE_ROLE|service_role|SUPABASE_SERVICE/i
  );

  assert.doesNotMatch(
    API,
    /\/rest\/v1\/warehouse_cycle_count_(?:items|adjustments|approvals|reports|exceptions)/i
  );
});

test("report HTTP cache kapalı ve yalnız GET OPTIONS açar", () => {
  assert.match(
    API,
    /private, no-store/
  );

  assert.match(
    API,
    /GET, OPTIONS/
  );
});
