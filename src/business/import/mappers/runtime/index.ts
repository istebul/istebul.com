/**
 * Semantic Mapping Runtime — dışa aktarımlar (PR-101G).
 */

export type { SemanticCandidate } from './SemanticCandidate';
export type { SemanticRule, BusinessFieldDefinition } from './SemanticRule';
export type { SemanticContext } from './SemanticContext';
export { createSemanticContext } from './SemanticContext';
export type {
  SemanticResult,
  SemanticColumnResult,
  SemanticMappingTelemetry,
  SemanticConfidenceDistribution
} from './SemanticResult';
export {
  PIPELINE_BAG_SEMANTIC_RESULT_KEY,
  toFoundationSemanticMappingResult
} from './SemanticResult';

export {
  SemanticRegistryRuntime,
  createSemanticRegistryRuntime
} from './SemanticRegistryRuntime';

export {
  SemanticMappingRuntime,
  createSemanticMappingRuntime
} from './SemanticMappingRuntime';

export {
  attachSemanticToPipelineContext,
  readSemanticFromPipelineContext,
  attachSemanticToPipelineResult,
  readSemanticFromPipelineResult
} from './pipelineBridge';

export {
  normalizeSemanticKey,
  clampConfidence,
  roundConfidence,
  confidenceBand
} from './helpers';
export type { ConfidenceBand } from './helpers';

export { BUSINESS_FIELD_CATALOG } from './fieldCatalog';
export {
  BUILTIN_SEMANTIC_RULES,
  exactMatchRule,
  aliasContainsRule,
  schemaCandidateBridgeRule,
  entityHintSoftRule
} from './rules/builtinRules';
