import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type { BusinessScorer, DomainScore } from '../models/business-health';
import { clampScore } from '../utils/analytics-score';
import { scoreToBand } from '../utils/score-normalizer';

/**
 * Scores operational risk contribution to health.
 * Lower analytics riskScore → higher health contribution.
 */
export const RiskScorer: BusinessScorer = Object.freeze({
  id: 'risk',
  label: 'Risk',
  weight: 1.3,
  score(snapshot: BusinessAnalyticsSnapshot): DomainScore {
    const score = clampScore(Math.round(100 - snapshot.riskScore), 0, 100);
    return Object.freeze({
      id: 'risk',
      label: 'Risk',
      score,
      weight: 1.3,
      band: scoreToBand(score),
      detail: `Risk Score ${snapshot.riskScore} → sağlık katkısı ${score}`
    });
  }
});

export default RiskScorer;
