/**
 * İSTEBUL Business Analysis Engine — model dışa aktarımları.
 */

export type { AnalysisStage, AnalysisStatus } from './AnalysisStage';
export { ANALYSIS_STATUS_LABELS } from './AnalysisStage';
export type { AnalysisContext } from './AnalysisContext';
export type { AnalysisRequest } from './AnalysisRequest';
export type {
  AnalysisFinding,
  AnalysisFindingSeverity
} from './AnalysisFinding';
export type { AnalysisWarning } from './AnalysisWarning';
export type { KPIResult } from './KPIResult';
export type { AnalysisStatistics } from './AnalysisStatistics';
export type { AnalysisScore } from './AnalysisScore';
export type { AnalysisSummary } from './AnalysisSummary';
export type { AnalysisResult } from './AnalysisResult';

/** Çekirdek analiz model tip sayısı */
export const ANALYSIS_MODEL_COUNT = 9;
