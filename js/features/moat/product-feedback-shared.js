/**
 * P3.3 Product feedback intelligence — shared rules (browser + unit tests).
 * Server mirror: supabase/functions/_shared/product-feedback.ts
 */

export const PRODUCT_FEEDBACK_SURFACES = Object.freeze([
  'auto_results',
  'email',
  'history',
  'partner_post'
]);

export const PRODUCT_FEEDBACK_EVENTS = Object.freeze({
  REQUESTED: 'feedback_requested',
  SUBMITTED: 'feedback_submitted',
  RECOMMENDATION_SUCCESS: 'recommendation_success',
  RECOMMENDATION_REJECTED: 'recommendation_rejected'
});

export const COOLDOWN_KEY_PREFIX = 'ib_product_feedback_done_';

const VALID_USEFUL = new Set(['yes', 'no', 'skip']);
const VALID_OUTCOME = new Set(['purchased', 'alternative', 'researching', 'nothing', 'skip']);

export function productFeedbackCooldownKey(decisionSessionId, surface) {
  const sid = String(decisionSessionId || 'anon').slice(0, 64);
  const surf = String(surface || 'auto_results').slice(0, 32);
  return `${COOLDOWN_KEY_PREFIX}${sid}:${surf}`;
}

export function isProductFeedbackComplete(storage, key) {
  if (!storage || !key) return false;
  try {
    return storage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function markProductFeedbackComplete(storage, key) {
  if (!storage || !key) return;
  try {
    storage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

export function normalizeProductFeedbackAnswers(input = {}) {
  const useful = VALID_USEFUL.has(input.useful_rating) ? input.useful_rating : null;
  const outcome = VALID_OUTCOME.has(input.outcome_action) ? input.outcome_action : null;

  let boughtVehicle = null;
  if (input.bought_vehicle === true || input.bought_vehicle === 'yes') boughtVehicle = true;
  else if (input.bought_vehicle === false || input.bought_vehicle === 'no') boughtVehicle = false;
  else if (input.bought_vehicle === 'unsure') boughtVehicle = null;

  let choseAlternative = null;
  if (input.chose_alternative === true || input.chose_alternative === 'yes') choseAlternative = true;
  else if (input.chose_alternative === false || input.chose_alternative === 'no') choseAlternative = false;

  if (outcome === 'purchased') boughtVehicle = boughtVehicle ?? true;
  if (outcome === 'alternative') choseAlternative = choseAlternative ?? true;

  return {
    useful_rating: useful,
    outcome_action: outcome,
    bought_vehicle: boughtVehicle,
    chose_alternative: choseAlternative
  };
}

export function hasMinimumProductFeedback(answers) {
  const a = normalizeProductFeedbackAnswers(answers);
  return Boolean(a.useful_rating || a.outcome_action || a.bought_vehicle != null || a.chose_alternative != null);
}

/** Platform analytics events to emit after a valid submit. */
export function deriveProductIntelligenceEvents(answers) {
  const a = normalizeProductFeedbackAnswers(answers);
  const events = [PRODUCT_FEEDBACK_EVENTS.SUBMITTED];

  const success =
    a.useful_rating === 'yes' ||
    a.outcome_action === 'purchased' ||
    a.bought_vehicle === true;

  const rejected =
    a.useful_rating === 'no' ||
    a.outcome_action === 'alternative' ||
    a.chose_alternative === true ||
    a.bought_vehicle === false;

  if (success && !rejected) {
    events.push(PRODUCT_FEEDBACK_EVENTS.RECOMMENDATION_SUCCESS);
  } else if (rejected) {
    events.push(PRODUCT_FEEDBACK_EVENTS.RECOMMENDATION_REJECTED);
  } else if (success) {
    events.push(PRODUCT_FEEDBACK_EVENTS.RECOMMENDATION_SUCCESS);
  }

  return [...new Set(events)];
}

export function mapProductFeedbackToSignals(answers) {
  const a = normalizeProductFeedbackAnswers(answers);
  const signals = [];

  if (a.useful_rating === 'yes') {
    signals.push({
      signal_type: 'recommendation_usefulness',
      signal_source: 'feedback',
      properties: { rating: 'high', via: 'product_feedback' }
    });
    signals.push({
      signal_type: 'user_satisfaction',
      signal_source: 'feedback',
      properties: { score: 1, via: 'product_feedback' }
    });
  } else if (a.useful_rating === 'no') {
    signals.push({
      signal_type: 'recommendation_usefulness',
      signal_source: 'feedback',
      properties: { rating: 'low', via: 'product_feedback' }
    });
  }

  if (a.outcome_action === 'purchased' || a.bought_vehicle === true) {
    signals.push({
      signal_type: 'lead_closed',
      signal_source: 'feedback',
      properties: { outcome: 'won', via: 'user_report' }
    });
    signals.push({
      signal_type: 'user_satisfaction',
      signal_source: 'feedback',
      properties: { purchased: true, via: 'product_feedback' }
    });
  }

  if (a.outcome_action === 'alternative' || a.chose_alternative === true) {
    signals.push({
      signal_type: 'lead_closed',
      signal_source: 'feedback',
      properties: { outcome: 'lost', via: 'alternative_choice' }
    });
  }

  if (a.bought_vehicle === false) {
    signals.push({
      signal_type: 'recommendation_usefulness',
      signal_source: 'feedback',
      properties: { rating: 'low', reason: 'no_purchase' }
    });
  }

  return dedupeSignals(signals);
}

function dedupeSignals(signals) {
  const seen = new Set();
  const out = [];
  for (const row of signals) {
    const key = `${row.signal_type}|${row.signal_source}|${JSON.stringify(row.properties || {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
