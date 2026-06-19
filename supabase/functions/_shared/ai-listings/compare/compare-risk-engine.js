/**
 * Compare Intelligence v1 — risk comparison (Sprint-27).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';
import { sanitizeCompareText } from './compare-summary.js';

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {Record<string, unknown>}
 */
export function buildRiskComparison(items) {
  const riskItems = items.map((item) => {
    const ctx = /** @type {Record<string, unknown>} */ (item._context ?? {});
    const signals = /** @type {Record<string, unknown>} */ (ctx.signals ?? {});
    const pd = /** @type {Record<string, unknown>} */ (ctx.purchase_decision ?? {});

    const riskLevel = String(pd.riskLevel ?? 'medium');
    const riskScore = clampScore(safeNumber(signals.riskPenalty));
    const missingCount = Number(signals.missingCritical?.length ?? 0);
    const duplicateRisk = safeNumber(signals.duplicateRisk);
    const staleRisk = safeNumber(signals.staleRisk);

    /** @type {string[]} */
    const flags = [];
    if (missingCount >= 2) flags.push('Eksik kritik bilgi');
    if (duplicateRisk >= 40) flags.push('Mükerrer ilan riski');
    if (staleRisk >= 45) flags.push('Güncellik riski');
    if (signals.priceUncertainty) flags.push('Fiyat belirsizliği');

    return {
      id: item.id,
      title: item.title,
      riskLevel,
      riskScore,
      missingCount,
      flags
    };
  });

  const lowestRisk = riskItems.reduce(
    (a, b) => (b.riskScore < a.riskScore ? b : a),
    riskItems[0] ?? { riskScore: 100 }
  );
  const highestRisk = riskItems.reduce(
    (a, b) => (b.riskScore > a.riskScore ? b : a),
    riskItems[0] ?? { riskScore: 0 }
  );

  return {
    items: riskItems,
    lowestRiskId: lowestRisk.id ?? null,
    highestRiskId: highestRisk.id ?? null,
    summary: sanitizeCompareText(
      riskItems.length >= 2
        ? `En düşük risk profili "${lowestRisk.title ?? '—'}" seçeneğinde görünüyor.`
        : 'Risk karşılaştırması için yeterli veri yok.'
    )
  };
}
