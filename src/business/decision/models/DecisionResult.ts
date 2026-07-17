/**
 * İSTEBUL Business Decision Engine — karar sonucu.
 */

import type { DecisionAction } from './DecisionAction';
import type { DecisionOpportunity } from './DecisionOpportunity';
import type { DecisionPriority } from './DecisionPriority';
import type { DecisionRecommendation } from './DecisionRecommendation';
import type { DecisionRisk } from './DecisionRisk';
import type { DecisionScore } from './DecisionScore';
import type { DecisionStage, DecisionStatus } from './DecisionStage';
import type { DecisionSummary } from './DecisionSummary';

/**
 * Pipeline tamamlandığında dönen karar destek paketi.
 */
export interface DecisionResult {
  /** İstek kimliği */
  requestId: string;
  /** Analiz isteği kimliği */
  analysisRequestId: string;
  /** Dataset kimliği */
  datasetId: string;
  /** Son durum */
  status: DecisionStatus;
  /** Son aşama */
  lastStage: DecisionStage;
  /** Özet */
  summary: DecisionSummary;
  /** Öneriler */
  recommendations: readonly DecisionRecommendation[];
  /** Aksiyonlar */
  actions: readonly DecisionAction[];
  /** Riskler */
  risks: readonly DecisionRisk[];
  /** Fırsatlar */
  opportunities: readonly DecisionOpportunity[];
  /** Öncelikler */
  priorities: readonly DecisionPriority[];
  /** Skorlar */
  scores: readonly DecisionScore[];
  /** Tamamlanma zamanı (ISO 8601) */
  completedAt?: string;
}
