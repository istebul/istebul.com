/**
 * P16 — Infra unit economics helpers (client sampling + planning estimates).
 * Keep in sync with data/ops/infra-unit-economics.json (verified by p16 audit).
 */

import { SCALE_LIMITS } from './scale-limits.js';

/** @see data/ops/infra-unit-economics.json guardrails.analyticsLowPriorityEvents */
const LOW_PRIORITY_EVENTS = new Set(['page_exit', 'route_change']);

/** @see data/ops/infra-unit-economics.json guardrails.analyticsSampleRateLowPriority */
const LOW_PRIORITY_SAMPLE_RATE = 0.5;

const GROQ_INPUT_USD_PER_1K = 0.00005;
const GROQ_OUTPUT_USD_PER_1K = 0.00008;
const RESEND_USD_PER_EMAIL = 0.001;

/**
 * Probabilistic drop for noisy page telemetry (halves Supabase write volume at scale).
 */
export function shouldSampleAnalyticsEvent(eventName) {
  if (!LOW_PRIORITY_EVENTS.has(eventName)) return true;
  if (LOW_PRIORITY_SAMPLE_RATE >= 1) return true;
  if (LOW_PRIORITY_SAMPLE_RATE <= 0) return false;
  return Math.random() < LOW_PRIORITY_SAMPLE_RATE;
}

/**
 * Rough Groq cost estimate for one /ai-proxy call (planning only).
 */
export function estimateGroqCallUsd({ promptChars = 0, outputTokens } = {}) {
  const maxOut = outputTokens ?? SCALE_LIMITS.aiProxy.maxOutputTokens;
  const inputTokens = Math.ceil(promptChars / 4);
  const inCost = (inputTokens / 1000) * GROQ_INPUT_USD_PER_1K;
  const outCost = (maxOut / 1000) * GROQ_OUTPUT_USD_PER_1K;
  return Number((inCost + outCost).toFixed(6));
}

/**
 * Monthly infra burn estimate from MAU + usage assumptions (investor deck helper).
 */
export function estimateMonthlyInfraUsd({
  mau = 10000,
  aiCallsPerMau = 0.4,
  lifecycleEmailsPerMau = 0.15,
  analyticsEventsPerMau = 40
} = {}) {
  const perCall = estimateGroqCallUsd({ promptChars: 1200 });
  const aiUsd = mau * aiCallsPerMau * perCall;
  const emailUsd = mau * lifecycleEmailsPerMau * RESEND_USD_PER_EMAIL;
  const supabaseBase = mau < 50000 ? 25 : mau < 200000 ? 75 : 199;
  const eventWrites = (mau * analyticsEventsPerMau) / 1_000_000;
  const supabaseVariable = eventWrites * 8;
  return {
    aiUsd: Number(aiUsd.toFixed(2)),
    emailUsd: Number(emailUsd.toFixed(2)),
    supabaseUsd: Number((supabaseBase + supabaseVariable).toFixed(2)),
    cloudflareUsd: 0,
    totalUsd: Number((aiUsd + emailUsd + supabaseBase + supabaseVariable).toFixed(2))
  };
}
