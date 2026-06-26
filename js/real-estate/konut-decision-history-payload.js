/**
 * Konut decision history payload for canonical entry builder.
 * Maps existing housing metrics/state — no new score or risk calculations.
 */

export const KONUT_DECISION_HISTORY_MAX = 80;

/**
 * @param {{ city?: string, district?: string, purchasePurpose?: string }} state
 * @returns {string}
 */
export function formatKonutLocationLabel(state) {
  const il = String(state.city || '').trim();
  const ilce = String(state.district || '').trim();
  if (il && ilce) return `${il} / ${ilce}`;
  return il || ilce || 'Konut analizi';
}

/**
 * @param {object} state
 * @returns {Array<{ id: string, label: string, value: string }>}
 */
export function buildKonutHistoryAnswers(state) {
  const answers = [];
  if (state.purchasePurpose) {
    answers.push({ id: 'purchasePurpose', label: 'Amaç', value: String(state.purchasePurpose) });
  }
  if (state.city) {
    answers.push({ id: 'city', label: 'İl', value: String(state.city) });
  }
  if (state.district) {
    answers.push({ id: 'district', label: 'İlçe', value: String(state.district) });
  }
  if (state.homeType) {
    answers.push({ id: 'homeType', label: 'Konut tipi', value: String(state.homeType) });
  }
  return answers;
}

/**
 * @param {object} metrics
 * @param {string} aiText
 * @param {object} state
 * @returns {object}
 */
export function buildKonutDecisionHistoryPayload(metrics, aiText, state) {
  const locationName = `${formatKonutLocationLabel(state)} · ${state.purchasePurpose || 'Konut'}`;
  const summaryText = String(aiText || '').slice(0, 220);
  const riskLevel = metrics?.risk?.label ? String(metrics.risk.label) : null;
  const answers = buildKonutHistoryAnswers(state);

  return {
    id: `konut-${Date.now()}`,
    categoryId: 'konut',
    categoryName: 'Konut',
    createdAt: new Date().toISOString(),
    source: 'konut',
    summary: summaryText,
    rawAnswers: {
      purchasePurpose: state.purchasePurpose || '',
      city: state.city || '',
      district: state.district || '',
      homeType: state.homeType || ''
    },
    answers,
    insight: {
      headline: locationName
    },
    recommendations: [
      {
        name: locationName,
        score: metrics.score,
        price: 0,
        yearlyCost: metrics.ownership?.realTotal ?? null,
        riskLevel,
        scoreNote: summaryText || undefined,
        financeComparisons: [
          { monthlyPayment: metrics.ownership?.monthlyPayment ?? null }
        ]
      }
    ]
  };
}
