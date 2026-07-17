/**
 * İSTEBUL Business Import Engine — dışa aktarım yüzeyi.
 *
 * Architecture Freeze v1.0: tanım ve port katmanı.
 * Dosya okuma, parse, UI ve AI çağrısı bu PR’da yoktur.
 */

export type {
  ImportAdapterTypeId,
  ImportSource,
  ImportStage,
  ImportStatus,
  ImportError,
  ImportContext,
  ImportRequest,
  ImportResult
} from './types';
export { IMPORT_STATUS_LABELS } from './types';

export type {
  IImportReader,
  IImportDetector,
  ImportDetectionResult,
  ISemanticMapper,
  SemanticColumnMapping,
  SemanticMappingResult,
  IDataNormalizer,
  IImportValidator,
  IImportPipeline
} from './ports';
export { IMPORT_ENGINE_PORT_COUNT } from './ports';

export type { ImportPipelineStageDefinition } from './pipeline/ImportPipeline';
export {
  IMPORT_PIPELINE_STAGES,
  IMPORT_PIPELINE_STAGE_COUNT,
  getImportPipelineStage,
  listImportPipelineStages
} from './pipeline/ImportPipeline';

export type { ImportAdapterRegistration } from './adapters/AdapterRegistry';
export {
  IMPORT_ADAPTER_REGISTRY,
  IMPORT_ADAPTER_COUNT,
  getImportAdapterById,
  listImportAdapters
} from './adapters/AdapterRegistry';

export {
  IMPORT_ENGINE_SCHEMA_VERSION,
  IMPORT_ENGINE_DEFAULT_LOCALE
} from './constants/ImportEngineConstants';

/** Import Pipeline Runtime (PR-101A) */
export {
  ImportPipelineRuntime,
  createImportPipelineRuntime,
  STAGE_EXECUTION_OUTCOME_LABELS,
  IMPORT_RUNTIME_ERROR_CODES,
  createImportError,
  createNotImplementedError,
  nowMs,
  startStageTimer,
  endStageTimer
} from './pipeline/runtime';
export type {
  PipelineContext,
  PipelineBag,
  PipelineResult,
  StageExecution,
  StageExecutionOutcome,
  StageTimer,
  StageHandler,
  StageHandlerResult,
  ImportRuntimeErrorCode
} from './pipeline/runtime';

/** Reader Registry Runtime (PR-101B) */
export {
  ReaderRegistryRuntime,
  createReaderRegistryRuntime,
  ReaderResolver,
  resolveFromRegistrations,
  ReaderFactory,
  createReaderFactory,
  StubImportReader,
  ReaderRegistryError,
  ReaderNotFoundError,
  DuplicateReaderError,
  InvalidRegistrationError,
  UnsupportedSourceError,
  READER_REGISTRY_ERROR_CODES,
  PIPELINE_BAG_READER_LOOKUP_KEY,
  attachReaderLookupToPipelineContext,
  readReaderLookupFromPipelineContext,
  normalizeExtension,
  normalizeMimeType
} from './readers/runtime';
export type {
  ReaderDescriptor,
  ReaderRegistration,
  ImportTarget,
  ReaderRegistryErrorCode,
  ReaderLookupTelemetry,
  ReaderSelectionReason,
  ReaderSelectionReasonCode,
  ReaderResolveResult,
  ReaderFactoryResult
} from './readers/runtime';

/** Validation Runtime (PR-101C) */
export {
  ValidationRuntime,
  createValidationRuntime,
  ValidationRegistryRuntime,
  createValidationRegistryRuntime,
  createValidationContext,
  VALIDATION_RUNTIME_SEVERITY_LABELS,
  VALIDATION_SEVERITY_RANK,
  isBlockingSeverity,
  PIPELINE_BAG_VALIDATION_RESULT_KEY,
  attachValidationToPipelineContext,
  readValidationFromPipelineContext,
  attachValidationToPipelineResult,
  readValidationFromPipelineResult,
  BUILTIN_VALIDATION_RULES
} from './validators/runtime';
export type {
  ValidationSeverity as ImportValidationSeverity,
  ValidationIssue,
  ValidationContext,
  ValidationRule,
  ValidationRuleTarget,
  ValidationResultRuntime,
  ValidationTelemetry
} from './validators/runtime';

/** Schema Detection Runtime (PR-101D) */
export {
  SchemaDetectionRuntime,
  createSchemaDetectionRuntime,
  SchemaRegistryRuntime,
  createSchemaRegistryRuntime,
  SchemaDetectorRegistry,
  createSchemaDetectorRegistry,
  ColumnDetectorRegistry,
  createColumnDetectorRegistry,
  EntityDetectorRegistry,
  createEntityDetectorRegistry,
  createSchemaContext,
  clampConfidence,
  roundConfidence,
  confidenceBand,
  DETECTED_TYPE_LABELS,
  PIPELINE_BAG_SCHEMA_RESULT_KEY,
  attachSchemaToPipelineContext,
  readSchemaFromPipelineContext,
  attachSchemaToPipelineResult,
  readSchemaFromPipelineResult,
  BUILTIN_SCHEMA_DETECTORS,
  BUILTIN_COLUMN_DETECTORS,
  BUILTIN_ENTITY_DETECTORS,
  inferValueType,
  dominantType,
  normalizeColumnName
} from './detectors/runtime';
export type {
  DetectionConfidence,
  ConfidenceBand,
  DetectedType,
  DetectedColumn,
  CandidateField,
  DetectedEntity,
  SchemaCandidate,
  SchemaSourceShape,
  SchemaContext,
  SchemaResult,
  SchemaDetectionTelemetry,
  ConfidenceDistribution,
  ColumnDetector,
  EntityDetector,
  SchemaDetector,
  TabularSlice
} from './detectors/runtime';

/** CSV Reader Runtime (PR-101E) */
export {
  CsvImportReader,
  createCsvImportReader,
  parseCsvContent,
  csvResultToTabular,
  resolveCsvPayload,
  CSV_READER_ID,
  createCsvReaderContext,
  createCsvReaderRegistration,
  registerCsvImportReader,
  attachCsvResultToPipelineContext,
  readCsvResultFromPipelineContext,
  attachCsvResultToPipelineResult,
  readCsvResultFromPipelineResult,
  PIPELINE_BAG_CSV_RESULT_KEY,
  splitCsvLine,
  detectDelimiter,
  stripBom,
  utf8ByteLength
} from './readers/csv';
export type {
  CsvHeader,
  CsvCell,
  CsvRow,
  CsvDelimiter,
  CsvReaderContext,
  CsvReaderResult,
  CsvReaderTelemetry,
  CsvImportReaderOptions
} from './readers/csv';
