/**
 * İSTEBUL Business Analysis Engine — runtime pipeline context.
 */

import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { AnalysisContext } from '../../models/AnalysisContext';
import type { AnalysisRequest } from '../../models/AnalysisRequest';
import type { KPIResult } from '../../models/KPIResult';
import type { AnalysisFinding } from '../../models/AnalysisFinding';
import type { AnalysisScore } from '../../models/AnalysisScore';
import type { AnalysisSummary } from '../../models/AnalysisSummary';
import type { AnalysisStageExecution } from './AnalysisStageExecution';

export interface AnalysisPipelineBag {
  /** Dataset doğrulama sonucu */
  datasetValidation?: BusinessValidationResult;
  /** KPI placeholder alanı */
  kpiResults?: readonly KPIResult[];
  /** Bulgu placeholder alanı */
  findings?: readonly AnalysisFinding[];
  /** Skor placeholder alanı */
  scores?: readonly AnalysisScore[];
  /** Özet placeholder alanı */
  summary?: AnalysisSummary;
  /** Diğer ara değerler */
  [key: string]: unknown;
}

export interface AnalysisPipelineContext {
  /** Kaynak istek */
  request: AnalysisRequest;
  /** Foundation AnalysisContext */
  analysisContext: AnalysisContext;
  /** Tamamlanan aşama kayıtları */
  stageExecutions: AnalysisStageExecution[];
  /** Ara veri */
  bag: AnalysisPipelineBag;
  /** Pipeline başlangıcı (ISO 8601) */
  startedAt: string;
  /** Monotonik başlangıç işareti (ms) */
  startedMark: number;
}
