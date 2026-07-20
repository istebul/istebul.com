/**
 * Pipeline köprüsü — PR-101A–F dosyalarını değiştirmeden bag’e yazar (PR-101G).
 */

import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import type { PipelineResult } from '../../pipeline/runtime/PipelineResult';
import type { SemanticResult } from './SemanticResult';
import { PIPELINE_BAG_SEMANTIC_RESULT_KEY } from './SemanticResult';

export function attachSemanticToPipelineContext(
  context: PipelineContext,
  result: SemanticResult
): void {
  context.bag[PIPELINE_BAG_SEMANTIC_RESULT_KEY] = result;
}

export function readSemanticFromPipelineContext(
  context: PipelineContext
): SemanticResult | undefined {
  const value = context.bag[PIPELINE_BAG_SEMANTIC_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as SemanticResult;
}

export function attachSemanticToPipelineResult(
  pipelineResult: PipelineResult,
  result: SemanticResult
): void {
  attachSemanticToPipelineContext(
    pipelineResult.context as PipelineContext,
    result
  );
}

export function readSemanticFromPipelineResult(
  pipelineResult: PipelineResult
): SemanticResult | undefined {
  return readSemanticFromPipelineContext(
    pipelineResult.context as PipelineContext
  );
}
