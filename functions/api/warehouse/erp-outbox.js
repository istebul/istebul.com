import {
  getIntegrationConnector
} from "./integration-connectors.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8"
};

const MAX_ERROR_LENGTH = 4000;
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const DEFAULT_TIMEOUT_MS = 15000;

function json(body, status = 200) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: JSON_HEADERS
    }
  );
}

function text(value) {
  return String(value ?? "").trim();
}

function configured(env) {
  return Boolean(
    text(env.SUPABASE_URL) &&
    text(env.SUPABASE_SERVICE_ROLE_KEY) &&
    text(env.WAREHOUSE_ERP_OUTBOX_PROCESS_SECRET)
  );
}

function authorized(request, env) {
  const expected =
    text(env.WAREHOUSE_ERP_OUTBOX_PROCESS_SECRET);

  if (!expected) return false;

  const header =
    text(
      request.headers.get("Authorization")
    );

  const secretHeader =
    text(
      request.headers.get(
        "X-Warehouse-ERP-Outbox-Secret"
      )
    );

  return (
    header === `Bearer ${expected}` ||
    secretHeader === expected
  );
}

function supabaseHeaders(env) {
  const serviceKey =
    text(env.SUPABASE_SERVICE_ROLE_KEY);

  return {
    "Content-Type":
      "application/json",
    apikey: serviceKey,
    Authorization:
      `Bearer ${serviceKey}`
  };
}

async function callSupabaseRpc(
  env,
  rpcName,
  body
) {
  const base =
    text(env.SUPABASE_URL).replace(
      /\/$/,
      ""
    );

  const response = await fetch(
    `${base}/rest/v1/rpc/${rpcName}`,
    {
      method: "POST",
      headers: supabaseHeaders(env),
      body: JSON.stringify(body)
    }
  );

  const raw = await response.text();

  let data = null;

  try {
    data =
      raw
        ? JSON.parse(raw)
        : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const detail =
      typeof data === "string"
        ? data
        : JSON.stringify(data);

    throw new Error(
      `Supabase RPC ${rpcName} başarısız (${response.status}): ${detail}`
    );
  }

  return data;
}

