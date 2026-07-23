import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type { BusinessScorer, DomainScore } from '../models/business-health';
import { normalizeToScore, scoreToBand } from '../utils/score-normalizer';

/** Scores revenue momentum (higher growth → higher score). */
export const RevenueScorer: BusinessScorer = Object.freeze({
  id: 'revenue',
  label: 'Revenue',
  weight: 1.2,
  score(snapshot: BusinessAnalyticsSnapshot): DomainScore {
    const score = normalizeToScore(snapshot.revenueDelta, { scale: 2.5 });
    return Object.freeze({
      id: 'revenue',
      label: 'Revenue',
      score,
      weight: 1.2,
      band: scoreToBand(score),
      detail: `Gelir değişimi ${snapshot.revenueDelta}%`
    });
  }
});

export default RevenueScorer;
