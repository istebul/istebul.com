import type { BusinessAnalyticsSnapshot } from './analytics';

/** Scorer domain identifiers (aligned with analytics modules). */
export type BusinessScorerId =
  | 'revenue'
  | 'growth'
  | 'customer'
  | 'inventory'
  | 'cash-flow'
  | 'risk'
  | 'opportunity';

export type HealthBand = 'critical' | 'watch' | 'stable' | 'strong';

/** Single-responsibility scorer contract. */
export interface BusinessScorer {
  readonly id: BusinessScorerId;
  readonly label: string;
  /** Relative weight in overall Business Health Score. */
  readonly weight: number;
  score(snapshot: BusinessAnalyticsSnapshot): DomainScore;
}

/** Normalized domain score (0–100). */
export interface DomainScore {
  id: BusinessScorerId;
  label: string;
  score: number;
  weight: number;
  band: HealthBand;
  detail: string;
}

/** Executive KPI for Dashboard / Advisor consumption. */
export interface ExecutiveKpi {
  id: string;
  label: string;
  value: string;
  score: number;
  band: HealthBand;
  unit: 'score' | 'percent' | 'days';
}

/** Combined Business Health output. */
export interface BusinessHealthResult {
  /** Overall Business Health Score (0–100). */
  overallScore: number;
  band: HealthBand;
  label: string;
  domainScores: readonly DomainScore[];
  executiveKpis: readonly ExecutiveKpi[];
  /** Preserved analytics snapshot used for scoring. */
  analytics: BusinessAnalyticsSnapshot;
  generatedAt: string;
}

export interface ScoringEngineResult {
  domainScores: readonly DomainScore[];
  analytics: BusinessAnalyticsSnapshot;
}
