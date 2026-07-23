/**
 * Dashboard Engine çalışma bağlamı.
 */

import type { AnalysisResult } from '../../analysis/models/AnalysisResult';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { ReportModel } from '../../report/models/ReportModel';
import type {
  DashboardExecutionStatus,
  DashboardStage
} from './DashboardStage';

export interface DashboardContext {
  dashboardJobId: string;
  locale: 'tr' | 'en';
  layoutId: string;
  themeId: string;
  currentStage: DashboardStage;
  status: DashboardExecutionStatus;
  /** Opsiyonel kaynaklar — en az biri sonraki PR’da zorunlu kılınabilir */
  analysisResult?: AnalysisResult;
  decisionResult?: DecisionResult;
  reportModel?: ReportModel;
  metadata?: Readonly<Record<string, string>>;
}
