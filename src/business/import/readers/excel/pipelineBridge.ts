/**
 * Pipeline köprüsü — PR-101A dosyalarını değiştirmeden bag’e yazar (PR-101F).
 */

import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import type { PipelineResult } from '../../pipeline/runtime/PipelineResult';
import type { ExcelReaderResult } from './ExcelReaderResult';
import { PIPELINE_BAG_EXCEL_RESULT_KEY } from './ExcelReaderResult';
import { excelResultToTabular } from './ExcelImportReader';

/**
 * Excel sonucunu bag’e yazar; Schema/Validation için rawPayload tabular.
 */
export function attachExcelResultToPipelineContext(
  context: PipelineContext,
  result: ExcelReaderResult
): void {
  context.bag[PIPELINE_BAG_EXCEL_RESULT_KEY] = result;
  context.bag.rawPayload = excelResultToTabular(result);
}

export function readExcelResultFromPipelineContext(
  context: PipelineContext
): ExcelReaderResult | undefined {
  const value = context.bag[PIPELINE_BAG_EXCEL_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as ExcelReaderResult;
}

export function attachExcelResultToPipelineResult(
  pipelineResult: PipelineResult,
  result: ExcelReaderResult
): void {
  attachExcelResultToPipelineContext(
    pipelineResult.context as PipelineContext,
    result
  );
}

export function readExcelResultFromPipelineResult(
  pipelineResult: PipelineResult
): ExcelReaderResult | undefined {
  return readExcelResultFromPipelineContext(
    pipelineResult.context as PipelineContext
  );
}
