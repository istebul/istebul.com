import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type { BusinessScorer, DomainScore } from '../models/business-health';
import { normalizeToScore, scoreToBand } from '../utils/score-normalizer';

/** Scores customer-base growth. */
export const GrowthScorer: BusinessScorer = Object.freeze({
  id: 'growth',
  label: 'Growth',
  weight: 1.0,
  score(snapshot: BusinessAnalyticsSnapshot): DomainScore {
    const score = normalizeToScore(snapshot.growth, { scale: 4 });
    return Object.freeze({
      id: 'growth',
      label: 'Growth',
      score,
      weight: 1.0,
      band: scoreToBand(score),
      detail: `Müşteri büyümesi ${snapshot.growth}%`
    });
  }
});

export default GrowthScorer;
