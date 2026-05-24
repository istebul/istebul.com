/**
 * P4.7 — Venture scale limits (client-side guardrails).
 * Tunable without changing product semantics; server caps remain authoritative.
 */

export const SCALE_LIMITS = Object.freeze({
  analytics: {
    maxQueue: 48,
    flushBatch: 25,
    flushDebounceMs: 1200,
    maxRetries: 2
  },
  opsTelemetry: {
    maxQueue: 36,
    flushBatch: 20,
    flushDebounceMs: 1500
  },
  admin: {
    analyticsWindowDays: 14,
    analyticsRowLimit: 1200,
    partnerFunnelWindowDays: 30,
    partnerFunnelRowLimit: 1500
  },
  aiProxy: {
    maxPromptChars: 3000,
    maxNarrativeChars: 380,
    sessionCallsPerHour: 3
  }
});

/**
 * Drop duplicate low-priority events already queued (reduces ingest write amplification).
 */
export function dedupeAnalyticsQueue(queue, eventName, sessionId) {
  if (eventName !== 'page_view' && eventName !== 'route_change') return queue;
  const key = `${eventName}:${sessionId || ''}`;
  return queue.filter((item) => `${item.event_name}:${item.session_id || ''}` !== key);
}

const AI_SESSION_KEY = 'istebul_ai_narration_budget';

/**
 * Client-side Groq narration budget (per tab session / hour).
 */
export function canCallAiNarration() {
  if (typeof sessionStorage === 'undefined') return true;

  const hourMs = 60 * 60 * 1000;
  const max = SCALE_LIMITS.aiProxy.sessionCallsPerHour;
  const now = Date.now();

  try {
    const raw = sessionStorage.getItem(AI_SESSION_KEY);
    let budget = raw ? JSON.parse(raw) : { count: 0, windowStart: now };

    if (now - budget.windowStart > hourMs) {
      budget = { count: 0, windowStart: now };
    }

    if (budget.count >= max) return false;

    budget.count += 1;
    sessionStorage.setItem(AI_SESSION_KEY, JSON.stringify(budget));
    return true;
  } catch {
    return true;
  }
}
