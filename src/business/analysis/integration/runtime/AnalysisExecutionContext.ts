/**
 * İSTEBUL Business Analysis Engine — AnalysisExecutionContext (PR-102F).
 */

import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { AnalysisContext } from '../../models/AnalysisContext';
import type { AnalysisRequest } from '../../models/AnalysisRequest';
import type { AnalysisPipelineBag } from '../../pipeline/runtime/AnalysisPipelineContext';

/**
 * Uçtan uca analiz yürütme bağlamı.
 */
export interface AnalysisExecutionContext {
  /** Analiz isteği */
  request: AnalysisRequest;
  /** Hazır AnalysisContext */
  analysisContext?: AnalysisContext;
  /** Dataset — analysisContext yoksa zorunlu */
  dataset?: BusinessDataset;
  /** Başlangıç pipeline bag */
  initialBag?: AnalysisPipelineBag;
  /** Dil */
  locale?: 'tr' | 'en';
  /** KPI alt kümesi */
  kpiIds?: readonly string[];
  /** Kural alt kümesi */
  ruleIds?: readonly string[];
  /** Skipped kurallar için informational finding */
  includeSkippedFindings?: boolean;
}

export type CreateAnalysisExecutionContextInput = AnalysisExecutionContext;

/**
 * AnalysisExecutionContext fabrikası.
 */
export function createAnalysisExecutionContext(
  input: CreateAnalysisExecutionContextInput
): AnalysisExecutionContext {
  return { ...input };
}
