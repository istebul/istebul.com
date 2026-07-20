/**
 * İSTEBUL Business Report Engine — Decision Information (PR-104B).
 */

import type {
  DecisionStage,
  DecisionStatus
} from '../../../decision/models/DecisionStage';

/**
 * DecisionResult üzerinden türetilen karar bilgisi.
 */
export interface ReportDecision {
  /** Karar isteği kimliği */
  requestId: string;
  /** Analiz isteği kimliği */
  analysisRequestId: string;
  /** Dataset kimliği */
  datasetId: string;
  /** Karar durumu */
  status: DecisionStatus;
  /** Son karar aşaması */
  lastStage: DecisionStage;
  /** Tamamlanma zamanı */
  completedAt: string | null;
  /** Risk sayısı */
  riskCount: number;
  /** Fırsat sayısı */
  opportunityCount: number;
  /** Öncelik sayısı */
  priorityCount: number;
  /** Skor sayısı */
  scoreCount: number;
}
