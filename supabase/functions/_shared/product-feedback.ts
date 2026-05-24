/**
 * P3.3 Product feedback intelligence — server-side normalization + outcome mapping.
 */

const VALID_USEFUL = new Set(["yes", "no", "skip"]);
const VALID_OUTCOME = new Set(["purchased", "alternative", "researching", "nothing", "skip"]);

export type ProductFeedbackAnswers = {
  useful_rating?: string | null;
  outcome_action?: string | null;
  bought_vehicle?: boolean | string | null;
  chose_alternative?: boolean | string | null;
};

export function normalizeProductFeedbackAnswers(input: ProductFeedbackAnswers = {}) {
  const useful = VALID_USEFUL.has(String(input.useful_rating || ""))
    ? String(input.useful_rating)
    : null;
  const outcome = VALID_OUTCOME.has(String(input.outcome_action || ""))
    ? String(input.outcome_action)
    : null;

  let boughtVehicle: boolean | null = null;
  if (input.bought_vehicle === true || input.bought_vehicle === "yes") boughtVehicle = true;
  else if (input.bought_vehicle === false || input.bought_vehicle === "no") boughtVehicle = false;

  let choseAlternative: boolean | null = null;
  if (input.chose_alternative === true || input.chose_alternative === "yes") {
    choseAlternative = true;
  } else if (input.chose_alternative === false || input.chose_alternative === "no") {
    choseAlternative = false;
  }

  if (outcome === "purchased") boughtVehicle = boughtVehicle ?? true;
  if (outcome === "alternative") choseAlternative = choseAlternative ?? true;

  return { useful_rating: useful, outcome_action: outcome, bought_vehicle: boughtVehicle, chose_alternative: choseAlternative };
}

export function hasMinimumProductFeedback(input: ProductFeedbackAnswers) {
  const a = normalizeProductFeedbackAnswers(input);
  return Boolean(
    a.useful_rating ||
      a.outcome_action ||
      a.bought_vehicle != null ||
      a.chose_alternative != null
  );
}

export function deriveProductIntelligenceEvents(input: ProductFeedbackAnswers) {
  const a = normalizeProductFeedbackAnswers(input);
  const events: string[] = ["feedback_submitted"];

  const success =
    a.useful_rating === "yes" ||
    a.outcome_action === "purchased" ||
    a.bought_vehicle === true;

  const rejected =
    a.useful_rating === "no" ||
    a.outcome_action === "alternative" ||
    a.chose_alternative === true ||
    a.bought_vehicle === false;

  if (success && !rejected) {
    events.push("recommendation_success");
  } else if (rejected) {
    events.push("recommendation_rejected");
  } else if (success) {
    events.push("recommendation_success");
  }

  return [...new Set(events)];
}

export function mapProductFeedbackToSignals(input: ProductFeedbackAnswers) {
  const a = normalizeProductFeedbackAnswers(input);
  const signals: Array<{
    signal_type: string;
    signal_source: string;
    properties?: Record<string, unknown>;
  }> = [];

  if (a.useful_rating === "yes") {
    signals.push({
      signal_type: "recommendation_usefulness",
      signal_source: "feedback",
      properties: { rating: "high", via: "product_feedback" },
    });
    signals.push({
      signal_type: "user_satisfaction",
      signal_source: "feedback",
      properties: { score: 1, via: "product_feedback" },
    });
  } else if (a.useful_rating === "no") {
    signals.push({
      signal_type: "recommendation_usefulness",
      signal_source: "feedback",
      properties: { rating: "low", via: "product_feedback" },
    });
  }

  if (a.outcome_action === "purchased" || a.bought_vehicle === true) {
    signals.push({
      signal_type: "lead_closed",
      signal_source: "feedback",
      properties: { outcome: "won", via: "user_report" },
    });
  }

  if (a.outcome_action === "alternative" || a.chose_alternative === true) {
    signals.push({
      signal_type: "lead_closed",
      signal_source: "feedback",
      properties: { outcome: "lost", via: "alternative_choice" },
    });
  }

  if (a.bought_vehicle === false) {
    signals.push({
      signal_type: "recommendation_usefulness",
      signal_source: "feedback",
      properties: { rating: "low", reason: "no_purchase" },
    });
  }

  const seen = new Set<string>();
  return signals.filter((row) => {
    const key = `${row.signal_type}|${row.signal_source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
