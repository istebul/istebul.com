/**
 * Executive Decision Report v1 — risk summary (Sprint-26).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';
import { sanitizeExecutiveReportText } from './report-summary-engine.js';

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>|null} purchaseDecision
 * @param {Record<string, unknown>|null} ownershipCost
 * @returns {Record<string, unknown>}
 */
export function buildRiskSummary(signals, purchaseDecision, ownershipCost) {
  /** @type {Array<{ label: string, severity: number, explanation: string }>} */
  const riskItems = [];

  const riskFactors = Array.isArray(purchaseDecision?.riskFactors) ? purchaseDecision.riskFactors : [];
  for (const factor of riskFactors) {
    riskItems.push({
      label: String(factor),
      severity: 70,
      explanation: sanitizeExecutiveReportText(`${factor} karar sürecinde dikkate alınmalı.`)
    });
  }

  const missing = Array.isArray(signals.missingCritical) ? signals.missingCritical : [];
  for (const field of missing) {
    riskItems.push({
      label: `Eksik bilgi: ${field}`,
      severity: 65,
      explanation: sanitizeExecutiveReportText(`${field} bilgisi eksik; karar güvenini düşürebilir.`)
    });
  }

  if (Number(signals.duplicateRisk) >= 40) {
    riskItems.push({
      label: 'Mükerrer ilan riski',
      severity: 60,
      explanation: 'Benzer ilanlar tespit edildi; kaynak doğrulaması önerilir.'
    });
  }

  if (Number(signals.staleRisk) >= 45) {
    riskItems.push({
      label: 'Güncellik riski',
      severity: 55,
      explanation: 'İlan güncelliği düşük görünüyor; güncel durum doğrulanmalı.'
    });
  }

  if (signals.priceUncertainty) {
    riskItems.push({
      label: 'Fiyat belirsizliği',
      severity: 58,
      explanation: 'Fiyat doğrulaması sınırlı; piyasa karşılaştırması önerilir.'
    });
  }

  const costRisk = String(ownershipCost?.cost_risk_level ?? '');
  if (costRisk === 'high') {
    riskItems.push({
      label: 'Yüksek maliyet riski',
      severity: 62,
      explanation: 'Toplam sahip olma maliyeti yüksek risk seviyesinde görünüyor.'
    });
  }

  if (Number(signals.riskPenalty) >= 50) {
    riskItems.push({
      label: 'Genel risk sinyali',
      severity: Number(signals.riskPenalty),
      explanation: 'Risk sinyalleri karar sürecinde dikkatle değerlendirilmeli.'
    });
  }

  riskItems.sort((a, b) => b.severity - a.severity);

  const topRisks = riskItems.slice(0, 5).map((r) => ({
    label: sanitizeExecutiveReportText(r.label),
    severity: clampScore(r.severity),
    explanation: r.explanation
  }));

  const criticalWarnings = topRisks
    .filter((r) => r.severity >= 60)
    .slice(0, 3)
    .map((r) => r.label);

  const riskLevel = String(purchaseDecision?.riskLevel ?? resolveRiskLevelFromSignals(signals));

  let riskExplanation = 'Risk seviyesi dengeli görünüyor; standart doğrulama adımları önerilir.';
  if (riskLevel === 'high') {
    riskExplanation = 'Risk seviyesi yüksek; ek doğrulama ve temkinli değerlendirme önerilir.';
  } else if (riskLevel === 'low') {
    riskExplanation = 'Risk seviyesi düşük görünüyor; temel doğrulama adımları yeterli olabilir.';
  } else if (topRisks.length === 0) {
    riskExplanation = 'Belirgin risk sinyali tespit edilmedi; yine de doğrulama adımları önerilir.';
  }

  return {
    topRisks,
    criticalWarnings,
    riskLevel,
    riskExplanation: sanitizeExecutiveReportText(riskExplanation)
  };
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {'low'|'medium'|'high'}
 */
function resolveRiskLevelFromSignals(signals) {
  const penalty = safeNumber(signals.riskPenalty);
  const missing = Number(signals.missingCritical?.length ?? 0);
  if (penalty >= 55 || missing >= 3) return 'high';
  if (penalty >= 30 || missing >= 2) return 'medium';
  return 'low';
}
