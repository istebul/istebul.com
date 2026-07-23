/**
 * Validation Runtime — dışa aktarımlar (PR-101C).
 */

export type { ValidationSeverity } from './ValidationSeverity';
export {
  VALIDATION_RUNTIME_SEVERITY_LABELS,
  VALIDATION_SEVERITY_RANK,
  isBlockingSeverity
} from './ValidationSeverity';

export type { ValidationIssue } from './ValidationIssue';
export type { ValidationContext } from './ValidationContext';
export { createValidationContext } from './ValidationContext';
export type {
  ValidationRule,
  ValidationRuleTarget
} from './ValidationRule';
export type {
  ValidationResultRuntime,
  ValidationTelemetry
} from './ValidationResultRuntime';
export { PIPELINE_BAG_VALIDATION_RESULT_KEY } from './ValidationResultRuntime';

export {
  ValidationRegistryRuntime,
  createValidationRegistryRuntime
} from './ValidationRegistryRuntime';

export {
  ValidationRuntime,
  createValidationRuntime
} from './ValidationRuntime';

export {
  attachValidationToPipelineContext,
  readValidationFromPipelineContext,
  attachValidationToPipelineResult,
  readValidationFromPipelineResult
} from './pipelineBridge';

export {
  BUILTIN_VALIDATION_RULES,
  importRequestRequiredFieldsRule,
  importContextRequiredFieldsRule,
  readerOutputStructureRule,
  readerOutputCollectionRule,
  businessDatasetStructureRule,
  datasetEntityShapeRule,
  metadataRequiredFieldsRule,
  nullSafetyRule,
  entityHintsCollectionRule
} from './rules/builtinRules';
