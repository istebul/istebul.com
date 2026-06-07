/**
 * AI Decision Report — final decision section (Sprint-19 v1).
 */

import { clampScore } from '../engine/score-utils.js';
import { getRecommendationLabel } from '../recommendation/fit-score-engine.js';
import { sanitizeReportText } from './executive-summary.js';

/** @type {ReadonlyArray<string>} */
export const FINAL_DECISION_LABELS = Object.freeze([
  'Çok uygun',
  'Uygun',
  'İncelenebilir',
  'Dikkatli ilerle',
  'Önerilmez'
]);

/**
 * @param {number} fitScore
 * @param {string} coachLabel
 * @returns {string}
 */
export function resolveFinalDecisionLabel(fitScore, coachLabel = '') {
  const score = Number(fitScore);
  const coach = String(coachLabel).toLowerCase();

  if (coach.includes('uygun görünmüyor') || coach.includes('önce doğrula') && score < 50) {
    return score < 40 ? 'Önerilmez' : 'Dikkatli ilerle';
  }
  if (coach.includes('güçlü') && score >= 85) return 'Çok uygun';
  if (coach.includes('dikkatli')) return score >= 60 ? 'İncelenebilir' : 'Dikkatli ilerle';

  const recLabel = getRecommendationLabel(score);
  if (recLabel === 'Dikkatli incelenmeli') return 'Dikkatli ilerle';
  if (recLabel === 'Önerilmez') return 'Önerilmez';
  return recLabel;
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {number}
 */
export function computeFinalConfidence(ctx) {
  const fit = Number(ctx.recommendation?.fit_score ?? 0);
  const coachConf = Number(ctx.coach?.confidence ?? 0);
  const simConf = Number(ctx.simulator?.confidence ?? 0);
  const quality = Number(ctx.recommendation?.quality_score ?? 50);
  const risk = Number(ctx.recommendation?.risk_score ?? 50);
  const weaknessCount = (ctx.weaknesses ?? []).length;

  let confidence = 18;
  confidence += fit * 0.25;
  confidence += coachConf * 0.25;
  if (ctx.simulator?.available) confidence += simConf * 0.1;
  confidence += quality * 0.12;
  confidence += (100 - risk) * 0.1;
  confidence -= weaknessCount * 3;

  return clampScore(Math.round(confidence));
}

/**
 * @param {string} label
 * @param {number} confidence
 * @returns {string}
 */
export function buildFinalDecisionExplanation(label, confidence) {
  const lower = String(label).toLowerCase();
  let tone = 'ön değerlendirme ile incelenebilir';
  if (lower.includes('çok uygun')) tone = 'profil ile güçlü uyum göstermektedir';
  else if (lower.includes('uygun')) tone = 'profil ile uyumlu görünmektedir';
  else if (lower.includes('dikkatli')) tone = 'dikkatli ilerlenmesi önerilir';
  else if (lower.includes('önerilmez')) tone = 'mevcut profil ile uyumu sınırlıdır';

  const confNote = confidence >= 70 ? 'Karar güveni yeterli düzeydedir' : 'Karar güveni sınırlı olabilir';

  return sanitizeReportText(
    `Mevcut bilgiler ışığında bu seçenek ${tone}. ${confNote}. Satın alma öncesinde doğrulama önerilir.`
  );
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {{ label: string, confidence: number, explanation: string }}
 */
export function buildFinalDecisionSection(ctx) {
  const fit = Number(ctx.recommendation?.fit_score ?? 0);
  const coachLabel = String(ctx.coach?.coach_label ?? '');
  const label = resolveFinalDecisionLabel(fit, coachLabel);
  const confidence = computeFinalConfidence(ctx);

  return {
    label,
    confidence,
    explanation: buildFinalDecisionExplanation(label, confidence)
  };
}
