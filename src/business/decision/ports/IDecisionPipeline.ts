/**
 * İSTEBUL Business Decision Engine — pipeline portu.
 */

import type { DecisionPipelineStageDefinition } from '../pipeline/DecisionPipeline';
import type { DecisionRequest } from '../models/DecisionRequest';
import type { DecisionResult } from '../models/DecisionResult';

export interface IDecisionPipeline {
  readonly stages: readonly DecisionPipelineStageDefinition[];

  /**
   * İsteği karar pipeline aşamalarından geçirir.
   * Implementasyon sonraki PR’lardadır.
   */
  run(request: DecisionRequest): Promise<DecisionResult>;
}
