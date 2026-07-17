/**
 * İSTEBUL Business Report Engine — standart rapor modeli (ReportModel).
 */

import type { ExecutiveSummary } from './ExecutiveSummary';
import type { ReportAppendix } from './ReportAppendix';
import type { ReportFinding } from './ReportFinding';
import type { ReportMetadata } from './ReportMetadata';
import type { ReportRecommendation } from './ReportRecommendation';
import type { ReportReference } from './ReportReference';
import type { ReportReview } from './ReportReview';
import type { ReportSection } from './ReportSection';
import type { ReportExecutionStatus, ReportStage } from './ReportStage';

/**
 * DecisionResult’tan türetilen kanonik rapor modeli.
 * PDF/Word üretimi bu yapıyı okur (sonraki PR).
 */
export interface ReportModel {
  /** Model kimliği */
  id: string;
  /** Üst veri */
  metadata: ReportMetadata;
  /** Son durum */
  status: ReportExecutionStatus;
  /** Son pipeline aşaması */
  lastStage: ReportStage;
  /** Yönetici özeti */
  executiveSummary: ExecutiveSummary;
  /** Bölümler */
  sections: readonly ReportSection[];
  /** Bulgular */
  findings: readonly ReportFinding[];
  /** Öneriler */
  recommendations: readonly ReportRecommendation[];
  /** Ekler */
  appendices: readonly ReportAppendix[];
  /** Referanslar */
  references: readonly ReportReference[];
  /** İnceleme */
  review?: ReportReview;
}
