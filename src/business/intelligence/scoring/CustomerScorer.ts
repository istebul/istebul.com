import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type { BusinessScorer, DomainScore } from '../models/business-health';
import { clampScore } from '../utils/analytics-score';
import { scoreToBand } from '../utils/score-normalizer';

/** Scores customer health (already 0–100 from analytics). */
export const CustomerScorer: BusinessScorer = Object.freeze({
  id: 'customer',
  label: 'Customer',
  weight: 1.1,
  score(snapshot: BusinessAnalyticsSnapshot): DomainScore {
    const score = clampScore(Math.round(snapshot.customerHealth), 0, 100);
    return Object.freeze({
      id: 'customer',
      label: 'Customer',
      score,
      weight: 1.1,
      band: scoreToBand(score),
      detail: `Customer Health ${score}`
    });
  }
});

export default CustomerScorer;
