/**
 * Pipeline köprüsü — PR-101A/B dosyalarını değiştirmeden bag’e yazar.
 */

import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import type { PipelineResult } from '../../pipeline/runtime/PipelineResult';
import type { ValidationResultRuntime } from './ValidationResultRuntime';
import { PIPELINE_BAG_VALIDATION_RESULT_KEY } from './ValidationResultRuntime';

/**
 * Validation sonucunu PipelineContext.bag’e işler.
 */
export function attachValidationToPipelineContext(
  context: PipelineContext,
  result: ValidationResultRuntime
): void {
  context.bag[PIPELINE_BAG_VALIDATION_RESULT_KEY] = result;
}

/**
 * Bag’den validation sonucunu okur.
 */
export function readValidationFromPipelineContext(
  context: PipelineContext
): ValidationResultRuntime | undefined {
  const value = context.bag[PIPELINE_BAG_VALIDATION_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as ValidationResultRuntime;
}

/**
 * PipelineResult.context.bag üzerinden validation sonucunu bağlar.
 * Foundation PipelineResult tipi değiştirilmez; bag mutable nesnedir.
 */
export function attachValidationToPipelineResult(
  pipelineResult: PipelineResult,
  result: ValidationResultRuntime
): void {
  const ctx = pipelineResult.context as PipelineContext;
  attachValidationToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden validation sonucunu okur.
 */
export function readValidationFromPipelineResult(
  pipelineResult: PipelineResult
): ValidationResultRuntime | undefined {
  return readValidationFromPipelineContext(
    pipelineResult.context as PipelineContext
  );
}
