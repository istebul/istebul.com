/**
 * AI Decision Report — verification checklist section (Sprint-19 v1).
 */

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
export const VERIFICATION_CHECKLIST_BY_CATEGORY = Object.freeze({
  vehicle: Object.freeze(['ekspertiz', 'tramer', 'servis', 'km', 'boya']),
  housing: Object.freeze(['tapu', 'iskan', 'aidat', 'kredi', 'deprem']),
  real_estate: Object.freeze(['tapu', 'iskan', 'aidat', 'kredi', 'deprem']),
  travel: Object.freeze(['iptal şartı', 'yorumlar', 'konum', 'ek ücret', 'sezon']),
  vacation: Object.freeze(['iptal şartı', 'yorumlar', 'konum', 'ek ücret', 'sezon']),
  general: Object.freeze(['belge doğrulama', 'fiyat teyidi', 'iletişim doğrulama'])
});

/**
 * @param {string} category
 * @returns {string[]}
 */
export function resolveChecklistCategory(category) {
  const key = String(category ?? 'vehicle').toLowerCase();
  if (key === 'housing' || key === 'real_estate') return [...VERIFICATION_CHECKLIST_BY_CATEGORY.housing];
  if (key === 'travel' || key === 'vacation' || key === 'tatil') {
    return [...VERIFICATION_CHECKLIST_BY_CATEGORY.travel];
  }
  if (key === 'vehicle' || key === 'arac' || key === 'auto') {
    return [...VERIFICATION_CHECKLIST_BY_CATEGORY.vehicle];
  }
  return [...VERIFICATION_CHECKLIST_BY_CATEGORY.general];
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {{ items: Array<{ label: string, symbol: string }>, category: string }}
 */
export function buildVerificationSection(ctx) {
  const category = String(ctx.user_intent?.category ?? ctx.recommendation?.category ?? 'vehicle');
  const labels = resolveChecklistCategory(category);

  const coachQuestions = ctx.coach?.verification_questions ?? [];
  const merged = [...labels];
  if (Array.isArray(coachQuestions)) {
    for (const q of coachQuestions.slice(0, 2)) {
      const short = String(q).replace(/\?.*$/, '').slice(0, 30);
      if (short && !merged.some((m) => q.toLowerCase().includes(m))) merged.push(short);
    }
  }

  const items = [...new Set(merged)].slice(0, 8).map((label) => ({
    label: String(label),
    symbol: '□'
  }));

  return { items, category };
}
