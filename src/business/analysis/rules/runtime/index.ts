/**
 * Rule Engine Runtime — dışa aktarımlar (PR-102C).
 */

export type {
  RuleSeverity,
  RuleCategory,
  RuleOperator,
  RuleDefinition
} from './RuleDefinition';
export {
  RULE_SEVERITY_RANK,
  RULE_CATEGORY_LABELS
} from './RuleDefinition';

export type { RuleOutcome } from './RuleOutcome';
export { RULE_OUTCOME_LABELS } from './RuleOutcome';

export type { RuleEvaluation } from './RuleEvaluation';

export type { RuleContext } from './RuleContext';
export { createRuleContext } from './RuleContext';

export type {
  RuleWarning,
  RuleSummary,
  RuleTelemetry,
  RuleResult
} from './RuleResult';
export { PIPELINE_BAG_RULE_RUNTIME_RESULT_KEY } from './RuleResult';

export {
  RuleRegistryRuntime,
  createRuleRegistryRuntime
} from './RuleRegistryRuntime';

export {
  RuleEngineRuntime,
  createRuleEngineRuntime
} from './RuleEngineRuntime';

export {
  BUILTIN_RULE_DEFINITIONS,
  BUILTIN_RULE_DEFINITION_COUNT,
  BUILTIN_RULE_THRESHOLDS,
  getBuiltinRuleDefinition
} from './builtinDefinitions';

export {
  attachRuleToPipelineContext,
  readRuleFromPipelineContext,
  attachRuleToPipelineResult,
  readRuleFromPipelineResult,
  applyRuleEngineToPipelineResult
} from './pipelineBridge';
