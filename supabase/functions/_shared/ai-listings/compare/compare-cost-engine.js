/**
 * Compare Intelligence v1 — cost comparison (Sprint-27).
 */

import { safeNumber } from '../engine/score-utils.js';
import { sanitizeCompareText } from './compare-summary.js';

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {Record<string, unknown>}
 */
export function buildCostComparison(items) {
  const costItems = items.map((item) => {
    const ctx = /** @type {Record<string, unknown>} */ (item._context ?? {});
    const ownershipCost = /** @type {Record<string, unknown>|null} */ (ctx.ownership_cost ?? null);

    return {
      id: item.id,
      title: item.title,
      totalCost: safeNumber(ownershipCost?.total_cost),
      monthlyEstimate: safeNumber(ownershipCost?.monthly_estimate),
      costRiskLevel: String(ownershipCost?.cost_risk_level ?? 'unknown'),
      costSignal: item.costSignal ?? 0,
      dataAvailable: Boolean(ownershipCost?.total_cost)
    };
  });

  const withCost = costItems.filter((c) => c.dataAvailable);
  const lowest = withCost.reduce(
    (a, b) => (b.totalCost < a.totalCost && b.totalCost > 0 ? b : a),
    withCost[0] ?? { totalCost: Infinity }
  );
  const highest = withCost.reduce(
    (a, b) => (b.totalCost > a.totalCost ? b : a),
    withCost[0] ?? { totalCost: 0 }
  );

  let summary = 'Maliyet karşılaştırması için yeterli veri yok.';
  if (withCost.length >= 2) {
    const diff = highest.totalCost - lowest.totalCost;
    summary = `"${lowest.title}" en düşük toplam maliyete sahip görünüyor${diff > 0 ? ` (${diff.toLocaleString('tr-TR')} TRY fark)` : ''}.`;
  } else if (withCost.length === 1) {
    summary = 'Yalnızca bir seçenekte maliyet verisi mevcut.';
  }

  return {
    items: costItems,
    lowestCostId: lowest.id ?? null,
    highestCostId: highest.id ?? null,
    summary: sanitizeCompareText(summary)
  };
}
