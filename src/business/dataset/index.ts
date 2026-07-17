/**
 * İSTEBUL Business — BusinessDataset dışa aktarım yüzeyi.
 *
 * Ortak veri modeli (resmi veri dili). Import, AI ve dashboard bu tipleri okur.
 * Bu PR’da motor, UI ve AI çağrısı yoktur.
 */

export type { BusinessDataset } from './models/BusinessDataset';
export type { BusinessMetadata } from './models/BusinessMetadata';
export type { BusinessEntity, BusinessEntityLayout } from './models/BusinessEntity';
export type {
  BusinessColumn,
  BusinessColumnDataType
} from './models/BusinessColumn';
export type { BusinessRow, BusinessCellValue } from './models/BusinessRow';
export type {
  BusinessRelation,
  BusinessRelationKind
} from './models/BusinessRelation';
export type {
  BusinessSource,
  BusinessSourceTypeId
} from './models/BusinessSource';
export type { BusinessAttachment } from './models/BusinessAttachment';
export type { BusinessValidationResult } from './models/BusinessValidationResult';
export type { BusinessDatasetVersion } from './models/BusinessDatasetVersion';

export type {
  BusinessEntityTypeId,
  BusinessEntityTypeDefinition
} from './entities/BusinessEntityType';
export {
  ENTITY_TYPE_COUNT,
  ENTITY_TYPE_REGISTRY,
  getEntityTypeById,
  listEntityTypes
} from './entities/EntityTypeRegistry';
export type { BusinessSourceTypeDefinition } from './entities/SourceTypeRegistry';
export {
  SOURCE_TYPE_COUNT,
  SOURCE_TYPE_REGISTRY,
  getSourceTypeById,
  listSourceTypes
} from './entities/SourceTypeRegistry';

export type {
  ValidationResult,
  ValidationSeverity,
  Severity,
  ValidationInfo,
  ValidationWarning,
  ValidationError
} from './validators/ValidationResult';
export { VALIDATION_SEVERITY_LABELS } from './validators/ValidationResult';

export type {
  IDataNormalizer,
  ISchemaDetector,
  IEntityDetector,
  IValidationEngine
} from './normalizers/NormalizerInterfaces';

export {
  BUSINESS_DATASET_SCHEMA_VERSION,
  BUSINESS_DATASET_ROOT_KEYS
} from './schemas/DatasetSchemaConstants';
export type { BusinessDatasetRootKey } from './schemas/DatasetSchemaConstants';

/** Çekirdek model tip sayısı (BusinessDataset kök + parça modeller) */
export const BUSINESS_DATASET_MODEL_COUNT = 10;

/** Normalizer / doğrulama port arayüz sayısı */
export const BUSINESS_DATASET_PORT_INTERFACE_COUNT = 4;

/** Örnek JSON dataset dosya sayısı (examples/) */
export const BUSINESS_DATASET_EXAMPLE_COUNT = 3;
