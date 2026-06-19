/**
 * Executive Decision Report v1 — PDF/export payload (Sprint-26).
 */

import { sanitizeExecutiveReportText } from './report-summary-engine.js';

/** @type {Readonly<string[]>} */
export const PDF_DISCLAIMERS = Object.freeze([
  'Bu rapor karar destek amacıyla hazırlanmıştır.',
  'Nihai karar kullanıcıya aittir.',
  'Eksik veya hatalı veri sonuçları etkileyebilir.',
  'Bu içerik yatırım, finansal veya hukuki tavsiye değildir.'
]);

/**
 * @param {Record<string, unknown>} report
 * @returns {Record<string, unknown>}
 */
export function buildPdfPayload(report) {
  const snapshot = /** @type {Record<string, unknown>} */ (report.decisionSnapshot ?? {});
  const sections = [
    report.recommendationSection,
    report.ownershipCostSection,
    report.qualityTrustSection,
    report.negotiationSection,
    report.purchaseDecisionSection,
    report.explainabilitySection
  ].filter(Boolean);

  return {
    title: 'Executive Decision Report',
    generatedAt: new Date().toISOString(),
    category: String(report.category ?? 'vehicle'),
    summary: sanitizeExecutiveReportText(String(report.executiveSummary ?? '')),
    scores: {
      reportScore: report.reportScore,
      reportLevel: report.reportLevel,
      reportLabel: report.reportLabel,
      decisionScore: snapshot.decisionScore,
      confidenceScore: snapshot.confidenceScore,
      recommendationScore: snapshot.recommendationScore,
      qualityScore: snapshot.qualityScore,
      trustScore: snapshot.trustScore,
      explanationScore: snapshot.explanationScore
    },
    sections: sections.map((section) => {
      const s = /** @type {Record<string, unknown>} */ (section);
      return {
        title: s.title,
        status: s.status,
        score: s.score,
        summary: s.summary,
        bullets: s.bullets,
        dataAvailable: s.dataAvailable
      };
    }),
    risks: {
      topRisks: report.riskSummary?.topRisks ?? [],
      criticalWarnings: report.riskSummary?.criticalWarnings ?? [],
      riskLevel: report.riskSummary?.riskLevel ?? 'medium',
      riskExplanation: report.riskSummary?.riskExplanation ?? ''
    },
    actionPlan: report.actionPlan ?? {},
    disclaimers: [...PDF_DISCLAIMERS]
  };
}
