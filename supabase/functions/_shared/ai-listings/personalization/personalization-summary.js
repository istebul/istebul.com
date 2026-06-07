/**
 * Personalization Summary — Turkish-safe personalized copy (Sprint-32 / Faz E).
 */

/** @type {Readonly<string[]>} */
export const PERSONALIZATION_FORBIDDEN_PHRASES = Object.freeze([
  'garanti',
  'kesin kazanç',
  'piyasa manipülasyonu',
  'içeriden bilgi'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizePersonalizationText(text) {
  let output = String(text ?? '').trim();
  for (const phrase of PERSONALIZATION_FORBIDDEN_PHRASES) {
    const re = new RegExp(phrase, 'gi');
    output = output.replace(re, '');
  }
  return output.trim() || 'Kişiselleştirilmiş özet hazırlanıyor.';
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenPersonalizationPhrase(text) {
  const lower = String(text ?? '').toLocaleLowerCase('tr-TR');
  return PERSONALIZATION_FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * @param {Record<string, unknown>} decisionResult
 * @param {Record<string, unknown>} styleResult
 * @param {Record<string, unknown>} profileResult
 * @returns {Record<string, unknown>}
 */
export function buildPersonalizedDecisionSummary(decisionResult, styleResult, profileResult) {
  const styleLabel = String(styleResult.primaryStyleLabel ?? 'Kalite odaklı karar stili');
  const topPreference = /** @type {Array<Record<string, unknown>>} */ (profileResult.items ?? [])
    .slice()
    .sort((a, b) => Number(b.value) - Number(a.value))[0];

  const headline = sanitizePersonalizationText(
    `${styleLabel} profilinize göre karar özeti hazırlandı.`
  );

  const bullets = [];

  if (topPreference) {
    bullets.push(
      sanitizePersonalizationText(
        `Öncelik: ${topPreference.label} (${topPreference.value}/100).`
      )
    );
  }

  const positiveFactors = /** @type {string[]} */ (decisionResult.positiveFactors ?? []);
  if (positiveFactors.length > 0) {
    bullets.push(sanitizePersonalizationText(`Güçlü yön: ${positiveFactors[0]}.`));
  }

  const riskFactors = /** @type {string[]} */ (decisionResult.riskFactors ?? []);
  if (riskFactors.length > 0) {
    bullets.push(sanitizePersonalizationText(`Dikkat: ${riskFactors[0]}.`));
  }

  bullets.push(
    sanitizePersonalizationText(
      'Bu özet yalnızca açıklama ve gösterim katmanını kişiselleştirir; ana skorlar değişmez.'
    )
  );

  return {
    headline,
    bullets: bullets.slice(0, 4),
    styleLabel,
    explainable: true
  };
}
