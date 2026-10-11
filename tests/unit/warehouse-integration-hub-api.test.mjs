import assert from "node:assert/strict";
import test from "node:test";

import {
  onRequestDelete,
  onRequestGet,
  onRequestOptions,
  onRequestPatch,
  onRequestPost,
} from "../../functions/api/warehouse/integration-hub.js";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const INTEGRATION_ID = "22222222-2222-4222-8222-222222222222";
const NEW_INTEGRATION_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";
const SECRET_ID = "55555555-5555-4555-8555-555555555555";
const TOKEN = "test-token";
const CREDENTIAL = "test-erp-credential-never-return-this";

const ENV = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
};

const INTEGRATION = {
  id: INTEGRATION_ID,
  account_id: ACCOUNT_ID,
  name: "Test REST",
  connector_key: "custom_rest",
  provider_name: "Test ERP",
  status: "draft",
  auth_type: "api_key",
  base_url: "https://erp.example.test/api",
  config: { auth: { headerName: "X-API-Key" } },
  credential_secret_id: SECRET_ID,
  last_test_at: null,
  last_success_at: null,
  last_error: null,
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
};

const CONNECTOR = {
  connector_key: "custom_rest",
  display_name: "Özel REST",
  category: "custom",
  implementation_status: "available",
  config_schema: {},
};

