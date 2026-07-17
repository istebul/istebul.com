/**
 * İSTEBUL Business Import Engine — port dışa aktarımları.
 */

export type { IImportReader } from './IImportReader';
export type {
  IImportDetector,
  ImportDetectionResult
} from './IImportDetector';
export type {
  ISemanticMapper,
  SemanticColumnMapping,
  SemanticMappingResult
} from './ISemanticMapper';
export type { IDataNormalizer } from './IDataNormalizer';
export type { IImportValidator } from './IImportValidator';
export type { IImportPipeline } from './IImportPipeline';

/** Import Engine port arayüz sayısı */
export const IMPORT_ENGINE_PORT_COUNT = 6;
