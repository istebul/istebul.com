/**
 * Executive Decision Report v1 — summary, score, and safe language (Sprint-26).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';

/** @type {Readonly<Record<string, string>>} */
export const REPORT_LEVEL_LABELS = Object.freeze({
  complete: 'Tam rapor',
  strong: 'Güçlü rapor',
  partial: 'Kısmi rapor',
  weak: 'Zayıf rapor'
});

/** @type {Readonly<string[]>} */
export const EXECUTIVE_REPORT_FORBIDDEN_PHRASES = Object.freeze([
  'kesin alınır',
  'kesin al',
  'kaçırılmaz fırsat',
  'garanti kazanç',
  'garantili kazanç',
  'mutlaka al',
  'hemen al',
  'yatırım tavsiyesi',
  'finansal tavsiye',
  'hukuki tavsiye',
  'kesin kar',
  'garanti getiri'
]);

/** @type {Readonly<string[]>} */
export const DATA_LIMITATION_LABELS = Object.freeze([
  'Kritik ilan bilgileri eksik',
  'Fiyat doğrulaması sınırlı',
  'Görsel kanıt sınırlı',
  'Toplam maliyet verisi eksik',
  'Pazarlık sinyali sınırlı',
  'Karar açıklaması kısmi'
]);

/**
 * @param {number} score
 * @returns {'complete'|'strong'|'partial'|'weak'}
 */
export function resolveReportLevel(score) {
  const s = clampScore(score);
  if (s >= 80) return 'complete';
  if (s >= 65) return 'strong';
  if (s >= 45) return 'partial';
  return 'weak';
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {number}
 */
export function computeReportScore(ctx) {
  const signals = /** @type {Record<string, unknown>} */ (ctx.signals ?? {});
  const sections = /** @type {Record<string, unknown>[]} */ (ctx.sections ?? []);

  let score = 15;

  const availableSections = sections.filter((s) => s.dataAvailable === true).length;
  score += availableSections * 8;

  if (signals.hasPriceEvidence) score += 10;
  if (signals.hasImageEvidence) score += 8;
  if (signals.hasOwnershipCostData) score += 10;
  if (signals.hasNegotiationData) score += 8;

  const pd = /** @type {Record<string, unknown>|null} */ (ctx.purchase_decision ?? null);
  const exp = /** @type {Record<string, unknown>|null} */ (ctx.explainability ?? null);

  if (pd?.decisionScore != null) score += 12;
  if (exp?.explanationScore != null) score += 10;

  const missingCount = Number(signals.missingCritical?.length ?? 0);
  score -= missingCount * 6;

  if (!signals.hasPriceEvidence) score -= 8;
  if (!signals.hasImageEvidence) score -= 5;
  if (!signals.hasOwnershipCostData) score -= 7;
  if (!signals.hasNegotiationData) score -= 5;

  return clampScore(Math.round(score));
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeExecutiveReportText(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of EXECUTIVE_REPORT_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'değerlendirilebilir');
  }
  return safe;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenExecutiveReportPhrase(text) {
  const lower = String(text ?? '').toLowerCase();
  return EXECUTIVE_REPORT_FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string}
 */
export function buildExecutiveSummary(ctx) {
  const pd = /** @type {Record<string, unknown>} */ (ctx.purchase_decision ?? {});
  const reportLevel = String(ctx.reportLevel ?? 'partial');
  const decisionLabel = String(pd.decisionLabel ?? 'değerlendirme aşamasında');
  const hasMissing = Number(ctx.signals?.missingCritical?.length ?? 0) > 0;
  const hasCost = Boolean(ctx.signals?.hasOwnershipCostData);
  const hasPrice = Boolean(ctx.signals?.hasPriceEvidence);

  let tone = 'Karar seviyesi dengeli görünse de';
  if (reportLevel === 'complete' || reportLevel === 'strong') {
    tone = 'Karar seviyesi olumlu görünse de';
  } else if (reportLevel === 'weak') {
    tone = 'Mevcut veriler sınırlı olduğundan karar seviyesi temkinli görünse de';
  }

  const verificationParts = [];
  if (!hasPrice) verificationParts.push('fiyat');
  if (hasMissing) verificationParts.push('belge');
  if (!hasCost) verificationParts.push('maliyet');
  const verificationNote =
    verificationParts.length > 0
      ? `${verificationParts.join(', ')} doğrulamalarının tamamlanması karar güvenini artıracaktır`
      : 'doğrulama adımlarının tamamlanması karar güvenini artıracaktır';

  const summary = `Bu rapor, mevcut ilan verileri ve hesaplanan karar sinyalleri üzerinden hazırlanmıştır. ${tone} (${decisionLabel}) ${verificationNote}.`;

  return sanitizeExecutiveReportText(summary);
}

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>} [explainability]
 * @returns {string[]}
 */
export function buildDataLimitations(signals, explainability = {}) {
  /** @type {string[]} */
  const limitations = [];

  const missing = Array.isArray(signals.missingCritical) ? signals.missingCritical : [];
  if (missing.length > 0) limitations.push(DATA_LIMITATION_LABELS[0]);
  if (!signals.hasPriceEvidence) limitations.push(DATA_LIMITATION_LABELS[1]);
  if (!signals.hasImageEvidence) limitations.push(DATA_LIMITATION_LABELS[2]);
  if (!signals.hasOwnershipCostData) limitations.push(DATA_LIMITATION_LABELS[3]);
  if (!signals.hasNegotiationData) limitations.push(DATA_LIMITATION_LABELS[4]);

  const expScore = safeNumber(explainability.explanationScore);
  if (expScore > 0 && expScore < 55) limitations.push(DATA_LIMITATION_LABELS[5]);
  if (!explainability.explanationScore && !signals.hasNegotiationData) {
    if (!limitations.includes(DATA_LIMITATION_LABELS[5])) {
      limitations.push(DATA_LIMITATION_LABELS[5]);
    }
  }

  return [...new Set(limitations)];
}

/**
 * @param {string} category
 * @param {Record<string, unknown>} signals
 * @returns {string[]}
 */
export function buildVerificationChecklist(category, signals) {
  const cat = String(category ?? 'vehicle').toLowerCase();

  /** @type {string[]} */
  const checklist = [];

  if (cat.includes('vehicle') || cat === 'arac') {
    checklist.push('Tramer / hasar kaydı kontrolü');
    checklist.push('Ekspertiz raporu doğrulaması');
    checklist.push('Kilometre ve bakım geçmişi');
    checklist.push('Ruhsat / şasi doğrulama');
    checklist.push('Toplam maliyet kontrolü');
  } else if (cat.includes('housing') || cat === 'konut' || cat === 'real_estate') {
    checklist.push('Tapu durumu kontrolü');
    checklist.push('İskân belgesi doğrulaması');
    checklist.push('Aidat ve gider kalemleri');
    checklist.push('Deprem / bina bilgisi');
    checklist.push('Finansman maliyeti');
    checklist.push('Emsal fiyat karşılaştırması');
  } else {
    checklist.push('İptal koşulları incelemesi');
    checklist.push('Konum doğrulama');
    checklist.push('Ek ücretler kontrolü');
    checklist.push('Yorum geçmişi');
    checklist.push('Tarih / kapasite uyumu');
  }

  const missing = Array.isArray(signals.missingCritical) ? signals.missingCritical : [];
  for (const field of missing.slice(0, 3)) {
    checklist.push(`${field} bilgisi doğrulanmalı`);
  }

  return [...new Set(checklist)].slice(0, 8);
}
