/**
 * Policy Engine Runtime — dışa aktarımlar (PR-103B).
 */

export type {
  PolicySeverity,
  PolicyCategory,
  PolicyOperator,
  PolicyDefinition
} from './PolicyDefinition';
export {
  POLICY_SEVERITY_RANK,
  POLICY_CATEGORY_LABELS
} from './PolicyDefinition';

export type { PolicyOutcome } from './PolicyOutcome';
export { POLICY_OUTCOME_LABELS } from './PolicyOutcome';

export type { PolicyEvaluation } from './PolicyEvaluation';

export type { PolicyContext } from './PolicyContext';
export { createPolicyContext } from './PolicyContext';

export type {
  PolicyWarning,
  PolicySummary,
  PolicyTelemetry,
  PolicyResult
} from './PolicyResult';
export { PIPELINE_BAG_POLICY_RUNTIME_RESULT_KEY } from './PolicyResult';

export {
  PolicyRegistryRuntime,
  createPolicyRegistryRuntime
} from './PolicyRegistryRuntime';

export {
  PolicyEngineRuntime,
  createPolicyEngineRuntime
} from './PolicyEngineRuntime';

export {
  BUILTIN_POLICY_DEFINITIONS,
  BUILTIN_POLICY_DEFINITION_COUNT,
  BUILTIN_POLICY_THRESHOLDS,
  getBuiltinPolicyDefinition
} from './builtinDefinitions';

export {
  attachPolicyToPipelineContext,
  readPolicyFromPipelineContext,
  attachPolicyToPipelineResult,
  readPolicyFromPipelineResult,
  applyPolicyEngineToPipelineResult
} from './pipelineBridge';
