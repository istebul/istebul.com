/**
 * Pipeline köprüsü — PR-101A/B/C dosyalarını değiştirmeden bag’e yazar.
 */

import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import type { PipelineResult } from '../../pipeline/runtime/PipelineResult';
import type { SchemaResult } from './SchemaResult';
import { PIPELINE_BAG_SCHEMA_RESULT_KEY } from './SchemaResult';

/**
 * Schema sonucunu PipelineContext.bag’e işler.
 */
export function attachSchemaToPipelineContext(
  context: PipelineContext,
  result: SchemaResult
): void {
  context.bag[PIPELINE_BAG_SCHEMA_RESULT_KEY] = result;
}

export function readSchemaFromPipelineContext(
  context: PipelineContext
): SchemaResult | undefined {
  const value = context.bag[PIPELINE_BAG_SCHEMA_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as SchemaResult;
}

export function attachSchemaToPipelineResult(
  pipelineResult: PipelineResult,
  result: SchemaResult
): void {
  const ctx = pipelineResult.context as PipelineContext;
  attachSchemaToPipelineContext(ctx, result);
}

export function readSchemaFromPipelineResult(
  pipelineResult: PipelineResult
): SchemaResult | undefined {
  return readSchemaFromPipelineContext(
    pipelineResult.context as PipelineContext
  );
}
