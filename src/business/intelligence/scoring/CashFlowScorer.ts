import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type { BusinessScorer, DomainScore } from '../models/business-health';
import { normalizeToScore, scoreToBand } from '../utils/score-normalizer';

/** Scores cash-flow health (cash drop lowers score). */
export const CashFlowScorer: BusinessScorer = Object.freeze({
  id: 'cash-flow',
  label: 'Cash Flow',
  weight: 1.2,
  score(snapshot: BusinessAnalyticsSnapshot): DomainScore {
    const score = normalizeToScore(snapshot.cashDropPercent, {
      neutral: 0,
      scale: 2,
      invert: true
    });
    return Object.freeze({
      id: 'cash-flow',
      label: 'Cash Flow',
      score,
      weight: 1.2,
      band: scoreToBand(score),
      detail: `Nakit düşüşü ≈${snapshot.cashDropPercent}%`
    });
  }
});

export default CashFlowScorer;
