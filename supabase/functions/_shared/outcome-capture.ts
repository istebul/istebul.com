/**
 * Outcome signal ingest — KVKK-safe properties, idempotent partner/CRM events.
 * Calibration uses deterministic rules (scoring-intelligence), not ML training.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const OUTCOME_SIGNAL_TYPES = new Set([
  "vehicle_recommended_selected",
  "lead_closed",
  "partner_sale",
  "financing_accepted",
  "user_satisfaction",
  "recommendation_usefulness",
  "confidence_accuracy",
  "lead_submitted",
]);

export const CLIENT_OUTCOME_SIGNAL_TYPES = new Set([
  "vehicle_recommended_selected",
  "financing_accepted",
  "user_satisfaction",
  "recommendation_usefulness",
  "confidence_accuracy",
]);

const BLOCKED_KEYS = new Set([
  "email",
  "phone",
  "contact_name",
  "name",
  "full_name",
  "address",
  "tc",
  "tckn",
  "password",
  "iban",
  "notes",
]);

export function sanitizeOutcomeProperties(
  input: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const k = String(key).toLowerCase().slice(0, 48);
    if (BLOCKED_KEYS.has(k)) continue;
    if (value == null) continue;

    if (typeof value === "number" && Number.isFinite(value)) {
      out[k] = Math.round(value * 1000) / 1000;
      continue;
    }
    if (typeof value === "boolean") {
      out[k] = value;
      continue;
    }
    if (typeof value === "string") {
      out[k] = value.slice(0, 120);
    }
  }
  return out;
}

const PARTNER_WIN = new Set(["won", "paid", "closed", "delivered", "purchased"]);
const PARTNER_FUNDED = new Set(["funded"]);
const PARTNER_LOST = new Set(["lost", "rejected"]);

export function mapPartnerStatusToSignals(partnerStatus: string) {
  const status = String(partnerStatus || "").toLowerCase();
  const signals: Array<{
    signal_type: string;
    signal_source: string;
    properties?: Record<string, unknown>;
  }> = [];

  if (PARTNER_WIN.has(status)) {
    signals.push({ signal_type: "partner_sale", signal_source: "partner" });
    signals.push({
      signal_type: "lead_closed",
      signal_source: "partner",
      properties: { outcome: "won" },
    });
  } else if (PARTNER_FUNDED.has(status)) {
    signals.push({ signal_type: "financing_accepted", signal_source: "partner" });
    signals.push({ signal_type: "partner_sale", signal_source: "partner" });
    signals.push({
      signal_type: "lead_closed",
      signal_source: "partner",
      properties: { outcome: "won" },
    });
  } else if (PARTNER_LOST.has(status)) {
    signals.push({
      signal_type: "lead_closed",
      signal_source: "partner",
      properties: { outcome: "lost" },
    });
  }

  return signals;
}

export function mapCrmLeadUpdateSignals(values: Record<string, unknown>) {
  const signals: Array<{
    signal_type: string;
    signal_source: string;
    properties?: Record<string, unknown>;
  }> = [];

  const status = String(values.status || "").toLowerCase();
  const partnerStatus = String(values.partner_status || "").toLowerCase();

  if (status === "won" || status === "lost") {
    signals.push({
      signal_type: "lead_closed",
      signal_source: "crm",
      properties: { outcome: status, via: "status" },
    });
  }

  if (partnerStatus) {
    for (const row of mapPartnerStatusToSignals(partnerStatus)) {
      signals.push({ ...row, signal_source: "crm" });
    }
  }

  return signals;
}

export function mapDecisionFeedbackToSignals(feedbackType: string) {
  const type = String(feedbackType || "");
  const signals: Array<{
    signal_type: string;
    signal_source: string;
    properties?: Record<string, unknown>;
  }> = [];

  if (type === "helpful") {
    signals.push({
      signal_type: "recommendation_usefulness",
      signal_source: "feedback",
      properties: { rating: "high" },
    });
    signals.push({
      signal_type: "user_satisfaction",
      signal_source: "feedback",
      properties: { score: 1 },
    });
  } else if (type === "unclear") {
    signals.push({
      signal_type: "recommendation_usefulness",
      signal_source: "feedback",
      properties: { rating: "low" },
    });
  } else if (type === "contact") {
    signals.push({
      signal_type: "user_satisfaction",
      signal_source: "feedback",
      properties: { needs_support: true },
    });
  }

  return signals;
}

export type OutcomeSignalInput = {
  signal_type: string;
  signal_source: string;
  decision_session_id?: string | null;
  lead_id?: string | null;
  segment_key?: string | null;
  idempotency_key?: string | null;
  properties?: Record<string, unknown>;
};

export async function recordOutcomeSignal(
  admin: SupabaseClient,
  input: OutcomeSignalInput
): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  const signalType = String(input.signal_type || "");
  const signalSource = String(input.signal_source || "");

  if (!OUTCOME_SIGNAL_TYPES.has(signalType)) {
    return { ok: false, error: "invalid_signal_type" };
  }
  if (!["user", "partner", "feedback", "crm"].includes(signalSource)) {
    return { ok: false, error: "invalid_signal_source" };
  }

  const idempotencyKey = input.idempotency_key
    ? String(input.idempotency_key).slice(0, 160)
    : null;

  if (idempotencyKey) {
    const { data: existing } = await admin
      .from("outcome_signal_events")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) return { ok: true, duplicate: true };
  }

  const row = {
    signal_type: signalType,
    signal_source: signalSource,
    decision_session_id: input.decision_session_id
      ? String(input.decision_session_id).slice(0, 64)
      : null,
    lead_id: input.lead_id || null,
    segment_key: input.segment_key ? String(input.segment_key).slice(0, 120) : null,
    idempotency_key: idempotencyKey,
    properties: sanitizeOutcomeProperties(input.properties),
  };

  const { error } = await admin.from("outcome_signal_events").insert(row);
  if (error) {
    if (error.code === "23505" && idempotencyKey) {
      return { ok: true, duplicate: true };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function recordOutcomeSignals(
  admin: SupabaseClient,
  signals: OutcomeSignalInput[],
  context: {
    lead_id?: string | null;
    decision_session_id?: string | null;
    segment_key?: string | null;
    idempotency_prefix?: string;
  } = {}
) {
  for (const signal of signals) {
    const key = context.idempotency_prefix
      ? `${context.idempotency_prefix}:${signal.signal_type}:${signal.signal_source}`
      : undefined;

    await recordOutcomeSignal(admin, {
      ...signal,
      lead_id: signal.lead_id ?? context.lead_id ?? null,
      decision_session_id:
        signal.decision_session_id ?? context.decision_session_id ?? null,
      segment_key: signal.segment_key ?? context.segment_key ?? null,
      idempotency_key: key || signal.idempotency_key || null,
      properties: {
        ...(signal.properties || {}),
      },
    });
  }
}
