/**
 * Negotiation Intelligence — Turkish summary, warnings, safe language (Faz N-1).
 */

import { safeNumber } from '../engine/score-utils.js';

/** @type {Readonly<string[]>} */
export const NEGOTIATION_FORBIDDEN_PHRASES = Object.freeze([
  'kesin',
  'garanti',
  'mutlaka al',
  'risksiz',
  'zararsız',
  'en iyi fırsat',
  'kesin alınır',
  'garantili kazanç',
  'kaçırılmaz fırsat'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeNegotiationText(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of NEGOTIATION_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'değerlendirilebilir');
  }
  return safe;
}

/**
 * @param {'low'|'medium'|'high'} risk
 * @returns {string}
 */
function riskLabelTr(risk) {
  if (risk === 'low') return 'düşük';
  if (risk === 'high') return 'yüksek';
  return 'orta';
}

/**
 * @param {Record<string, unknown>} input
 * @param {ReturnType<typeof import('./offer-range-engine.js').buildOfferRange>} offerRange
 * @param {ReturnType<typeof import('./negotiation-risk-engine.js').assessNegotiationRisk>} riskResult
 * @param {Array<{ id: string, label: string, status: string }>} checklist
 * @returns {{ summary: string, warnings: string[] }}
 */
export function buildNegotiationSummary(input, offerRange, riskResult, checklist) {
  const warnings = [];
  const qualitySignal = /** @type {Record<string, unknown>} */ (input.qualitySignal ?? {});
  const verificationLevel = String(qualitySignal.verificationLevel ?? 'none').toLowerCase();
  const inputConfidence = safeNumber(input.confidence) || 0.5;

  if (!offerRange.hasMarketReference) {
    warnings.push('Piyasa referans verisi eksik; teklif bandı geniş tutuldu.');
  }

  if (inputConfidence < 0.55) {
    warnings.push('Girdi güveni düşük; teklif önerisi muhafazakâr hesaplandı.');
  }

  if (verificationLevel === 'none') {
    warnings.push('Doğrulama seviyesi yetersiz; ek belge kontrolü önerilir.');
  }

  const warnChecklistCount = checklist.filter((item) => item.status === 'warn').length;
  if (warnChecklistCount >= 2) {
    warnings.push('Kontrol listesinde birden fazla uyarı var; teklif öncesi doğrulama önerilir.');
  }

  const priceText = new Intl.NumberFormat('tr-TR').format(safeNumber(input.price));
  const targetText = new Intl.NumberFormat('tr-TR').format(offerRange.targetOffer);
  const minText = new Intl.NumberFormat('tr-TR').format(offerRange.minOffer);
  const maxText = new Intl.NumberFormat('tr-TR').format(offerRange.maxOffer);

  let summary = `İlan fiyatı ${priceText} TL için hedef teklif ${targetText} TL civarında değerlendirilebilir. `;
  summary += `Önerilen bant ${minText}–${maxText} TL aralığında; pazarlık riski ${riskLabelTr(riskResult.negotiationRisk)}. `;

  if (offerRange.hasMarketReference && offerRange.priceDeltaPct !== null) {
    if (offerRange.priceDeltaPct > 8) {
      summary += 'Fiyat piyasa referansının üzerinde görünüyor; indirim alanı daha geniş tutuldu.';
    } else if (offerRange.priceDeltaPct < -5) {
      summary += 'Fiyat piyasa referansının altında; teklif bandı dar tutuldu.';
    } else {
      summary += 'Fiyat piyasa referansına yakın; dengeli bir teklif bandı önerildi.';
    }
  } else {
    summary += 'Piyasa referansı sınırlı olduğu için teklif bandı temkinli hesaplandı.';
  }

  return {
    summary: sanitizeNegotiationText(summary),
    warnings: warnings.map((warning) => sanitizeNegotiationText(warning))
  };
}
