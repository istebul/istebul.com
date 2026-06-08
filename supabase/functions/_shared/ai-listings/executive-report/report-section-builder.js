/**
 * Executive Decision Report v1 — section builders (Sprint-26).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';
import { sanitizeExecutiveReportText } from './report-summary-engine.js';

/**
 * @param {string} title
 * @param {'positive'|'neutral'|'warning'|'negative'} status
 * @param {number} score
 * @param {string} summary
 * @param {string[]} bullets
 * @param {boolean} dataAvailable
 * @returns {Record<string, unknown>}
 */
export function buildSection(title, status, score, summary, bullets, dataAvailable) {
  return {
    title,
    status,
    score: clampScore(score),
    summary: sanitizeExecutiveReportText(summary),
    bullets: bullets.map((b) => sanitizeExecutiveReportText(b)),
    dataAvailable
  };
}

/**
 * @param {number} score
 * @returns {'positive'|'neutral'|'warning'|'negative'}
 */
export function resolveSectionStatus(score) {
  const s = clampScore(score);
  if (s >= 70) return 'positive';
  if (s >= 50) return 'neutral';
  if (s >= 35) return 'warning';
  return 'negative';
}

/**
 * @param {Record<string, unknown>|null} recommendation
 * @returns {Record<string, unknown>}
 */
export function buildRecommendationSection(recommendation) {
  if (!recommendation || !recommendation.id) {
    return buildSection(
      'Öneri',
      'neutral',
      0,
      'Öneri verisi mevcut değil; bu bölüm sınırlı bilgiyle oluşturuldu.',
      ['Öneri skoru hesaplanamadı'],
      false
    );
  }

  const score = clampScore(safeNumber(recommendation.fit_score ?? recommendation.score));
  const label = String(recommendation.recommendation_label ?? 'Değerlendirme');
  const reasons = Array.isArray(recommendation.reasons) ? recommendation.reasons : [];
  const risks = Array.isArray(recommendation.risks) ? recommendation.risks : [];

  /** @type {string[]} */
  const bullets = [`Uyum skoru: ${score}`, `Öneri etiketi: ${label}`];
  if (reasons.length) bullets.push(...reasons.slice(0, 3).map(String));
  if (risks.length) bullets.push(`Risk notu: ${risks[0]}`);

  return buildSection(
    'Öneri',
    resolveSectionStatus(score),
    score,
    `Profil uyumu ${score} puan ile ${label.toLowerCase()} seviyesinde görünüyor.`,
    bullets.slice(0, 5),
    true
  );
}

/**
 * @param {Record<string, unknown>|null} ownershipCost
 * @returns {Record<string, unknown>}
 */
