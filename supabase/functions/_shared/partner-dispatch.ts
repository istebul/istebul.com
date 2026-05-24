import { assertSafePartnerWebhookUrl } from "./webhook-url.ts";
import { recordOperationalEvent } from "./operational-observability.ts";

export const FAILOVER_ROUTES: Record<string, string[]> = {
  dealer_partner: ["general_sales"],
  finance_partner: ["general_sales"],
  insurance_partner: ["general_sales"],
  premium_report: ["general_sales"],
  general_sales: [],
};

export const TEST_PHONES = new Set([
  "905551112233",
  "905551111111",
  "905559998888",
]);

export type DispatchTrigger =
  | "auto_intake"
  | "partner_retry"
  | "partner_dispatch"
  | "failover";

export type DispatchResult = {
  status: "dispatched" | "dispatch_failed" | "skipped";
  reason?: string;
  endpoint?: string;
  endpoint_id?: string;
  route?: string;
  failover_used?: boolean;
};

export function isTestLead(phone?: unknown) {
  const clean = String(phone || "").replace(/\D/g, "");
  return TEST_PHONES.has(clean);
}

export function getNextRetryTime(retryCount: number) {
  const now = new Date();

  if (retryCount <= 1) now.setMinutes(now.getMinutes() + 15);
  else if (retryCount === 2) now.setHours(now.getHours() + 1);
  else if (retryCount === 3) now.setHours(now.getHours() + 6);
  else now.setDate(now.getDate() + 1);

  return now.toISOString();
}

export function priorityMeetsMinimum(
  priority: string,
  minPriority: string | null | undefined
) {
  const min = minPriority || "hot";
  if (min === "very_hot") return priority === "very_hot";
  return priority === "hot" || priority === "very_hot";
}

