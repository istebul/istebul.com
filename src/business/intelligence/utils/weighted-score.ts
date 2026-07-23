import { clampScore } from './analytics-score';
import type { DomainScore } from '../models/business-health';

/**
 * Weighted average of domain scores (0–100).
 * Weights come from each DomainScore.weight.
 */
export function computeWeightedScore(scores: readonly DomainScore[]): number {
  if (scores.length === 0) return 0;
  let weightSum = 0;
  let weighted = 0;
  for (const item of scores) {
    const w = item.weight > 0 ? item.weight : 0;
    weightSum += w;
    weighted += item.score * w;
  }
  if (weightSum === 0) return 0;
  return clampScore(Math.round(weighted / weightSum), 0, 100);
}
