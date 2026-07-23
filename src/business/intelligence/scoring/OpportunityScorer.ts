import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type { BusinessScorer, DomainScore } from '../models/business-health';
import { clampScore } from '../utils/analytics-score';
import { scoreToBand } from '../utils/score-normalizer';

/** Scores margin opportunity strength. */
export const OpportunityScorer: BusinessScorer = Object.freeze({
  id: 'opportunity',
  label: 'Opportunity',
  weight: 0.8,
  score(snapshot: BusinessAnalyticsSnapshot): DomainScore {
    const margin = snapshot.topMarginPercent ?? 0;
    // 0–40% margin maps toward 0–100 score.
    const score = clampScore(Math.round((margin / 40) * 100), 0, 100);
    const category = snapshot.topMarginCategory ?? '—';
    return Object.freeze({
      id: 'opportunity',
      label: 'Opportunity',
      score,
      weight: 0.8,
      band: scoreToBand(score),
      detail: `En yüksek marj: ${category} (%${margin})`
    });
  }
});

export default OpportunityScorer;
