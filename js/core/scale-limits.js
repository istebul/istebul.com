/**
 * P4.7 — Venture scale limits (client-side guardrails).
 * Tunable without changing product semantics; server caps remain authoritative.
 */

export const SCALE_LIMITS = Object.freeze({
  analytics: {
    maxQueue: 40,
    flushBatch: 25,
    flushDebounceMs: 1500,
    maxRetries: 2,
    lowPrioritySampleRate: 0.5
  },
  opsTelemetry: {
    maxQueue: 30,
    flushBatch: 20,
    flushDebounceMs: 1500
  },
  admin: {
    analyticsWindowDays: 14,
    analyticsRowLimit: 1200,
    executiveWindowDays: 30,
    executiveRowLimit: 2500,
    partnerFunnelWindowDays: 30,
    partnerFunnelRowLimit: 1500
  },
  aiProxy: {
    maxPromptChars: 4000,
    maxNarrativeChars: 900,
    maxOutputTokens: 800,
    sessionCallsPerHour: 12,
    proSessionCallsPerHour: 40
  }
});

/**
 * Drop duplicate low-priority events already queued (reduces ingest write amplification).
 */
const DEDUPE_EVENT_NAMES = new Set(['page_view', 'route_change', 'page_exit']);

export function dedupeAnalyticsQueue(queue, eventName, sessionId) {
  if (!DEDUPE_EVENT_NAMES.has(eventName)) return queue;
  const key = `${eventName}:${sessionId || ''}`;
  return queue.filter((item) => `${item.event_name}:${item.session_id || ''}` !== key);
}

const AI_SESSION_KEY = 'istebul_ai_narration_budget';

function readAiNarrationBudget(now = Date.now(), options = {}) {
  const hourMs = 60 * 60 * 1000;
  const max = options.pro
    ? SCALE_LIMITS.aiProxy.proSessionCallsPerHour
    : SCALE_LIMITS.aiProxy.sessionCallsPerHour;
  const raw = sessionStorage.getItem(AI_SESSION_KEY);
  let budget = raw ? JSON.parse(raw) : { count: 0, windowStart: now };

  if (now - budget.windowStart > hourMs) {
    budget = { count: 0, windowStart: now };
  }

  return { budget, max, hourMs };
}

/**
 * Check narration budget without consuming a slot (UI / gating).
 */
export function hasAiNarrationBudget(options = {}) {
  if (typeof sessionStorage === 'undefined') return true;

  try {
    const { budget, max } = readAiNarrationBudget(Date.now(), options);
    return budget.count < max;
  } catch {
    return true;
  }
}

/**
 * Client-side Groq narration budget (per tab session / hour).
 */
export function canCallAiNarration(options = {}) {
  if (typeof sessionStorage === 'undefined') return true;

  const now = Date.now();

  try {
    const { budget, max } = readAiNarrationBudget(now, options);
    if (budget.count >= max) return false;

    budget.count += 1;
    sessionStorage.setItem(AI_SESSION_KEY, JSON.stringify(budget));
    return true;
  } catch {
    return true;
  }
}

export function getAiNarrationBudgetMessage(options = {}) {
  if (hasAiNarrationBudget(options)) return '';
  const max = options.pro
    ? SCALE_LIMITS.aiProxy.proSessionCallsPerHour
    : SCALE_LIMITS.aiProxy.sessionCallsPerHour;
  return `Saatlik AI sentez kotası doldu (${max}/saat). Skor, TCO ve yapılandırılmış gerekçe kartları geçerlidir; bir süre sonra tekrar deneyin.`;
}
