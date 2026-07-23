/**
 * İSTEBUL Business Analysis Engine — pipeline portu.
 */

import type { AnalysisPipelineStageDefinition } from '../pipeline/AnalysisPipeline';
import type { AnalysisRequest } from '../models/AnalysisRequest';
import type { AnalysisResult } from '../models/AnalysisResult';

export interface IAnalysisPipeline {
  readonly stages: readonly AnalysisPipelineStageDefinition[];

  /**
   * İsteği pipeline aşamalarından geçirir.
   * Implementasyon sonraki PR’lardadır.
   */
  run(request: AnalysisRequest): Promise<AnalysisResult>;
}
