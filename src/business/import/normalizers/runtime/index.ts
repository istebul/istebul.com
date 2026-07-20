/**
 * Dataset Normalizer Runtime — dışa aktarımlar (PR-101H).
 */

export type { NormalizedField, NormalizedPrimitiveType } from './NormalizedField';
export type { NormalizedRecord } from './NormalizedRecord';
export type {
  NormalizationRule,
  FieldNormalizationState
} from './NormalizationRule';
export type {
  NormalizationContext,
  NormalizationInputRow
} from './NormalizationContext';
export {
  createNormalizationContext,
  createNormalizationContextFromSemantic
} from './NormalizationContext';
export type {
  NormalizationResult,
  NormalizationWarning,
  AppliedNormalizationRule,
  NormalizationTelemetry
} from './NormalizationResult';
export { PIPELINE_BAG_NORMALIZATION_RESULT_KEY } from './NormalizationResult';

export {
  NormalizationRegistryRuntime,
  createNormalizationRegistryRuntime
} from './NormalizationRegistryRuntime';

export {
  DatasetNormalizerRuntime,
  createDatasetNormalizerRuntime
} from './DatasetNormalizerRuntime';

export {
  attachNormalizationToPipelineContext,
  readNormalizationFromPipelineContext,
  attachNormalizationToPipelineResult,
  readNormalizationFromPipelineResult
} from './pipelineBridge';

export {
  inferPrimitiveType,
  isNullish,
  isEmptyString,
  normalizeFieldName,
  parseBoolean,
  parseNumber,
  parseDateIso
} from './helpers';

export {
  BUILTIN_NORMALIZATION_RULES,
  mapFieldNameRule,
  normalizeNullUndefinedRule,
  trimWhitespaceRule,
  coerceNumberRule,
  coerceBooleanRule,
  coerceDateRule,
  coerceStringRule,
  normalizeCollectionRule
} from './rules/builtinRules';
