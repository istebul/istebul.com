/**
 * İSTEBUL Business Report Engine — ReportExecutionContext (PR-104F).
 */

import type { DecisionResult } from '../../../decision/models/DecisionResult';
import type { ReportContext } from '../../models/ReportContext';
import type { ReportRequest } from '../../models/ReportRequest';
import type { ReportPipelineBag } from '../../pipeline/runtime/ReportPipelineContext';

/**
 * Uçtan uca Report yürütme bağlamı.
 */
export interface ReportExecutionContext {
  /** Rapor isteği */
  request: ReportRequest;
  /** Hazır ReportContext */
  reportContext?: ReportContext;
  /** DecisionResult — reportContext yoksa zorunlu */
  decisionResult?: DecisionResult;
  /** Başlangıç pipeline bag */
  initialBag?: ReportPipelineBag;
  /** Dil */
  locale?: 'tr' | 'en';
}

export type CreateReportExecutionContextInput = ReportExecutionContext;

/**
 * ReportExecutionContext fabrikası.
 */
export function createReportExecutionContext(
  input: CreateReportExecutionContextInput
): ReportExecutionContext {
  return { ...input };
}
