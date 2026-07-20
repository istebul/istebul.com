/**
 * İSTEBUL Business Report Engine — sunumdan bağımsız ReportModel (PR-104B).
 *
 * Foundation `models/ReportModel` (bölüm/narrative odaklı) ile karıştırılmamalıdır.
 * Bu model yalnızca DecisionResult yapısal eşlemesidir; metin/section üretmez.
 */

import type { ReportActionPlanInformation } from './ReportActionPlanInformation';
import type { ReportDataset } from './ReportDataset';
import type { ReportDecision } from './ReportDecision';
import type { ReportMetadata } from './ReportMetadata';
import type { ReportPolicyInformation } from './ReportPolicyInformation';
import type { ReportRecommendationInformation } from './ReportRecommendationInformation';
import type { ReportSummaryInformation } from './ReportSummaryInformation';

/**
 * Sunumdan bağımsız rapor veri modeli.
 */
export interface ReportModel {
  /** Üst veri */
  metadata: ReportMetadata;
  /** Dataset bilgisi */
  dataset: ReportDataset;
  /** Karar bilgisi */
  decision: ReportDecision;
  /** Politika / risk-fırsat yapısal özeti */
  policy: ReportPolicyInformation;
  /** Öneri bilgisi */
  recommendation: ReportRecommendationInformation;
  /** Aksiyon planı bilgisi */
  actionPlan: ReportActionPlanInformation;
  /** Özet bilgisi (yapısal; narrative değil) */
  summary: ReportSummaryInformation;
}