function response(body, status = 200) {
  return new Response(
    body === null ? null : JSON.stringify(body),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function request(method, options = {}, legacyOptions = undefined) {
  let settings;

  if (legacyOptions !== undefined) {
    settings = { ...legacyOptions, body: options };
  } else if (
    Object.keys(options).length === 0 ||
    ["body", "query", "authorization", "origin"].some(
      (key) => Object.hasOwn(options, key),
    )
  ) {
    settings = options;
  } else {
    settings = { body: options };
  }

  const {
    body,
    query = "",
    authorization = `Bearer ${TOKEN}`,
    origin = "https://www.istebul.com",
  } = settings;

  const url =
    `https://www.istebul.com/api/warehouse/integration-hub${query}`;

  return new Request(url, {
    method,
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
      Origin: origin,
      ...(body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function context(requestObject, fetchImpl) {
  return {
    request: requestObject,
    env: ENV,
    fetch: fetchImpl,
  };
}

function mockFetch({
  role = "admin",
  integrations = [INTEGRATION],
  connectors = [CONNECTOR],
  userStatus = 200,
  membershipRows = null,
} = {}) {
  const calls = [];

  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    const method = options.method || "GET";

    calls.push({ url: parsed, options, method });

    if (parsed.hostname === "erp.example.test") {
      return response(null, 204);
    }

    if (parsed.pathname === "/auth/v1/user") {
      return response({ id: USER_ID }, userStatus);
    }

    if (parsed.pathname === "/rest/v1/warehouse_users") {
      return response(
        membershipRows ?? [{
          account_id: ACCOUNT_ID,
          role,
          status: "active",
        }],
      );
    }

    if (parsed.pathname === "/rest/v1/warehouse_integration_connectors") {
      const keyFilter = parsed.searchParams.get("connector_key");
      const rows = keyFilter
        ? connectors.filter(
            (item) => `eq.${item.connector_key}` === keyFilter,
          )
        : connectors;

      return response(rows);
    }

    if (
      parsed.pathname ===
      "/rest/v1/warehouse_integration_capabilities"
    ) {
      if (method === "POST") {
        const input = JSON.parse(options.body);
        return response([{
          id: "66666666-6666-4666-8666-666666666666",
          ...input,
          updated_at: "2026-10-09T10:00:00Z",
        }]);
      }

      return response([]);
    }

    if (parsed.pathname === "/rest/v1/warehouse_integrations") {
      if (method === "POST") {
        const input = JSON.parse(options.body);
        return response([{
          ...INTEGRATION,
          ...input,
          id: NEW_INTEGRATION_ID,
          credential_secret_id: null,
        }], 201);
      }

      if (method === "PATCH") {
        const input = JSON.parse(options.body);
        return response([{
          ...INTEGRATION,
          ...input,
        }]);
      }

      const idFilter = parsed.searchParams.get("id");
      const accountFilter = parsed.searchParams.get("account_id");

      const rows = integrations.filter((item) => {
        if (idFilter && idFilter !== `eq.${item.id}`) return false;
        if (
          accountFilter &&
          accountFilter !== `eq.${item.account_id}`
        ) return false;
        return true;
      });

      return response(rows);
    }

    if (parsed.pathname ===
        "/rest/v1/rpc/warehouse_integration_set_credential") {
      return response(SECRET_ID);
    }

    if (parsed.pathname ===
        "/rest/v1/rpc/warehouse_integration_detach_credential") {
      return response(true);
    }

    return response({ message: "unexpected request" }, 500);
  };

  return { fetchImpl, calls };
}

test("OPTIONS gerekli yöntemleri ve no-store başlıklarını bildirir", async () => {
  const { fetchImpl } = mockFetch();
  const result = await onRequestOptions(
    context(request("OPTIONS"), fetchImpl),
  );

  assert.equal(result.status, 204);
  assert.match(
    result.headers.get("Access-Control-Allow-Methods") || "",
    /GET.*POST.*PATCH.*DELETE.*OPTIONS/,
  );
  assert.equal(
    result.headers.get("Cache-Control"),
    "private, no-store",
  );
});

test("Bearer token olmadan 401 döner ve Supabase çağrısı yapılmaz", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestGet(
    context(
      request("GET", {
        query: `?accountId=${ACCOUNT_ID}`,
        authorization: null,
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 401);
  assert.equal(calls.length, 0);
});

test("GET entegrasyonları ve katalog verisini firma kapsamında döndürür", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestGet(
    context(
      request("GET", {
        query: `?accountId=${ACCOUNT_ID}`,
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);

  const payload = await result.json();
  assert.equal(payload.data.integrations.length, 1);
  assert.equal(payload.data.integrations[0].id, INTEGRATION_ID);
  assert.equal(payload.data.integrations[0].has_credential, true);
  assert.equal(payload.data.connectors[0].connector_key, "custom_rest");

  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("credential_secret_id"), false);
  assert.equal(serialized.includes(SECRET_ID), false);
  assert.equal(serialized.includes(CREDENTIAL), false);
  assert.equal(serialized.includes("credential_ref"), false);

  const integrationCall = calls.find(
    (call) =>
      call.url.pathname === "/rest/v1/warehouse_integrations",
  );

  assert.ok(integrationCall);
  assert.equal(
    integrationCall.url.searchParams.get("account_id"),
    `eq.${ACCOUNT_ID}`,
  );
  assert.equal(
    integrationCall.options.headers.Authorization,
    `Bearer ${TOKEN}`,
  );
  assert.equal(
    integrationCall.options.headers.apikey,
    ENV.SUPABASE_ANON_KEY,
  );
});

test("GET warehouse_manager rolüne RLS kapsamında izin verir", async () => {
  const { fetchImpl } = mockFetch({ role: "warehouse_manager" });

  const result = await onRequestGet(
    context(
      request("GET", {
        query: `?accountId=${ACCOUNT_ID}`,
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);
});

test("POST owner rolünü reddeder ve entegrasyon yazmaz", async () => {
  const { fetchImpl, calls } = mockFetch({ role: "owner" });

  const result = await onRequestPost(
    context(
      request("POST", {
        accountId: ACCOUNT_ID,
        name: "Test REST",
        connectorKey: "custom_rest",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 403);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname === "/rest/v1/warehouse_integrations" &&
        call.method === "POST",
    ),
    false,
  );
});

test("POST warehouse_manager rolünü reddeder", async () => {
  const { fetchImpl, calls } = mockFetch({
    role: "warehouse_manager",
  });

  const result = await onRequestPost(
    context(
      request("POST", {
        accountId: ACCOUNT_ID,
        name: "Test REST",
        connectorKey: "custom_rest",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 403);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname === "/rest/v1/warehouse_integrations" &&
        call.method === "POST",
    ),
    false,
  );
});

test("POST admin ile taslak entegrasyon oluşturur", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request("POST", {
        accountId: ACCOUNT_ID,
        name: "Yeni REST",
        connectorKey: "custom_rest",
        providerName: "ERP",
        authType: "api_key",
        baseUrl: "https://erp.example.test/api",
        config: { auth: { headerName: "X-API-Key" } },
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 201);

  const payload = await result.json();
  assert.equal(payload.data.integration.id, NEW_INTEGRATION_ID);
  assert.equal(payload.data.integration.status, "draft");
  assert.equal(payload.data.integration.has_credential, false);
  assert.equal(
    Object.hasOwn(payload.data.integration, "credential_secret_id"),
    false,
  );

  const createCall = calls.find(
    (call) =>
      call.url.pathname === "/rest/v1/warehouse_integrations" &&
      call.method === "POST",
  );

  assert.ok(createCall);
  assert.equal(
    createCall.options.headers.Prefer,
    "return=representation",
  );

  const body = JSON.parse(createCall.options.body);
  assert.equal(body.account_id, ACCOUNT_ID);
  assert.equal(body.connector_key, "custom_rest");
  assert.equal(body.status, "draft");
  assert.equal(Object.hasOwn(body, "credential_ref"), false);
});

test("POST bilinmeyen alanları reddeder", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request("POST", {
        accountId: ACCOUNT_ID,
        name: "Yeni REST",
        connectorKey: "custom_rest",
        credential_ref: "legacy-secret",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname === "/rest/v1/warehouse_integrations" &&
        call.method === "POST",
    ),
    false,
  );
});

test("PATCH admin ile sınırlı alanı günceller", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPatch(
    context(
      request("PATCH", {
        accountId: ACCOUNT_ID,
        integrationId: INTEGRATION_ID,
        status: "inactive",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);

  const payload = await result.json();
  assert.equal(payload.data.integration.status, "inactive");

  const patchCall = calls.find(
    (call) =>
      call.url.pathname === "/rest/v1/warehouse_integrations" &&
      call.method === "PATCH",
  );

  assert.ok(patchCall);
  assert.equal(
    patchCall.url.searchParams.get("account_id"),
    `eq.${ACCOUNT_ID}`,
  );
  assert.equal(
    JSON.parse(patchCall.options.body).status,
    "inactive",
  );
});

test("Credential RPC secret değerini response'a döndürmez", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request("POST", {
        integrationId: INTEGRATION_ID,
        secret: CREDENTIAL,
      }, {
        query: "?action=set-credential",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);

  const payload = await result.json();
  assert.equal(payload.data.hasCredential, true);
  assert.equal(payload.data.integrationId, INTEGRATION_ID);

  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes(CREDENTIAL), false);
  assert.equal(serialized.includes(SECRET_ID), false);

  const rpcCall = calls.find(
    (call) =>
      call.url.pathname ===
      "/rest/v1/rpc/warehouse_integration_set_credential",
  );

  assert.ok(rpcCall);
  assert.equal(
    JSON.parse(rpcCall.options.body).p_secret,
    CREDENTIAL,
  );
  assert.equal(
    rpcCall.options.headers.Authorization,
    `Bearer ${TOKEN}`,
  );
});

test("DELETE entegrasyonu fiziksel silmek yerine pasife alır", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestDelete(
    context(
      request("DELETE", {
        query: `?accountId=${ACCOUNT_ID}&integrationId=${INTEGRATION_ID}`,
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);

  const payload = await result.json();
  assert.equal(payload.data.deactivated, true);
  assert.equal(payload.data.integration.status, "inactive");

  const integrationCalls = calls.filter(
    (call) =>
      call.url.pathname === "/rest/v1/warehouse_integrations",
  );

  assert.equal(
    integrationCalls.some((call) => call.method === "DELETE"),
    false,
  );

  const patchCall = integrationCalls.find(
    (call) => call.method === "PATCH",
  );

  assert.ok(patchCall);
  assert.equal(
    JSON.parse(patchCall.options.body).status,
    "inactive",
  );
});

test("POST config içine credential benzeri alanları kabul etmez", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request("POST", {
        accountId: ACCOUNT_ID,
        name: "Güvensiz REST",
        connectorKey: "custom_rest",
        config: {
          auth: {
            headerName: "X-API-Key",
            token: "must-not-be-stored-here",
          },
        },
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname === "/rest/v1/warehouse_integrations" &&
        call.method === "POST",
    ),
    false,
  );
});

test("GET beklenmeyen config alanlarını response üzerinden çıkarır", async () => {
  const { fetchImpl } = mockFetch({
    integrations: [{
      ...INTEGRATION,
      config: {
        auth: {
          headerName: "X-API-Key",
          token: "must-not-leak",
        },
      },
    }],
  });

  const result = await onRequestGet(
    context(
      request("GET", {
        query: `?accountId=${ACCOUNT_ID}`,
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);

  const payload = await result.json();
  const item = payload.data.integrations[0];

  assert.deepEqual(item.config, {});
  assert.equal(
    JSON.stringify(payload).includes("must-not-leak"),
    false,
  );
});

test("PATCH genel durum değişikliği ile active durumunu reddeder", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPatch(
    context(
      request("PATCH", {
        accountId: ACCOUNT_ID,
        integrationId: INTEGRATION_ID,
        status: "active",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname === "/rest/v1/warehouse_integrations" &&
        call.method === "PATCH",
    ),
    false,
  );
});

test("POST HTTP URL adresini reddeder", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request("POST", {
        accountId: ACCOUNT_ID,
        name: "HTTP REST",
        connectorKey: "custom_rest",
        authType: "api_key",
        baseUrl: "http://erp.example.test/api",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname === "/rest/v1/warehouse_integrations" &&
        call.method === "POST",
    ),
    false,
  );
});

test("POST URL içine gömülü kullanıcı adı ve parolayı reddeder", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request("POST", {
        accountId: ACCOUNT_ID,
        name: "Credential URL",
        connectorKey: "custom_rest",
        authType: "api_key",
        baseUrl: "https://user:password@erp.example.test/api",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname === "/rest/v1/warehouse_integrations" &&
        call.method === "POST",
    ),
    false,
  );
});

test("POST localhost hedefini reddeder", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request("POST", {
        accountId: ACCOUNT_ID,
        name: "Local REST",
        connectorKey: "custom_rest",
        authType: "api_key",
        baseUrl: "https://localhost/api",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname === "/rest/v1/warehouse_integrations" &&
        call.method === "POST",
    ),
    false,
  );
});

test("POST custom_rest için uygulanmayan auth tipini reddeder", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request("POST", {
        accountId: ACCOUNT_ID,
        name: "Unsupported Auth",
        connectorKey: "custom_rest",
        authType: "basic",
        baseUrl: "https://erp.example.test/api",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname === "/rest/v1/warehouse_integrations" &&
        call.method === "POST",
    ),
    false,
  );
});

test("credential detach yalnızca atomik RPC kullanır", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request("POST", {
        integrationId: INTEGRATION_ID,
      }, {
        query: "?action=detach-credential",
      }),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);
  const payload = await result.json();
  assert.equal(payload.data.hasCredential, false);

  assert.ok(calls.some(
    (call) => call.url.pathname ===
      "/rest/v1/rpc/warehouse_integration_detach_credential",
  ));
  assert.equal(calls.some(
    (call) => call.url.pathname ===
      "/rest/v1/warehouse_integrations" && call.method === "PATCH",
  ), false);
});

test("credential detach RPC hatasında önceden entegrasyon PATCH yapmaz", async () => {
  const { fetchImpl: baseFetch, calls } = mockFetch();

  const failingFetch = async (input, options) => {
    const rawUrl = typeof input === "string"
      ? input
      : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl);

    if (url.pathname ===
        "/rest/v1/rpc/warehouse_integration_detach_credential") {
      return response({ message: "simulated RPC failure" }, 500);
    }
    return baseFetch(input, options);
  };

  const result = await onRequestPost(
    context(
      request("POST", {
        integrationId: INTEGRATION_ID,
      }, {
        query: "?action=detach-credential",
      }),
      failingFetch,
    ),
  );

  assert.equal(result.status, 500);
  assert.equal(calls.some(
    (call) => call.url.pathname ===
      "/rest/v1/warehouse_integrations" && call.method === "PATCH",
  ), false);
});

test("admin shipment.write capability kaydedebilir", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request(
        "POST",
        {
          integrationId: INTEGRATION_ID,
          capabilityKey: "shipment.write",
          enabled: true,
        },
        { query: "?action=set-capability" },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);

  const payload = await result.json();
  assert.equal(payload.data.capability.capability_key, "shipment.write");
  assert.equal(payload.data.capability.enabled, true);

  const writeCall = calls.find(
    (call) =>
      call.url.pathname ===
        "/rest/v1/warehouse_integration_capabilities" &&
      call.method === "POST",
  );

  assert.ok(writeCall);
  assert.equal(
    writeCall.options.headers.Prefer,
    "resolution=merge-duplicates,return=representation",
  );

  const body = JSON.parse(writeCall.options.body);
  assert.equal(body.integration_id, INTEGRATION_ID);
  assert.equal(body.capability_key, "shipment.write");
  assert.equal(body.enabled, true);
});

test("owner shipment.write capability değiştiremez", async () => {
  const { fetchImpl, calls } = mockFetch({ role: "owner" });

  const result = await onRequestPost(
    context(
      request(
        "POST",
        {
          integrationId: INTEGRATION_ID,
          capabilityKey: "shipment.write",
          enabled: true,
        },
        { query: "?action=set-capability" },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 403);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname ===
          "/rest/v1/warehouse_integration_capabilities" &&
        call.method === "POST",
    ),
    false,
  );
});

test("Vault credential yoksa shipment.write etkinleştirilemez", async () => {
  const { fetchImpl, calls } = mockFetch({
    integrations: [{
      ...INTEGRATION,
      credential_secret_id: null,
    }],
  });

  const result = await onRequestPost(
    context(
      request(
        "POST",
        {
          integrationId: INTEGRATION_ID,
          capabilityKey: "shipment.write",
          enabled: true,
        },
        { query: "?action=set-capability" },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 409);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname ===
          "/rest/v1/warehouse_integration_capabilities" &&
        call.method === "POST",
    ),
    false,
  );
});

test("aktif entegrasyonda shipment.write capability değişimi reddedilir", async () => {
  const { fetchImpl, calls } = mockFetch({
    integrations: [{
      ...INTEGRATION,
      status: "active",
    }],
  });

  const result = await onRequestPost(
    context(
      request(
        "POST",
        {
          integrationId: INTEGRATION_ID,
          capabilityKey: "shipment.write",
          enabled: false,
        },
        { query: "?action=set-capability" },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 409);
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname ===
          "/rest/v1/warehouse_integration_capabilities" &&
        call.method === "POST",
    ),
    false,
  );
});


test("test-connection yalnız HEAD gönderir ve credential yanıtı sızdırmaz", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request(
        "POST",
        {
          integrationId: INTEGRATION_ID,
          secret: CREDENTIAL,
        },
        { query: "?action=test-connection" },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);

  const payload = await result.json();
  assert.equal(payload.data.connectionTest.ok, true);
  assert.equal(payload.data.connectionTest.method, "HEAD");
  assert.equal(payload.data.connectionTest.httpStatus, 204);
  assert.equal(JSON.stringify(payload).includes(CREDENTIAL), false);

  const integrationPatches = calls.filter(
    (call) =>
      call.url.pathname === "/rest/v1/warehouse_integrations" &&
      call.method === "PATCH",
  );
  assert.equal(integrationPatches.length, 2);
  assert.equal(
    JSON.parse(
      integrationPatches[integrationPatches.length - 1].options.body,
    ).status,
    "draft",
  );

  const erpCalls = calls.filter(
    (call) => call.url.hostname === "erp.example.test",
  );

  assert.equal(erpCalls.length, 1);
  assert.equal(erpCalls[0].method, "HEAD");
  assert.equal(erpCalls[0].options.redirect, "manual");
  assert.equal(
    erpCalls[0].options.headers["X-API-Key"],
    CREDENTIAL,
  );
  assert.equal(erpCalls.some((call) => call.method === "POST"), false);
});

test("test-connection başarılı pasif entegrasyonu pasif bırakır", async () => {
  const { fetchImpl, calls } = mockFetch({
    integrations: [{ ...INTEGRATION, status: "inactive" }],
  });

  const result = await onRequestPost(
    context(
      request(
        "POST",
        {
          integrationId: INTEGRATION_ID,
          secret: CREDENTIAL,
        },
        { query: "?action=test-connection" },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 200);
  const payload = await result.json();
  assert.equal(payload.data.connectionTest.ok, true);

  const integrationPatches = calls.filter(
    (call) =>
      call.url.pathname === "/rest/v1/warehouse_integrations" &&
      call.method === "PATCH",
  );
  assert.equal(integrationPatches.length, 2);
  assert.equal(
    JSON.parse(
      integrationPatches[integrationPatches.length - 1].options.body,
    ).status,
    "inactive",
  );
});

test("test-connection aktif entegrasyonu test için değiştirmez", async () => {
  const { fetchImpl, calls } = mockFetch({
    integrations: [{
      ...INTEGRATION,
      status: "active",
    }],
  });

  const result = await onRequestPost(
    context(
      request(
        "POST",
        {
          integrationId: INTEGRATION_ID,
          secret: CREDENTIAL,
        },
        { query: "?action=test-connection" },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 409);
  assert.equal(
    calls.some((call) => call.url.hostname === "erp.example.test"),
    false,
  );
  assert.equal(
    calls.some(
      (call) =>
        call.url.pathname === "/rest/v1/warehouse_integrations" &&
        call.method === "PATCH",
    ),
    false,
  );
});

test("test-connection kimlik doğrulama credential'ı yoksa dış endpoint'e çıkmaz", async () => {
  const { fetchImpl, calls } = mockFetch();

  const result = await onRequestPost(
    context(
      request(
        "POST",
        {
          integrationId: INTEGRATION_ID,
          secret: "",
        },
        { query: "?action=test-connection" },
      ),
      fetchImpl,
    ),
  );

  assert.equal(result.status, 400);
  assert.equal(
    calls.some((call) => call.url.hostname === "erp.example.test"),
    false,
  );
});
