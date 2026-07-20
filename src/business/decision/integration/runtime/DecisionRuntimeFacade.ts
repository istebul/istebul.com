/**
 * İSTEBUL Business Decision Engine — DecisionRuntimeFacade (PR-103F).
 *
 * Uçtan uca karar giriş noktası — mevcut runtime katmanlarını birleştirir.
 * Yeni karar mantığı eklemez.
 */

import type { DecisionRequest } from '../../models/DecisionRequest';
import type { DecisionResult } from '../../models/DecisionResult';
import type { DecisionExecutionContext } from './DecisionExecutionContext';
import { createDecisionExecutionContext } from './DecisionExecutionContext';
import type { DecisionExecutionResult } from './DecisionExecutionResult';
import {
  DecisionPipelineRunner,
  createDecisionPipelineRunner,
  type DecisionPipelineRunnerDependencies
} from './DecisionPipelineRunner';

/**
 * Uçtan uca Decision Engine facade.
 */
export class DecisionRuntimeFacade {
  private readonly runner: DecisionPipelineRunner;

  constructor(deps?: DecisionPipelineRunnerDependencies) {
    this.runner = createDecisionPipelineRunner(deps);
  }

  /**
   * Tam yürütme — DecisionExecutionResult döner.
   */
  async execute(
    context: DecisionExecutionContext
  ): Promise<DecisionExecutionResult> {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca DecisionResult döner.
   */
  async run(
    request: DecisionRequest,
    options: Omit<DecisionExecutionContext, 'request'> = {}
  ): Promise<DecisionResult> {
    const result = await this.execute(
      createDecisionExecutionContext({ request, ...options })
    );
    return result.decisionResult;
  }
}

/**
 * Fabrika.
 */
export function createDecisionRuntimeFacade(
  deps?: DecisionPipelineRunnerDependencies
): DecisionRuntimeFacade {
  return new DecisionRuntimeFacade(deps);
}

export default DecisionRuntimeFacade;
