/**
 * Pipeline köprüsü — PR-101A–G dosyalarını değiştirmeden bag’e yazar (PR-101H).
 */

import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import type { PipelineResult } from '../../pipeline/runtime/PipelineResult';
import type { NormalizationResult } from './NormalizationResult';
import { PIPELINE_BAG_NORMALIZATION_RESULT_KEY } from './NormalizationResult';

export function attachNormalizationToPipelineContext(
  context: PipelineContext,
  result: NormalizationResult
): void {
  context.bag[PIPELINE_BAG_NORMALIZATION_RESULT_KEY] = result;
}

export function readNormalizationFromPipelineContext(
  context: PipelineContext
): NormalizationResult | undefined {
  const value = context.bag[PIPELINE_BAG_NORMALIZATION_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as NormalizationResult;
}

export function attachNormalizationToPipelineResult(
  pipelineResult: PipelineResult,
  result: NormalizationResult
): void {
  attachNormalizationToPipelineContext(
    pipelineResult.context as PipelineContext,
    result
  );
}

export function readNormalizationFromPipelineResult(
  pipelineResult: PipelineResult
): NormalizationResult | undefined {
  return readNormalizationFromPipelineContext(
    pipelineResult.context as PipelineContext
  );
}
