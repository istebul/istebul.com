/**
 * Pipeline köprüsü — PR-101A–H dosyalarını değiştirmeden bag’e yazar (PR-101I).
 */

import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import type { PipelineResult } from '../../pipeline/runtime/PipelineResult';
import type { BuilderResult } from './BuilderResult';
import { PIPELINE_BAG_DATASET_BUILD_RESULT_KEY } from './BuilderResult';

export function attachDatasetBuildToPipelineContext(
  context: PipelineContext,
  result: BuilderResult
): void {
  context.bag[PIPELINE_BAG_DATASET_BUILD_RESULT_KEY] = result;
}

export function readDatasetBuildFromPipelineContext(
  context: PipelineContext
): BuilderResult | undefined {
  const value = context.bag[PIPELINE_BAG_DATASET_BUILD_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as BuilderResult;
}

export function attachDatasetBuildToPipelineResult(
  pipelineResult: PipelineResult,
  result: BuilderResult
): void {
  attachDatasetBuildToPipelineContext(
    pipelineResult.context as PipelineContext,
    result
  );
}

export function readDatasetBuildFromPipelineResult(
  pipelineResult: PipelineResult
): BuilderResult | undefined {
  return readDatasetBuildFromPipelineContext(
    pipelineResult.context as PipelineContext
  );
}
