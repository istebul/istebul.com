/**
 * AI Recommendation Engine — alternative ranker (Sprint-16 v1).
 */

/**
 * @param {Array<Record<string, unknown>>} recommendations
 * @returns {Array<Record<string, unknown>>}
 */
export function rankTopRecommendations(recommendations, limit = 5) {
  return [...recommendations]
    .sort((a, b) => Number(b.fit_score ?? 0) - Number(a.fit_score ?? 0))
    .slice(0, limit);
}

/**
 * @param {Array<Record<string, unknown>>} recommendations
 * @returns {Record<string, string|null>}
 */
export function assignAlternativeTags(recommendations) {
  if (!recommendations.length) {
    return {
      best_match: null,
      lowest_risk: null,
      best_value: null,
      budget_friendly: null,
      premium_choice: null
    };
  }

  const byFit = [...recommendations].sort((a, b) => Number(b.fit_score ?? 0) - Number(a.fit_score ?? 0));
  const byRisk = [...recommendations].sort((a, b) => Number(a.risk_score ?? 999) - Number(b.risk_score ?? 999));
  const byPrice = [...recommendations]
    .filter((item) => Number(item.price) > 0)
    .sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
  const byValue = [...recommendations].sort((a, b) => {
    const aValue = Number(a.fit_score ?? 0) / Math.max(Number(a.price ?? 1), 1);
    const bValue = Number(b.fit_score ?? 0) / Math.max(Number(b.price ?? 1), 1);
    return bValue - aValue;
  });
  const byQuality = [...recommendations].sort(
    (a, b) => Number(b.quality_score ?? 0) - Number(a.quality_score ?? 0)
  );

  return {
    best_match: String(byFit[0]?.id ?? null),
    lowest_risk: String(byRisk[0]?.id ?? null),
    best_value: String(byValue[0]?.id ?? null),
    budget_friendly: String(byPrice[0]?.id ?? null),
    premium_choice: String(byQuality[0]?.id ?? null)
  };
}

/**
 * @param {Record<string, unknown>} item
 * @param {Record<string, string|null>} tags
 * @returns {string[]}
 */
export function resolveItemAlternativeTags(item, tags) {
  const id = String(item.id ?? '');
  /** @type {string[]} */
  const result = [];
  if (tags.best_match === id) result.push('best_match');
  if (tags.lowest_risk === id) result.push('lowest_risk');
  if (tags.best_value === id) result.push('best_value');
  if (tags.budget_friendly === id) result.push('budget_friendly');
  if (tags.premium_choice === id) result.push('premium_choice');
  return result;
}

/** @type {Readonly<Record<string, string>>} */
export const ALTERNATIVE_TAG_LABELS_TR = Object.freeze({
  best_match: 'En iyi eşleşme',
  lowest_risk: 'En düşük risk',
  best_value: 'En iyi değer',
  budget_friendly: 'Bütçe dostu',
  premium_choice: 'Premium seçim'
});