export function buildOwnershipCostSection(ownershipCost) {
  if (!ownershipCost || ownershipCost.total_cost == null) {
    return buildSection(
      'Sahip Olma Maliyeti',
      'neutral',
      0,
      'Toplam maliyet verisi eksik; maliyet bölümü sınırlı bilgiyle oluşturuldu.',
      ['Maliyet simülasyonu üretilemedi'],
      false
    );
  }

  const riskLevel = String(ownershipCost.cost_risk_level ?? 'medium');
  const score =
    riskLevel === 'low' ? 78 : riskLevel === 'high' ? 32 : riskLevel === 'medium' ? 55 : 50;
  const totalCost = safeNumber(ownershipCost.total_cost);
  const monthly = safeNumber(ownershipCost.monthly_estimate);

  /** @type {string[]} */
  const bullets = [];
  if (totalCost > 0) bullets.push(`Tahmini toplam maliyet: ${totalCost.toLocaleString('tr-TR')} TRY`);
  if (monthly > 0) bullets.push(`Aylık tahmin: ${monthly.toLocaleString('tr-TR')} TRY`);
  bullets.push(`Maliyet riski: ${riskLevel}`);

  const warnings = Array.isArray(ownershipCost.warnings) ? ownershipCost.warnings : [];
  if (warnings.length) bullets.push(String(warnings[0]));

  return buildSection(
    'Sahip Olma Maliyeti',
    resolveSectionStatus(score),
    score,
    String(ownershipCost.cost_summary ?? 'Toplam sahip olma maliyeti hesaplandı.'),
    bullets.slice(0, 5),
    true
  );
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {Record<string, unknown>}
 */
export function buildQualityTrustSection(signals) {
  const qualityScore = clampScore(safeNumber(signals.qualityScore));
  const trustScore = clampScore(safeNumber(signals.trustScore));
  const combined = Math.round((qualityScore + trustScore) / 2);
  const hasData = qualityScore > 0 || trustScore > 0;

  if (!hasData) {
    return buildSection(
      'Kalite ve Güven',
      'neutral',
      0,
      'Kalite ve güven verisi sınırlı; bu bölüm varsayılan değerlerle oluşturuldu.',
      ['Kalite skoru hesaplanamadı', 'Güven skoru hesaplanamadı'],
      false
    );
  }

  /** @type {string[]} */
  const bullets = [
    `Kalite skoru: ${qualityScore}`,
    `Güven skoru: ${trustScore}`
  ];

  if (Number(signals.duplicateRisk) >= 40) bullets.push('Mükerrer ilan riski dikkat gerektiriyor');
  if (Number(signals.staleRisk) >= 45) bullets.push('İlan güncelliği doğrulanmalı');

  const status = resolveSectionStatus(combined);
  const summary =
    combined >= 65
      ? 'İlan kalitesi ve güven sinyalleri genel olarak yeterli görünüyor.'
      : combined >= 45
        ? 'Kalite ve güven sinyalleri karışık; ek doğrulama önerilir.'
        : 'Kalite ve güven sinyalleri zayıf; temkinli değerlendirme önerilir.';

  return buildSection('Kalite ve Güven', status, combined, summary, bullets.slice(0, 5), true);
}

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>|null} purchaseDecision
 * @returns {Record<string, unknown>}
 */
export function buildNegotiationSection(signals, purchaseDecision) {
  const negotiationScore = clampScore(safeNumber(signals.negotiationSignal));
  const hasData = Boolean(signals.hasNegotiationData) || negotiationScore > 0;

  if (!hasData) {
    return buildSection(
      'Pazarlık Zekâsı',
      'neutral',
      0,
      'Pazarlık sinyali sınırlı; pazarlık bölümü varsayılan değerlerle oluşturuldu.',
      ['Pazarlık verisi mevcut değil'],
      false
    );
  }

  /** @type {string[]} */
  const bullets = [`Pazarlık sinyali: ${negotiationScore}`];

  const scenarios = Array.isArray(purchaseDecision?.negotiationScenario)
    ? purchaseDecision.negotiationScenario
    : [];
  for (const scenario of scenarios.slice(0, 2)) {
    const s = /** @type {Record<string, unknown>} */ (scenario);
    bullets.push(`%${s.discountPct} indirim senaryosu: ${s.estimatedDecisionScore} puan`);
  }

  if (signals.priceUncertainty) bullets.push('Fiyat belirsizliği mevcut');

  const summary =
    negotiationScore >= 60
      ? 'Pazarlık sinyalleri olumlu görünüyor; fiyat görüşmesi değerlendirilebilir.'
      : negotiationScore >= 40
        ? 'Pazarlık potansiyeli sınırlı; fiyat doğrulaması önerilir.'
        : 'Pazarlık sinyalleri zayıf; fiyat ve koşullar dikkatle incelenmeli.';

  return buildSection(
    'Pazarlık Zekâsı',
    resolveSectionStatus(negotiationScore),
    negotiationScore,
    summary,
    bullets.slice(0, 5),
    true
  );
}

/**
 * @param {Record<string, unknown>|null} purchaseDecision
 * @returns {Record<string, unknown>}
 */
