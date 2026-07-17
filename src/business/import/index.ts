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
