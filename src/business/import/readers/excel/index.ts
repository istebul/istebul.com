/**
 * Excel Reader Runtime — dışa aktarımlar (PR-101F).
 */

export type { ExcelCell, ExcelCellType } from './ExcelCell';
export type { ExcelHeader, ExcelRow, ExcelSheet } from './ExcelSheet';
export type {
  ExcelWorkbook,
  ExcelRawWorkbook,
  ExcelRawSheet,
  ExcelRawCellValue
} from './ExcelWorkbook';
export type { ExcelReaderContext } from './ExcelReaderContext';
export { createExcelReaderContext } from './ExcelReaderContext';
export type {
  ExcelReaderResult,
  ExcelReaderTelemetry
} from './ExcelReaderResult';
export {
  PIPELINE_BAG_EXCEL_RESULT_KEY,
  EXCEL_BINARY_NOT_SUPPORTED
} from './ExcelReaderResult';

export {
  ExcelImportReader,
  createExcelImportReader,
  parseExcelWorkbook,
  excelResultToTabular,
  resolveExcelWorkbookPayload,
  EXCEL_READER_ID
} from './ExcelImportReader';
export type { ExcelImportReaderOptions } from './ExcelImportReader';

export {
  createExcelReaderRegistration,
  registerExcelImportReader
} from './registration';

export {
  attachExcelResultToPipelineContext,
  readExcelResultFromPipelineContext,
  attachExcelResultToPipelineResult,
  readExcelResultFromPipelineResult
} from './pipelineBridge';

export {
  normalizeExcelCell,
  parseExcelRawSheet,
  parseExcelRawWorkbook,
  selectExcelSheet
} from './parseExcel';
