/**
 * Negotiation Intelligence — client display model (Faz N-3).
 */

/** @type {Readonly<Record<string, string>>} */
export const NEGOTIATION_RISK_LABELS_TR = Object.freeze({
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek'
});

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatNumberTr(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Math.round(n));
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatNegotiationCurrency(value) {
  const formatted = formatNumberTr(value);
  if (formatted === '—') return formatted;
  return `${formatted} TL`;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function clampConfidencePercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const pct = n <= 1 ? n * 100 : n;
  return Math.round(Math.max(0, Math.min(100, pct)));
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatDiscountPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 10) / 10;
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1
  }).format(rounded);
  return `%${formatted}`;
}

/**
 * @param {unknown} items
 * @returns {Array<Record<string, unknown>>}
 */
function safeArray(items) {
  return Array.isArray(items) ? items : [];
}

/**
 * @param {Record<string, unknown>|null|undefined} result
 * @param {{ title?: string }} [meta]
 * @returns {Record<string, unknown>}
 */
export function buildNegotiationDisplayModel(result, meta = {}) {
  const title = String(meta.title ?? 'Pazarlık Analizi').trim() || 'Pazarlık Analizi';

  if (!result || typeof result !== 'object') {
    return {
      hasData: false,
      title,
      emptyMessage: 'Pazarlık analizi şu anda üretilemedi.'
    };
  }

  const riskLevel = String(result.negotiationRisk ?? 'medium').toLowerCase();
  const minOffer = result.minOffer;
  const maxOffer = result.maxOffer;
  const minText = formatNumberTr(minOffer);
  const maxText = formatNumberTr(maxOffer);
  const bandText = minText === '—' || maxText === '—' ? '—' : `${minText} – ${maxText} TL`;

  return {
    hasData: true,
    title,
    targetOfferText: formatNegotiationCurrency(result.targetOffer),
    bandText,
    discountPercentText: formatDiscountPercent(result.discountPercent),
    riskLabel: NEGOTIATION_RISK_LABELS_TR[riskLevel] ?? NEGOTIATION_RISK_LABELS_TR.medium,
    riskLevel,
    confidencePercent: clampConfidencePercent(result.confidence),
    summary: String(result.summary ?? '').trim(),
    checklist: safeArray(result.checklist),
    warnings: safeArray(result.warnings).map((item) => String(item ?? '').trim()).filter(Boolean),
    evidenceSignals: safeArray(result.evidenceSignals)
  };
}
