/**
 * Decision Feedback — outcome capture and analytics (Sprint-33).
 */

export const FEEDBACK_HELPFULNESS_OPTIONS = Object.freeze([
  { value: 'yes', label: 'Evet' },
  { value: 'partial', label: 'Kısmen' },
  { value: 'no', label: 'Hayır' }
]);

export const FEEDBACK_FINAL_DECISION_OPTIONS = Object.freeze([
  { value: 'purchased', label: 'Satın aldım' },
  { value: 'declined', label: 'Vazgeçtim' },
  { value: 'undecided', label: 'Kararsızım' },
  { value: 'later', label: 'Daha sonra karar vereceğim' }
]);

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isValidHelpfulness(value) {
  return FEEDBACK_HELPFULNESS_OPTIONS.some((o) => o.value === value);
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isValidFinalDecision(value) {
  if (!value) return true;
  return FEEDBACK_FINAL_DECISION_OPTIONS.some((o) => o.value === value);
}

/**
 * @param {Record<string, unknown>} input
 * @returns {{ valid: boolean, errors: string[], data: Record<string, unknown>|null }}
 */
export function validateFeedbackInput(input = {}) {
  /** @type {string[]} */
  const errors = [];
  const helpfulness = String(input.helpfulness ?? '');

  if (!isValidHelpfulness(helpfulness)) {
    errors.push('Faydalılık seçimi zorunludur.');
  }

  const finalDecision = input.final_decision ?? input.finalDecision ?? null;
  if (finalDecision && !isValidFinalDecision(String(finalDecision))) {
    errors.push('Geçersiz nihai karar seçimi.');
  }

  const note = String(input.note ?? '').trim();
  if (note.length > 2000) {
    errors.push('Not en fazla 2000 karakter olabilir.');
  }

  if (errors.length) {
    return { valid: false, errors, data: null };
  }

  return {
    valid: true,
    errors: [],
    data: {
      user_id: String(input.user_id ?? input.userId ?? ''),
      listing_id: input.listing_id ?? input.listingId ?? null,
      helpfulness,
      final_decision: finalDecision ? String(finalDecision) : null,
      note: note || null,
      created_at: new Date().toISOString()
    }
  };
}

/**
 * @param {Record<string, unknown>} feedback
 * @param {Record<string, unknown>} [context]
 * @returns {Record<string, unknown>}
 */
export function buildDecisionOutcome(feedback, context = {}) {
  return {
    user_id: feedback.user_id ?? null,
    listing_id: feedback.listing_id ?? null,
    category: context.category ?? null,
    helpfulness: feedback.helpfulness,
    final_decision: feedback.final_decision ?? null,
    decision_score: context.decisionScore ?? context.decision_score ?? null,
    created_at: feedback.created_at ?? new Date().toISOString()
  };
}

/**
 * @param {Array<Record<string, unknown>>} outcomes
 * @returns {Record<string, unknown>}
 */
export function computeOutcomeAnalytics(outcomes = []) {
  const total = outcomes.length;
  if (!total) {
    return {
      total: 0,
      helpfulnessRate: 0,
      purchaseRate: 0,
      declineRate: 0,
      undecidedRate: 0,
      laterRate: 0,
      avgDecisionScore: null,
      breakdown: { yes: 0, partial: 0, no: 0 },
      decisions: { purchased: 0, declined: 0, undecided: 0, later: 0 }
    };
  }

  let yes = 0;
  let partial = 0;
  let no = 0;
  let purchased = 0;
  let declined = 0;
  let undecided = 0;
  let later = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const o of outcomes) {
    if (o.helpfulness === 'yes') yes++;
    else if (o.helpfulness === 'partial') partial++;
    else if (o.helpfulness === 'no') no++;

    if (o.final_decision === 'purchased') purchased++;
    else if (o.final_decision === 'declined') declined++;
    else if (o.final_decision === 'undecided') undecided++;
    else if (o.final_decision === 'later') later++;

    const score = Number(o.decision_score);
    if (Number.isFinite(score)) {
      scoreSum += score;
      scoreCount++;
    }
  }

  return {
    total,
    helpfulnessRate: Math.round(((yes + partial * 0.5) / total) * 100),
    purchaseRate: Math.round((purchased / total) * 100),
    declineRate: Math.round((declined / total) * 100),
    undecidedRate: Math.round((undecided / total) * 100),
    laterRate: Math.round((later / total) * 100),
    avgDecisionScore: scoreCount ? Math.round(scoreSum / scoreCount) : null,
    breakdown: { yes, partial, no },
    decisions: { purchased, declined, undecided, later }
  };
}

/**
 * @param {Record<string, unknown>} params
 * @returns {Record<string, unknown>}
 */
export function captureFeedback(params = {}) {
  const result = validateFeedbackInput(params);
  if (!result.valid || !result.data) {
    return { success: false, errors: result.errors, feedback: null, outcome: null };
  }

  const outcome = buildDecisionOutcome(result.data, params.context ?? {});
  return { success: true, errors: [], feedback: result.data, outcome };
}
