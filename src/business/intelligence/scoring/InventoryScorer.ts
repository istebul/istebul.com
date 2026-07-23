import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type { BusinessScorer, DomainScore } from '../models/business-health';
import { clampScore } from '../utils/analytics-score';
import { scoreToBand } from '../utils/score-normalizer';

/** Scores inventory coverage (more days remaining → healthier). */
export const InventoryScorer: BusinessScorer = Object.freeze({
  id: 'inventory',
  label: 'Inventory',
  weight: 0.9,
  score(snapshot: BusinessAnalyticsSnapshot): DomainScore {
    const days = snapshot.stockDaysRemaining;
    // 14+ days ≈ healthy; below 7 days sharply penalized.
    const score = clampScore(Math.round((days / 14) * 100), 0, 100);
    return Object.freeze({
      id: 'inventory',
      label: 'Inventory',
      score,
      weight: 0.9,
      band: scoreToBand(score),
      detail: `Stok kapsamı ${days} gün`
    });
  }
});

export default InventoryScorer;
