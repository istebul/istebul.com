/**
 * İSTEBUL Business Dashboard Engine — DashboardExecutionContext (PR-105F).
 */

import type { AnalysisResult } from '../../../analysis/models/AnalysisResult';
import type { DecisionResult } from '../../../decision/models/DecisionResult';
import type { ReportModel } from '../../../report/models/ReportModel';
import type { DashboardContext } from '../../models/DashboardContext';
import type { DashboardRequest } from '../../models/DashboardRequest';
import type { DashboardPipelineBag } from '../../pipeline/runtime/DashboardPipelineContext';

/**
 * Uçtan uca Dashboard yürütme bağlamı.
 * ReportResult = foundation ReportModel.
 */
export interface DashboardExecutionContext {
  /** Dashboard isteği */
  request: DashboardRequest;
  /** Hazır DashboardContext */
  dashboardContext?: DashboardContext;
  /** ReportResult (ReportModel) — dashboardContext yoksa önerilir */
  reportModel?: ReportModel;
  /** DecisionResult (opsiyonel kaynak) */
  decisionResult?: DecisionResult;
  /** AnalysisResult (opsiyonel kaynak) */
  analysisResult?: AnalysisResult;
  /** Başlangıç pipeline bag — mevcut Dashboard bag mimarisine merge */
  initialBag?: DashboardPipelineBag;
  /** Dil */
  locale?: 'tr' | 'en';
}

export type CreateDashboardExecutionContextInput = DashboardExecutionContext;

/**
 * DashboardExecutionContext fabrikası.
 */
export function createDashboardExecutionContext(
  input: CreateDashboardExecutionContextInput
): DashboardExecutionContext {
  return { ...input };
}
