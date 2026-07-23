import type { BusinessAnalyticsSnapshot } from '../models/analytics';
import type {
  BusinessScorer,
  DomainScore,
  ScoringEngineResult
} from '../models/business-health';
import { CashFlowScorer } from './CashFlowScorer';
import { CustomerScorer } from './CustomerScorer';
import { GrowthScorer } from './GrowthScorer';
import { InventoryScorer } from './InventoryScorer';
import { OpportunityScorer } from './OpportunityScorer';
import { RevenueScorer } from './RevenueScorer';
import { RiskScorer } from './RiskScorer';

const BUILTIN_SCORERS: readonly BusinessScorer[] = Object.freeze([
  RevenueScorer,
  GrowthScorer,
  CustomerScorer,
  InventoryScorer,
  CashFlowScorer,
  RiskScorer,
  OpportunityScorer
]);

/**
 * Scoring Engine — runs registered domain scorers against an analytics snapshot.
 */
export class ScoringEngine {
  private readonly scorers: readonly BusinessScorer[];
  private lastResult: ScoringEngineResult | null = null;

  constructor(scorers: readonly BusinessScorer[] = BUILTIN_SCORERS) {
    this.scorers = scorers;
  }

  score(analytics: BusinessAnalyticsSnapshot): ScoringEngineResult {
    const domainScores: DomainScore[] = this.scorers.map((scorer) =>
      scorer.score(analytics)
    );
    this.lastResult = Object.freeze({
      domainScores: Object.freeze(domainScores),
      analytics
    });
    return this.lastResult;
  }

  getLastResult(): ScoringEngineResult | null {
    return this.lastResult;
  }

  listScorers(): readonly BusinessScorer[] {
    return this.scorers;
  }
}

export function createScoringEngine(
  scorers?: readonly BusinessScorer[]
): ScoringEngine {
  return new ScoringEngine(scorers);
}

export default ScoringEngine;
