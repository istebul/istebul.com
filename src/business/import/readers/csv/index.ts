/**
 * CSV Reader Runtime — dışa aktarımlar (PR-101E).
 */

export type { CsvHeader } from './CsvHeader';
export type { CsvCell } from './CsvCell';
export type { CsvRow } from './CsvRow';
export type { CsvDelimiter, CsvReaderContext } from './CsvReaderContext';
export { createCsvReaderContext } from './CsvReaderContext';
export type { CsvReaderResult, CsvReaderTelemetry } from './CsvReaderResult';
export { PIPELINE_BAG_CSV_RESULT_KEY } from './CsvReaderResult';

export {
  CsvImportReader,
  createCsvImportReader,
  parseCsvContent,
  csvResultToTabular,
  resolveCsvPayload,
  CSV_READER_ID
} from './CsvImportReader';
export type { CsvImportReaderOptions } from './CsvImportReader';

export {
  createCsvReaderRegistration,
  registerCsvImportReader
} from './registration';

export {
  attachCsvResultToPipelineContext,
  readCsvResultFromPipelineContext,
  attachCsvResultToPipelineResult,
  readCsvResultFromPipelineResult
} from './pipelineBridge';

export {
  splitCsvLine,
  detectDelimiter,
  stripBom,
  utf8ByteLength,
  splitPhysicalRecords
} from './parseCsv';
