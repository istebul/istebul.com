import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type {
  BusinessHealthResult,
  ScoringEngineResult
} from '../models/business-health';
import { createScoringEngine, ScoringEngine } from '../scoring/ScoringEngine';
import { computeWeightedScore } from '../utils/weighted-score';
import {
  bandFromOverall,
  buildExecutiveKpis,
  resolveHealthLabel
} from './ExecutiveScore';

export interface BusinessHealthEngineOptions {
  scoringEngine?: ScoringEngine;
}

/**
 * Business Health Engine — combines domain scorer outputs into a
 * normalized Business Health Score (0–100) and executive KPIs.
 */
export class BusinessHealthEngine {
  private readonly scoringEngine: ScoringEngine;
  private lastResult: BusinessHealthResult | null = null;

  constructor(options: BusinessHealthEngineOptions = {}) {
    this.scoringEngine = options.scoringEngine ?? createScoringEngine();
  }

  /**
   * Evaluate health from an analytics snapshot (runs scoring internally).
   */
  evaluate(analytics: BusinessAnalyticsSnapshot): BusinessHealthResult {
    const scoring = this.scoringEngine.score(analytics);
    return this.evaluateFromScores(scoring);
  }

  /**
   * Evaluate health from an existing ScoringEngine result.
   */
  evaluateFromScores(scoring: ScoringEngineResult): BusinessHealthResult {
    const overallScore = computeWeightedScore(scoring.domainScores);
    const band = bandFromOverall(overallScore);
    const label = resolveHealthLabel(overallScore, band);
    const executiveKpis = buildExecutiveKpis(
      scoring.domainScores,
      overallScore,
      band
    );

    this.lastResult = Object.freeze({
      overallScore,
      band,
      label,
      domainScores: scoring.domainScores,
      executiveKpis,
      analytics: scoring.analytics,
      generatedAt: scoring.analytics.asOf
    });
    return this.lastResult;
  }

  getLastResult(): BusinessHealthResult | null {
    return this.lastResult;
  }

  getScoringEngine(): ScoringEngine {
    return this.scoringEngine;
  }
}

export function createBusinessHealthEngine(
  options: BusinessHealthEngineOptions = {}
): BusinessHealthEngine {
  return new BusinessHealthEngine(options);
}

export default BusinessHealthEngine;
