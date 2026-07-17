/**
 * Pipeline köprüsü — PR-101A dosyalarını değiştirmeden bag’e yazar (PR-101E).
 */

import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import type { PipelineResult } from '../../pipeline/runtime/PipelineResult';
import type { CsvReaderResult } from './CsvReaderResult';
import { PIPELINE_BAG_CSV_RESULT_KEY } from './CsvReaderResult';
import { csvResultToTabular } from './CsvImportReader';

/**
 * CSV sonucunu PipelineContext.bag’e işler.
 * Schema Detection / Validation için `rawPayload` da tabular forma yazılır.
 */
export function attachCsvResultToPipelineContext(
  context: PipelineContext,
  result: CsvReaderResult
): void {
  context.bag[PIPELINE_BAG_CSV_RESULT_KEY] = result;
  context.bag.rawPayload = csvResultToTabular(result);
}

export function readCsvResultFromPipelineContext(
  context: PipelineContext
): CsvReaderResult | undefined {
  const value = context.bag[PIPELINE_BAG_CSV_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as CsvReaderResult;
}

export function attachCsvResultToPipelineResult(
  pipelineResult: PipelineResult,
  result: CsvReaderResult
): void {
  attachCsvResultToPipelineContext(
    pipelineResult.context as PipelineContext,
    result
  );
}

export function readCsvResultFromPipelineResult(
  pipelineResult: PipelineResult
): CsvReaderResult | undefined {
  return readCsvResultFromPipelineContext(
    pipelineResult.context as PipelineContext
  );
}