export async function signPartnerPayload(
  body: string,
  endpointSecret?: string | null
) {
  const secret =
    endpointSecret?.trim() ||
    Deno.env.get("PARTNER_WEBHOOK_SIGNING_SECRET") ||
    "";

  const requireSecret = Deno.env.get("PARTNER_WEBHOOK_REQUIRE_SECRET") !== "false";
  if (!secret) {
    if (requireSecret) {
      throw new Error("Partner endpoint shared_secret is required");
    }
    return "";
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type PartnerEndpoint = {
  id: string;
  name: string;
  webhook_url: string;
  shared_secret?: string | null;
  priority_weight?: number | null;
  sent_today?: number | null;
  daily_cap?: number | null;
  health_status?: string | null;
  circuit_open_until?: string | null;
  min_lead_priority?: string | null;
  failover_route?: string | null;
};

function isCircuitOpen(endpoint: PartnerEndpoint) {
  if (!endpoint.circuit_open_until) return false;
  return new Date(endpoint.circuit_open_until).getTime() > Date.now();
}

export async function getPartnerEndpoints(
  adminClient: { from: (table: string) => any },
  route: string
) {
  const { data, error } = await adminClient
    .from("partner_endpoints")
    .select(
      "id, name, webhook_url, shared_secret, priority_weight, sent_today, daily_cap, health_status, circuit_open_until, min_lead_priority, failover_route"
    )
    .eq("route_type", route)
    .eq("is_active", true);

  if (error) throw error;

  const endpoints = (data || []).filter((endpoint: PartnerEndpoint) => {
    if (isCircuitOpen(endpoint)) return false;
    if (endpoint.daily_cap != null) {
      return Number(endpoint.sent_today || 0) < Number(endpoint.daily_cap);
    }
    return true;
  });

  const ordered: PartnerEndpoint[] = [];

  const pool = [...endpoints];
  while (pool.length) {
    const totalWeight = pool.reduce((sum: number, endpoint: PartnerEndpoint) => {
      return sum + Math.max(Number(endpoint.priority_weight || 0), 1);
    }, 0);

    let random = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < pool.length; i += 1) {
      random -= Math.max(Number(pool[i].priority_weight || 0), 1);
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    ordered.push(pool.splice(selectedIndex, 1)[0]);
  }

  return ordered;
}

export function buildRouteChain(primaryRoute: string, endpoints: PartnerEndpoint[]) {
  const routes = [primaryRoute];
  const endpointFailover = endpoints.find((e) => e.failover_route)?.failover_route;
  if (endpointFailover && !routes.includes(endpointFailover)) {
    routes.push(endpointFailover);
  }
  for (const route of FAILOVER_ROUTES[primaryRoute] || []) {
    if (!routes.includes(route)) routes.push(route);
  }
  return routes;
}

async function writeDispatchLog(
  adminClient: { from: (table: string) => any },
  entry: Record<string, unknown>
) {
  try {
    await adminClient.from("partner_lead_dispatch_logs").insert(entry);
  } catch {
    // observability must not block delivery
  }
}

async function logDispatchOps(
  adminClient: { from: (table: string) => any },
  input: {
    event_name: string;
    lead_id?: string | null;
    route?: string;
    endpoint?: string;
    http_status?: number;
    duration_ms?: number;
    error_message?: string;
    attempt_number?: number;
    trigger?: string;
  }
) {
  try {
    await recordOperationalEvent(adminClient, {
      event_name: input.event_name,
      category: "webhook",
      severity: "error",
      source: "partner_dispatch",
      idempotency_key: input.lead_id
        ? `${input.event_name}:${input.lead_id}:${input.endpoint || ""}:${input.http_status || ""}`
        : null,
      properties: {
        lead_id: input.lead_id,
        partner_route: input.route,
        endpoint_name: input.endpoint,
        error_message: input.error_message,
        attempt_number: input.attempt_number,
        trigger: input.trigger,
      },
      http_status: input.http_status ?? null,
      duration_ms: input.duration_ms ?? null,
    });
  } catch {
    /* non-blocking */
  }
}

async function postPartnerWebhook(
  url: string,
  body: string,
  signature: string,
  dispatchAttemptId: string,
  timeoutMs = 8000
) {
  const safeUrl = assertSafePartnerWebhookUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(safeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-istebul-signature": signature,
        "x-istebul-dispatch-id": dispatchAttemptId,
      },
      body,
      signal: controller.signal,
    });

    return {
      response,
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function tryDispatchToEndpoints(
  adminClient: { from: (table: string) => any; rpc: (name: string, args: Record<string, unknown>) => any },
  options: {
    leadId?: string | null;
    payload: Record<string, unknown>;
    route: string;
    endpoints: PartnerEndpoint[];
    trigger: DispatchTrigger;
    attemptNumber: number;
    manualDispatch?: boolean;
  }
): Promise<DispatchResult> {
  const dispatchAttemptId = crypto.randomUUID();
  const priority = String(options.payload.priority || "");

  for (const endpoint of options.endpoints) {
    if (!endpoint?.webhook_url) continue;

    if (!priorityMeetsMinimum(priority, endpoint.min_lead_priority)) {
      continue;
    }

    const body = JSON.stringify({
      ...options.payload,
      lead_id: options.leadId || options.payload.id || null,
      partner_endpoint_id: endpoint.id,
      partner_endpoint_name: endpoint.name,
      dispatch_attempt_id: dispatchAttemptId,
      manual_dispatch: Boolean(options.manualDispatch),
    });

    const signature = await signPartnerPayload(body, endpoint.shared_secret);

    try {
      const { response, durationMs } = await postPartnerWebhook(
        endpoint.webhook_url,
        body,
        signature,
        dispatchAttemptId
      );

      const preview = (await response.text()).slice(0, 240);

      await writeDispatchLog(adminClient, {
        lead_id: options.leadId || null,
        partner_route: options.route,
        endpoint_id: endpoint.id,
        endpoint_name: endpoint.name,
        attempt_number: options.attemptNumber,
        trigger_source: options.trigger,
        dispatch_attempt_id: dispatchAttemptId,
        http_status: response.status,
        duration_ms: durationMs,
        success: response.ok,
        error_message: response.ok ? null : `HTTP ${response.status}`,
        response_preview: preview || null,
      });

      if (response.ok) {
        try {
          await adminClient.rpc("increment_partner_endpoint_success", {
            endpoint_id: endpoint.id,
          });
        } catch {}

        return {
          status: "dispatched",
          endpoint: endpoint.name,
          endpoint_id: endpoint.id,
          route: options.route,
        };
      }

      await logDispatchOps(adminClient, {
        event_name: "webhook_partner_dispatch_failed",
        lead_id: options.leadId,
        route: options.route,
        endpoint: endpoint.name,
        http_status: response.status,
        duration_ms: durationMs,
        error_message: `HTTP ${response.status}`,
        attempt_number: options.attemptNumber,
        trigger: options.trigger,
      });

      try {
        await adminClient.rpc("increment_partner_endpoint_fail", {
          endpoint_id: endpoint.id,
        });
      } catch {}
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "network_or_timeout";
      await logDispatchOps(adminClient, {
        event_name: "webhook_partner_dispatch_failed",
        lead_id: options.leadId,
        route: options.route,
        endpoint: endpoint.name,
        error_message: errMsg,
        attempt_number: options.attemptNumber,
        trigger: options.trigger,
      });

      await writeDispatchLog(adminClient, {
        lead_id: options.leadId || null,
        partner_route: options.route,
        endpoint_id: endpoint.id,
        endpoint_name: endpoint.name,
        attempt_number: options.attemptNumber,
        trigger_source: options.trigger,
        dispatch_attempt_id: dispatchAttemptId,
        success: false,
        error_message:
          err instanceof Error ? err.message : "network_or_timeout",
      });

      try {
        await adminClient.rpc("increment_partner_endpoint_fail", {
          endpoint_id: endpoint.id,
        });
      } catch {}
    }
  }

  await logDispatchOps(adminClient, {
    event_name: "webhook_partner_dispatch_exhausted",
    lead_id: options.leadId,
    route: options.route,
    error_message: "all_endpoints_failed",
    attempt_number: options.attemptNumber,
    trigger: options.trigger,
  });

  return {
    status: "dispatch_failed",
    reason: "all_endpoints_failed",
    route: options.route,
  };
}

export async function dispatchPartnerLead(
  adminClient: { from: (table: string) => any; rpc: (name: string, args: Record<string, unknown>) => any },
  options: {
    leadId?: string | null;
    payload: Record<string, unknown>;
    trigger: DispatchTrigger;
    attemptNumber?: number;
    manualDispatch?: boolean;
    skipHotCheck?: boolean;
  }
): Promise<DispatchResult> {
  const route = String(options.payload.partner_route || "");
  const priority = String(options.payload.priority || "");

  if (isTestLead(options.payload.phone)) {
    return { status: "skipped", reason: "test_lead" };
  }

  if (
    !options.skipHotCheck &&
    priority !== "hot" &&
    priority !== "very_hot"
  ) {
    return { status: "skipped", reason: "not_hot" };
  }

  const attemptNumber = options.attemptNumber ?? 1;
  let failoverUsed = false;

  const primaryEndpoints = await getPartnerEndpoints(adminClient, route);
  const routeChain = buildRouteChain(route, primaryEndpoints);

  for (let i = 0; i < routeChain.length; i += 1) {
    const currentRoute = routeChain[i];
    const trigger: DispatchTrigger =
      i === 0 ? options.trigger : "failover";

    if (i > 0) failoverUsed = true;

    const endpoints =
      currentRoute === route
        ? primaryEndpoints
        : await getPartnerEndpoints(adminClient, currentRoute);

    if (!endpoints.length) continue;

    const result = await tryDispatchToEndpoints(adminClient, {
      leadId: options.leadId,
      payload: { ...options.payload, partner_route: currentRoute },
      route: currentRoute,
      endpoints,
      trigger,
      attemptNumber,
      manualDispatch: options.manualDispatch,
    });

    if (result.status === "dispatched") {
      return { ...result, failover_used: failoverUsed };
    }
  }

  return {
    status: "dispatch_failed",
    reason: "no_active_partner",
    failover_used: failoverUsed,
  };
}

export async function applyDispatchResult(
  adminClient: { from: (table: string) => any },
  leadId: string,
  result: DispatchResult,
  currentRetryCount = 0
) {
  if (result.status === "dispatched") {
    await adminClient
      .from("auto_leads")
      .update({
        partner_status: "dispatched",
        last_dispatch_at: new Date().toISOString(),
        next_retry_at: null,
        last_dispatch_error: result.failover_used
          ? `failover:${result.route}`
          : null,
        partner_endpoint_id: result.endpoint_id || null,
      })
      .eq("id", leadId);
    return;
  }

  if (result.status === "skipped") {
    return;
  }

  const retry = currentRetryCount + 1;
  const isDead = retry >= 5;

  await adminClient
    .from("auto_leads")
    .update({
      partner_status: isDead ? "dispatch_dead" : "dispatch_failed",
      dispatch_retry_count: retry,
      last_dispatch_at: new Date().toISOString(),
      next_retry_at: isDead ? null : getNextRetryTime(retry),
      last_dispatch_error: isDead
        ? "max retry reached"
        : result.reason || "partner webhook failed",
    })
    .eq("id", leadId);
}