async function fetchWithTimeout(
  url,
  options,
  timeoutMs
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  try {
    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponseBody(response) {
  const raw =
    await response.text();

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw.slice(
      0,
      MAX_ERROR_LENGTH
    );
  }
}

function retrySeconds(attemptCount) {
  const exponent =
    Math.min(
      Math.max(
        Number(attemptCount || 1) - 1,
        0
      ),
      7
    );

  return Math.min(
    3600,
    30 * (2 ** exponent)
  );
}

async function loadIntegrationRuntime(
  env,
  integrationId
) {
  const runtime =
    await callSupabaseRpc(
      env,
      "warehouse_integration_get_runtime",
      {
        p_integration_id:
          integrationId
      }
    );

  if (!runtime || typeof runtime !== "object") {
    throw new Error(
      "WarehouseIQ integration runtime bilgisi alınamadı."
    );
  }

  return runtime;
}

async function sendThroughConnector({
  env,
  row,
  runtime
}) {
  const connector =
    getIntegrationConnector(
      runtime.connectorKey
    );

  const request =
    connector.buildRequest({
      runtime,
      env,
      payload:
        row.payload ?? {},
      outboxId:
        row.id,
      eventType:
        row.event_type
    });

  const timeoutMs =
    Math.max(
      1000,
      Math.min(
        Number(
          env.WAREHOUSE_INTEGRATION_TIMEOUT_MS ||
          DEFAULT_TIMEOUT_MS
        ),
        120000
      )
    );

  return fetchWithTimeout(
    request.url,
    {
      method: "POST",
      headers: request.headers,
      body:
        JSON.stringify(
          row.payload ?? {}
        )
    },
    timeoutMs
  );
}

async function processOutbox(
  env,
  batchSize
) {
  const routed =
    await callSupabaseRpc(
      env,
      "warehouse_erp_outbox_route_unrouted",
      {
        p_limit: batchSize
      }
    );

  const claimed =
    await callSupabaseRpc(
      env,
      "warehouse_erp_outbox_claim",
      {
        p_limit: batchSize
      }
    );

  const rows =
    Array.isArray(claimed)
      ? claimed
      : [];

  const result = {
    routed:
      Number.isFinite(Number(routed))
        ? Number(routed)
        : 0,
    claimed:
      rows.length,
    acknowledged: 0,
    failed: 0,
    items: []
  };

  for (const row of rows) {
    const outboxId =
      text(row.id);

    try {
      if (!text(row.integration_id)) {
        throw new Error(
          "Outbox kaydı integration_id içermiyor."
        );
      }

      const runtime =
        await loadIntegrationRuntime(
          env,
          text(row.integration_id)
        );

      if (
        text(runtime.accountId) !==
        text(row.account_id)
      ) {
        throw new Error(
          "Outbox hesabı ile integration hesabı eşleşmiyor."
        );
      }

      const response =
        await sendThroughConnector({
          env,
          row,
          runtime
        });

      const responseBody =
        await parseResponseBody(
          response
        );

      if (
        response.status >= 200 &&
        response.status < 300
      ) {
        await callSupabaseRpc(
          env,
          "warehouse_erp_outbox_ack",
          {
            p_outbox_id:
              outboxId,
            p_response: {
              connectorKey:
                runtime.connectorKey,
              connectorStatus:
                response.status,
              response:
                responseBody
            }
          }
        );

        result.acknowledged += 1;

        result.items.push({
          id:
            outboxId,
          integrationId:
            text(row.integration_id),
          connectorKey:
            text(
              runtime.connectorKey
            ),
          status:
            "acknowledged"
        });

        continue;
      }

      const detail =
        typeof responseBody === "string"
          ? responseBody
          : JSON.stringify(
              responseBody
            );

      throw new Error(
        `${runtime.connectorKey} HTTP ${response.status}: ${detail}`
      );
    } catch (error) {
      const message =
        text(error?.message).slice(
          0,
          MAX_ERROR_LENGTH
        ) ||
        "WarehouseIQ integration isteği başarısız.";

      try {
        await callSupabaseRpc(
          env,
          "warehouse_erp_outbox_fail",
          {
            p_outbox_id:
              outboxId,
            p_error:
              message,
            p_retry_seconds:
              retrySeconds(
                row.attempt_count
              )
          }
        );

        result.failed += 1;

        result.items.push({
          id:
            outboxId,
          integrationId:
            text(row.integration_id),
          status:
            "failed",
          error:
            message
        });
      } catch (failError) {
        result.items.push({
          id:
            outboxId,
          integrationId:
            text(row.integration_id),
          status:
            "processing",
          error:
            `${message} | Fail kaydı da yazılamadı: ${text(failError?.message)}`
        });
      }
    }
  }

  return result;
}

export async function onRequestGet({
  request,
  env
}) {
  if (!authorized(request, env)) {
    return json(
      {
        ok: false,
        error:
          "unauthorized"
      },
      401
    );
  }

  return json({
    ok: true,
    service:
      "warehouse-integration-outbox",
    configured:
      configured(env),
    connectorMode:
      "integration-aware",
    ts:
      new Date().toISOString()
  });
}

export async function onRequestPost({
  request,
  env
}) {
  if (!authorized(request, env)) {
    return json(
      {
        ok: false,
        error:
          "unauthorized"
      },
      401
    );
  }

  if (!configured(env)) {
    return json(
      {
        ok: false,
        error:
          "integration_outbox_unconfigured",
        message:
          "Supabase veya outbox process secret yapılandırması eksik."
      },
      503
    );
  }

  let body = {};

  try {
    body =
      await request.json();
  } catch {
    body = {};
  }

  const requestedLimit =
    Number(
      body?.limit ??
      DEFAULT_BATCH_SIZE
    );

  const batchSize =
    Math.min(
      Math.max(
        Number.isFinite(
          requestedLimit
        )
          ? requestedLimit
          : DEFAULT_BATCH_SIZE,
        1
      ),
      MAX_BATCH_SIZE
    );

  try {
    const result =
      await processOutbox(
        env,
        batchSize
      );

    return json({
      ok: true,
      ...result
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error:
          "integration_outbox_processing_failed",
        message:
          text(error?.message).slice(
            0,
            MAX_ERROR_LENGTH
          ) ||
          "WarehouseIQ integration outbox işlenemedi."
      },
      500
    );
  }
}
