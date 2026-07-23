/**
 * Schema Detection Runtime — dışa aktarımlar (PR-101D).
 */

export type { DetectionConfidence, ConfidenceBand } from './DetectionConfidence';
export {
  clampConfidence,
  roundConfidence,
  confidenceBand
} from './DetectionConfidence';

export type { DetectedType } from './DetectedType';
export {
  DETECTED_TYPE_LABELS,
  isDetectedType
} from './DetectedType';

export type { DetectedColumn, CandidateField } from './DetectedColumn';
export type { DetectedEntity } from './DetectedEntity';
export type { SchemaCandidate, SchemaSourceShape } from './SchemaCandidate';

export type { SchemaContext } from './SchemaContext';
export { createSchemaContext } from './SchemaContext';

export type {
  SchemaResult,
  SchemaDetectionTelemetry,
  ConfidenceDistribution
} from './SchemaResult';
export { PIPELINE_BAG_SCHEMA_RESULT_KEY } from './SchemaResult';

export type {
  ColumnDetector,
  EntityDetector,
  SchemaDetector,
  TabularSlice
} from './detectors/types';

export {
  SchemaRegistryRuntime,
  createSchemaRegistryRuntime,
  SchemaDetectorRegistry,
  createSchemaDetectorRegistry,
  ColumnDetectorRegistry,
  createColumnDetectorRegistry,
  EntityDetectorRegistry,
  createEntityDetectorRegistry
} from './SchemaRegistryRuntime';

export {
  SchemaDetectionRuntime,
  createSchemaDetectionRuntime
} from './SchemaDetectionRuntime';

export {
  attachSchemaToPipelineContext,
  readSchemaFromPipelineContext,
  attachSchemaToPipelineResult,
  readSchemaFromPipelineResult
} from './pipelineBridge';

export {
  BUILTIN_SCHEMA_DETECTORS,
  objectRowsSchemaDetector,
  columnsRowsSchemaDetector,
  headerMatrixSchemaDetector
} from './detectors/schemaDetectors';
export {
  BUILTIN_COLUMN_DETECTORS,
  defaultColumnDetector
} from './detectors/columnDetectors';
export {
  BUILTIN_ENTITY_DETECTORS,
  defaultEntityDetector
} from './detectors/entityDetectors';

export {
  inferValueType,
  dominantType,
  normalizeColumnName,
  computeTypeConfidence
} from './helpers';
