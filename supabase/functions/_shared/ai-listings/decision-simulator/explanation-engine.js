/**
 * AI Decision Simulator — deterministic explanation (Sprint-18 v1).
 */

import { SUBSCORE_DELTA_LABELS } from './delta-engine.js';

/**
 * @param {{ positive_reasons?: string[], negative_reasons?: string[], changed_factors?: string[] }} delta
 * @param {string[]} [scenarioChanges]
 * @returns {string}
 */
export function buildSimulationExplanation(delta, scenarioChanges = []) {
  /** @type {string[]} */
  const bullets = [];

  const positives = delta.positive_reasons ?? [];
  const negatives = delta.negative_reasons ?? [];
  const factors = delta.changed_factors ?? [];

  for (const reason of positives) {
    bullets.push(`• ${reason}`);
  }
  for (const reason of negatives) {
    bullets.push(`• ${reason}`);
  }

  if (!bullets.length && factors.length) {
    for (const factor of factors) {
      bullets.push(`• ${factor} değişti`);
    }
  }

  if (!bullets.length && scenarioChanges.length) {
    bullets.push(`• ${scenarioChanges.join(', ')} parametreleri uygulandı`);
  }

  if (!bullets.length) {
    return 'Karar değişmedi; mevcut senaryo ile yeni senaryo benzer sonuç üretiyor.';
  }

  return `Karar değişti çünkü:\n\n${bullets.join('\n')}`;
}

/**
 * @param {Record<string, number>} oldSubscores
 * @param {Record<string, number>} newSubscores
 * @returns {string[]}
 */
export function buildFactorChangeList(oldSubscores, newSubscores) {
  /** @type {string[]} */
  const changes = [];

  for (const [key, label] of Object.entries(SUBSCORE_DELTA_LABELS)) {
    const oldVal = Number(oldSubscores[key] ?? 0);
    const newVal = Number(newSubscores[key] ?? 0);
    const diff = newVal - oldVal;
    if (Math.abs(diff) < 3) continue;
    const direction = diff > 0 ? 'arttı' : 'azaldı';
    changes.push(`${label} ${direction}`);
  }

  return changes;
}
