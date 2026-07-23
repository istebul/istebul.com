/**
 * İSTEBUL Business Decision Engine — Recommendation Builder runtime sonucu (PR-103C).
 */

import type { DecisionRecommendation } from '../../models/DecisionRecommendation';
import type { RecommendationCategory } from './RecommendationCategory';
import type { RecommendationSeverity } from './RecommendationDefinition';
import type { RecommendationRecord } from './RecommendationRecord';

/**
 * Recommendation uyarısı.
 */
export interface RecommendationWarning {
  code: string;
  message: string;
  recommendationId?: string;
}

/**
 * Recommendation özeti.
 */
export interface RecommendationSummary {
  recommendationCount: number;
  informationalCount: number;
  warningCount: number;
  categoryCounts: Readonly<Partial<Record<RecommendationCategory, number>>>;
  severityCounts: Readonly<Partial<Record<RecommendationSeverity, number>>>;
  success: boolean;
}

/**
 * Recommendation telemetrisi.
 */
export interface RecommendationTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  recommendationCount: number;
  categoryCount: number;
  categoryDistribution: Readonly<
    Partial<Record<RecommendationCategory, number>>
  >;
  severityDistribution: Readonly<
    Partial<Record<RecommendationSeverity, number>>
  >;
  warningCount: number;
}

/**
 * Recommendation Builder Runtime çıktısı.
 */
export interface RecommendationResult {
  /** Zengin recommendation kayıtları */
  records: readonly RecommendationRecord[];
  /** Foundation DecisionRecommendation listesi */
  recommendations: readonly DecisionRecommendation[];
  /** Özet */
  summary: RecommendationSummary;
  /** Uyarılar */
  warnings: readonly RecommendationWarning[];
  /** Telemetri */
  telemetry: RecommendationTelemetry;
}

/** Pipeline bag anahtarı — Decision Engine */
export const PIPELINE_BAG_RECOMMENDATION_RUNTIME_RESULT_KEY =
  'recommendationRuntimeResult' as const;