export function buildPurchaseDecisionSection(purchaseDecision) {
  if (!purchaseDecision || purchaseDecision.decisionScore == null) {
    return buildSection(
      'Satın Alma Kararı',
      'neutral',
      0,
      'Satın alma kararı verisi eksik; bu bölüm sınırlı bilgiyle oluşturuldu.',
      ['Karar skoru hesaplanamadı'],
      false
    );
  }

  const score = clampScore(safeNumber(purchaseDecision.decisionScore));
  const label = String(purchaseDecision.decisionLabel ?? '—');
  const action = String(purchaseDecision.primaryActionLabel ?? '—');
  const confidence = safeNumber(purchaseDecision.confidenceScore);

  /** @type {string[]} */
  const bullets = [
    `Karar skoru: ${score}`,
    `Karar etiketi: ${label}`,
    `Önerilen eylem: ${action}`,
    `Güven skoru: ${confidence}`
  ];

  const positives = Array.isArray(purchaseDecision.positiveFactors) ? purchaseDecision.positiveFactors : [];
  if (positives.length) bullets.push(`Olumlu: ${positives[0]}`);

  return buildSection(
    'Satın Alma Kararı',
    resolveSectionStatus(score),
    score,
    String(purchaseDecision.summary ?? `Karar seviyesi ${label} olarak değerlendirildi.`),
    bullets.slice(0, 5),
    true
  );
}

/**
 * @param {Record<string, unknown>|null} explainability
 * @returns {Record<string, unknown>}
 */
export function buildExplainabilitySection(explainability) {
  if (!explainability || explainability.explanationScore == null) {
    return buildSection(
      'Karar Açıklaması',
      'neutral',
      0,
      'Karar açıklaması kısmi; açıklama bölümü sınırlı bilgiyle oluşturuldu.',
      ['Açıklama skoru hesaplanamadı'],
      false
    );
  }

  const score = clampScore(safeNumber(explainability.explanationScore));
  const label = String(explainability.explanationLabel ?? '—');

  /** @type {string[]} */
  const bullets = [
    `Açıklama skoru: ${score}`,
    `Açıklama seviyesi: ${label}`
  ];

  const drivers = Array.isArray(explainability.topPositiveDrivers) ? explainability.topPositiveDrivers : [];
  if (drivers.length) {
    const d = /** @type {Record<string, unknown>} */ (drivers[0]);
    bullets.push(`Olumlu faktör: ${d.label}`);
  }

  const gaps = Array.isArray(explainability.dataGaps) ? explainability.dataGaps : [];
  if (gaps.length) bullets.push(String(gaps[0]));

  return buildSection(
    'Karar Açıklaması',
    resolveSectionStatus(score),
    score,
    String(explainability.reasoningSummary ?? explainability.userFriendlyExplanation ?? 'Karar açıklaması üretildi.'),
    bullets.slice(0, 5),
    true
  );
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {Record<string, unknown>}
 */
export function buildDecisionSnapshot(ctx) {
  const recommendation = /** @type {Record<string, unknown>} */ (ctx.recommendation ?? {});
  const pd = /** @type {Record<string, unknown>} */ (ctx.purchase_decision ?? {});
  const exp = /** @type {Record<string, unknown>} */ (ctx.explainability ?? {});
  const signals = /** @type {Record<string, unknown>} */ (ctx.signals ?? {});

  return {
    primaryDecisionLabel: String(pd.decisionLabel ?? 'Değerlendirme aşamasında'),
    decisionScore: clampScore(safeNumber(pd.decisionScore)),
    confidenceScore: clampScore(safeNumber(pd.confidenceScore)),
    riskLevel: String(pd.riskLevel ?? signals.riskLevel ?? 'medium'),
    primaryAction: String(pd.primaryAction ?? 'evaluate'),
    recommendationScore: clampScore(safeNumber(recommendation.fit_score ?? recommendation.score ?? signals.recommendationScore)),
    qualityScore: clampScore(safeNumber(signals.qualityScore)),
    trustScore: clampScore(safeNumber(signals.trustScore)),
    explanationScore: clampScore(safeNumber(exp.explanationScore))
  };
}
