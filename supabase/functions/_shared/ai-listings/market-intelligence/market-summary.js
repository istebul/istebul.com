/**
 * Market Intelligence — Turkish summary and reasons (Sprint-7).
 */

import { FORBIDDEN_MARKET_PHRASES, getSegmentLabel } from './market-model.js';

/**
 * @param {string} label
 * @returns {string}
 */
function normalizeDemandLabelForSummary(label) {
  const value = String(label ?? '').trim();
  if (!value) return 'belirsiz';
  return value.toLocaleLowerCase('tr-TR');
}

/**
 * @param {string} label
 * @returns {string}
 */
function normalizeLiquidityLabelForSummary(label) {
  const value = String(label ?? '').trim();
  if (!value) return 'belirsiz';
  if (value === 'Çok iyi') return 'çok iyi';
  return value.toLocaleLowerCase('tr-TR');
}

/**
 * @param {{
 *   segment: string,
 *   demand_label: string,
 *   liquidity_label: string
 * }} input
 */
export function buildMarketSummary(input) {
  const segmentLabel = getSegmentLabel(input.segment);
  const demand = normalizeDemandLabelForSummary(input.demand_label);
  const liquidity = normalizeLiquidityLabelForSummary(input.liquidity_label);

  return (
    `Bu ilan ${segmentLabel} segmentinde değerlendirildi. ` +
    `Talep seviyesi ${demand}, likidite ${liquidity} görünüyor. ` +
    'Bu sonuç canlı piyasa verisi değil, girilen alanlara dayalı deterministik piyasa bağlamıdır.'
  );
}

/**
 * @param {{
 *   segment: string,
 *   demand_score: number,
 *   liquidity_score: number,
 *   market_context_score: number,
 *   market_trend: string
 * }} input
 * @returns {string[]}
 */
export function buildMarketReasons(input) {
  /** @type {string[]} */
  const reasons = [];

  reasons.push(`${getSegmentLabel(input.segment)} segmenti tespit edildi.`);

  if (input.demand_score >= 80) {
    reasons.push('Talep skoru yüksek bandında.');
  } else if (input.demand_score >= 60) {
    reasons.push('Talep skoru orta-yüksek bandında.');
  } else if (input.demand_score >= 40) {
    reasons.push('Talep skoru orta bandında.');
  } else {
    reasons.push('Talep skoru düşük bandında.');
  }

  if (input.liquidity_score >= 80) {
    reasons.push('Likidite göstergeleri çok iyi.');
  } else if (input.liquidity_score >= 60) {
    reasons.push('Likidite göstergeleri iyi.');
  } else if (input.liquidity_score >= 40) {
    reasons.push('Likidite göstergeleri orta.');
  } else {
    reasons.push('Likidite göstergeleri düşük.');
  }

  reasons.push(`Piyasa bağlam skoru ${input.market_context_score}, eğilim ${input.market_trend}.`);

  return reasons.slice(0, 5);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenMarketPhrase(text) {
  const normalized = String(text ?? '').toLocaleLowerCase('tr-TR');
  return FORBIDDEN_MARKET_PHRASES.some((phrase) => normalized.includes(phrase));
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function findForbiddenMarketPhrases(text) {
  const normalized = String(text ?? '').toLocaleLowerCase('tr-TR');
  return FORBIDDEN_MARKET_PHRASES.filter((phrase) => normalized.includes(phrase));
}
