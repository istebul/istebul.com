export const OPS_SEVERITIES = new Set(["critical", "error", "warning", "info"]);

export const OPS_CATEGORIES = new Set([
  "error",
  "api",
  "webhook",
  "lead",
  "auth",
  "payment",
  "performance",
  "abuse",
  "admin",
]);

/** Server-side operational events (ingest validates client subset separately). */
export const SERVER_OPS_EVENTS = new Set([
  "api_auto_intake_error",
  "api_auto_intake_rate_limited",
  "api_analytics_ingest_error",
  "api_lifecycle_enroll_error",
  "api_lifecycle_rate_limited",
  "webhook_partner_dispatch_failed",
  "webhook_partner_dispatch_exhausted",
  "webhook_partner_circuit_open",
  "webhook_stripe_signature_invalid",
  "webhook_stripe_processing_failed",
  "lead_delivery_failed",
  "lead_telegram_notify_failed",
  "abuse_turnstile_failed",
  "abuse_spam_honeypot",
  "abuse_rate_limit_exceeded",
  "payment_checkout_failed",
]);

export const CLIENT_OPS_EVENTS = new Set([
  "client_unhandled_error",
  "client_unhandled_rejection",
  "client_api_failure",
  "auth_login_failed",
  "auth_register_failed",
  "auth_logout_error",
  "payment_checkout_failed",
  "payment_checkout_denied",
  "performance_lcp_slow",
  "performance_long_task",
  "performance_cls_high",
  "abuse_client_rate_hint",
]);

export type OpsEventInput = {
  event_name: string;
  category: string;
  severity?: string;
  source?: string;
  fingerprint?: string | null;
  idempotency_key?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  http_status?: number | null;
  duration_ms?: number | null;
  properties?: Record<string, unknown>;
};

function clampString(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function clampProperties(value: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value || {}).slice(0, 40)) {
    const k = key.slice(0, 64);
    if (typeof val === "string") out[k] = val.slice(0, 500);
    else if (typeof val === "number" || typeof val === "boolean" || val === null) {
      out[k] = val;
    } else {
      out[k] = JSON.stringify(val).slice(0, 500);
    }
  }
  return out;
}

export function normalizeSeverity(value: unknown, eventName: string) {
  const s = String(value || "").toLowerCase();
  if (OPS_SEVERITIES.has(s)) return s;
  if (eventName.includes("failed") || eventName.includes("error")) return "error";
  if (eventName.includes("exhausted") || eventName.includes("critical")) return "critical";
  return "warning";
}

export function buildFingerprint(
  category: string,
  eventName: string,
  props: Record<string, unknown> = {}
) {
  const route = props.route || props.endpoint || props.path || "";
  const code = props.error_code || props.status || "";
  return `${category}:${eventName}:${route}:${code}`.slice(0, 200);
}

export async function recordOperationalEvent(
  adminClient: { from: (table: string) => any },
  input: OpsEventInput
) {
  const eventName = clampString(input.event_name, 80);
  const category = clampString(input.category, 32);

  if (!OPS_CATEGORIES.has(category)) {
    throw new Error("invalid_ops_category");
  }

  if (
    !SERVER_OPS_EVENTS.has(eventName) &&
    !CLIENT_OPS_EVENTS.has(eventName)
  ) {
    throw new Error("invalid_ops_event");
  }

  const severity = normalizeSeverity(input.severity, eventName);
  const properties = clampProperties(input.properties);
  const fingerprint =
    input.fingerprint ||
    buildFingerprint(category, eventName, properties);

  const row = {
    severity,
    category,
    event_name: eventName,
    source: clampString(input.source || "edge", 64),
    fingerprint,
    idempotency_key: input.idempotency_key
      ? clampString(input.idempotency_key, 120)
      : null,
    user_id: input.user_id || null,
    session_id: input.session_id ? clampString(input.session_id, 64) : null,
    http_status:
      input.http_status != null ? Number(input.http_status) : null,
    duration_ms:
      input.duration_ms != null ? Number(input.duration_ms) : null,
    properties,
  };

  const { error } = await adminClient.from("operational_events").insert(row);

  if (error) {
    if (error.code === "23505") return { ok: true, duplicate: true };
    throw error;
  }

  return { ok: true };
}
