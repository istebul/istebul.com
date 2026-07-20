/**
 * İSTEBUL Business Report Engine — runtime pipeline context.
 */

import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { ExecutiveSummary } from '../../models/ExecutiveSummary';
import type { ReportAppendix } from '../../models/ReportAppendix';
import type { ReportContext } from '../../models/ReportContext';
import type { ReportFinding } from '../../models/ReportFinding';
import type { ReportModel } from '../../models/ReportModel';
import type { ReportRecommendation } from '../../models/ReportRecommendation';
import type { ReportReference } from '../../models/ReportReference';
import type { ReportRequest } from '../../models/ReportRequest';
import type { ReportReview } from '../../models/ReportReview';
import type { ReportSection } from '../../models/ReportSection';
import type { ReportStageExecution } from './ReportStageExecution';

/**
 * Report Pipeline ara veri çantası — yalnızca Report Engine anahtarları.
 */
export interface ReportPipelineBag {
  /** DecisionResult doğrulama sonucu */
  decisionValidation?: BusinessValidationResult;
  /** Bölüm placeholder alanı */
  sections?: readonly ReportSection[];
  /** Bulgu placeholder alanı */
  findings?: readonly ReportFinding[];
  /** Öneri placeholder alanı */
  recommendations?: readonly ReportRecommendation[];
  /** Referans placeholder alanı */
  references?: readonly ReportReference[];
  /** Ek placeholder alanı */
  appendices?: readonly ReportAppendix[];
  /** Yönetici özeti placeholder */
  executiveSummary?: ExecutiveSummary;
  /** İnceleme placeholder */
  review?: ReportReview;
  /** Taslak ReportModel placeholder */
  reportModel?: ReportModel;
  /** Diğer ara değerler */
  [key: string]: unknown;
}

export interface ReportPipelineContext {
  /** Kaynak istek */
  request: ReportRequest;
  /** Foundation ReportContext */
  reportContext: ReportContext;
  /** Tamamlanan aşama kayıtları */
  stageExecutions: ReportStageExecution[];
  /** Ara veri */
  bag: ReportPipelineBag;
  /** Pipeline başlangıcı (ISO 8601) */
  startedAt: string;
  /** Monotonik başlangıç işareti (ms) */
  startedMark: number;
}
