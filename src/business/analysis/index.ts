/**
 * İSTEBUL Business Analysis Engine — dışa aktarım yüzeyi.
 *
 * Architecture Freeze v1.0 — tanım ve port katmanı.
 * AI, dashboard, gerçek KPI / kural yürütme yoktur.
 */

export {
  ANALYSIS_MODEL_COUNT,
  ANALYSIS_STATUS_LABELS
} from './models/index';
export type {
  AnalysisStage,
  AnalysisStatus,
  AnalysisContext,
  AnalysisRequest,
  AnalysisFinding,
  AnalysisFindingSeverity,
  AnalysisWarning,
  KPIResult,
  AnalysisStatistics,
  AnalysisScore,
  AnalysisSummary,
  AnalysisResult
} from './models/index';

export { ANALYSIS_ENGINE_PORT_COUNT } from './ports/index';
export type {
  IAnalysisEngine,
  IKPIEngine,
  IRuleEngine,
  IAnalysisPipeline,
  IFindingBuilder,
  ISummaryBuilder
} from './ports/index';

export type { AnalysisPipelineStageDefinition } from './pipeline/AnalysisPipeline';
export {
  ANALYSIS_PIPELINE_STAGES,
  ANALYSIS_PIPELINE_STAGE_COUNT,
  getAnalysisPipelineStage,
  listAnalysisPipelineStages
} from './pipeline/AnalysisPipeline';
export {
  ANALYSIS_RUNTIME_ERROR_CODES,
  AnalysisPipelineRuntime,
  createAnalysisPipelineRuntime,
  nowMs,
  startAnalysisStageTimer,
  endAnalysisStageTimer
} from './pipeline/runtime/index';
export type {
  AnalysisTiming,
  AnalysisStageTimer,
  AnalysisRuntimeIssue,
  AnalysisStageExecution,
  AnalysisStageExecutionOutcome,
  AnalysisPipelineBag,
  AnalysisPipelineContext,
  AnalysisPipelineSummary,
  AnalysisPipelineTelemetry,
  AnalysisPipelineResult,
  AnalysisRuntimeErrorCode,
  AnalysisContextResolver,
  AnalysisPipelineRuntimeOptions
} from './pipeline/runtime/index';

export {
  ANALYSIS_REGISTRY_STRUCTURE_COUNT,
  ANALYSIS_REGISTRY,
  ANALYSIS_REGISTRY_COUNT,
  RULE_REGISTRY,
  RULE_REGISTRY_COUNT,
  FINDING_REGISTRY,
  FINDING_REGISTRY_COUNT,
  KPI_REGISTRY_BRIDGE,
  KPI_REGISTRY_BRIDGE_COUNT,
  listAnalyses,
  getAnalysisById,
  listRules,
  getRuleById,
  listFindingTemplates,
  getFindingTemplateByCode,
  listBridgedKPIs,
  getBridgedKPIById
} from './registry/index';
export type {
  AnalysisDefinitionEntry,
  FindingTemplateDefinition
} from './registry/index';

export {
  ANALYSIS_ENGINE_SCHEMA_VERSION,
  ANALYSIS_ENGINE_NAME,
  ANALYSIS_ENGINE_DEFAULT_LOCALE,
  ANALYSIS_PIPELINE_STAGE_IDS,
  ANALYSIS_REGISTRY_KIND
} from './constants/AnalysisEngineConstants';
export type { AnalysisRegistryKind } from './constants/AnalysisEngineConstants';

export type {
  AnalysisRuleDefinition,
  AnalysisRuleStatus,
  AnalysisRuleEvaluationInput
} from './rules/AnalysisRuleContract';

export {
  RULE_SEVERITY_RANK,
  RULE_CATEGORY_LABELS,
  RULE_OUTCOME_LABELS,
  createRuleContext,
  PIPELINE_BAG_RULE_RUNTIME_RESULT_KEY,
  RuleRegistryRuntime,
  createRuleRegistryRuntime,
  RuleEngineRuntime,
  createRuleEngineRuntime,
  BUILTIN_RULE_DEFINITIONS,
  BUILTIN_RULE_DEFINITION_COUNT,
  BUILTIN_RULE_THRESHOLDS,
  getBuiltinRuleDefinition,
  attachRuleToPipelineContext,
  readRuleFromPipelineContext,
  attachRuleToPipelineResult,
  readRuleFromPipelineResult,
  applyRuleEngineToPipelineResult
} from './rules/runtime/index';
export type {
  RuleSeverity,
  RuleCategory,
  RuleOperator,
  RuleDefinition,
  RuleOutcome,
  RuleEvaluation,
  RuleContext,
  RuleWarning,
  RuleSummary,
  RuleTelemetry,
  RuleResult
} from './rules/runtime/index';

export {
  FINDING_CATEGORY_LABELS,
  FINDING_SEVERITY_RANK,
  createFindingContext,
  PIPELINE_BAG_FINDING_RUNTIME_RESULT_KEY,
  FindingRegistryRuntime,
  createFindingRegistryRuntime,
  FindingBuilderRuntime,
  createFindingBuilderRuntime,
  BUILTIN_FINDING_DEFINITIONS,
  BUILTIN_FINDING_DEFINITION_COUNT,
  getBuiltinFindingDefinition,
  getBuiltinFindingDefinitionByRuleId,
  attachFindingToPipelineContext,
  readFindingFromPipelineContext,
  attachFindingToPipelineResult,
  readFindingFromPipelineResult,
  applyFindingBuilderToPipelineResult
} from './findings/runtime/index';
export type {
  FindingCategory,
  FindingSeverity,
  FindingDefinition,
  FindingMetadata,
  FindingRecord,
  FindingContext,
  FindingWarning,
  FindingSummary,
  FindingTelemetry,
  FindingResult
} from './findings/runtime/index';

export {
  SUMMARY_SECTION_LABELS,
  SUMMARY_SECTION_ORDER,
  createSummaryContext,
  PIPELINE_BAG_SUMMARY_RUNTIME_RESULT_KEY,
  SummaryRegistryRuntime,
  createSummaryRegistryRuntime,
  SummaryBuilderRuntime,
  createSummaryBuilderRuntime,
  attachSummaryToPipelineContext,
  readSummaryFromPipelineContext,
  attachSummaryToPipelineResult,
  readSummaryFromPipelineResult,
  applySummaryBuilderToPipelineResult
} from './summaries/runtime/index';
export type {
  SummarySectionId,
  SummarySection,
  SummaryMetadata,
  SummaryRecord,
  SummaryContext,
  SummaryWarning,
  SummaryTelemetry,
  SummaryResult,
  SummarySectionDefinition
} from './summaries/runtime/index';

export type {
  KPIComputationRequest,
  KPIComputationOutcome,
  KPIComputationHandler
} from './kpis/KPIComputationContract';

export {
  KPI_CATEGORY_LABELS,
  createKpiContext,
  PIPELINE_BAG_KPI_RUNTIME_RESULT_KEY,
  KpiRegistryRuntime,
  createKpiRegistryRuntime,
  KpiEngineRuntime,
  createKpiEngineRuntime,
  BUILTIN_KPI_DEFINITIONS,
  BUILTIN_KPI_DEFINITION_COUNT,
  getBuiltinKpiDefinition,
  computeDatasetFieldStats,
  roundRatio,
  roundAverage,
  attachKpiToPipelineContext,
  readKpiFromPipelineContext,
  attachKpiToPipelineResult,
  readKpiFromPipelineResult,
  applyKpiEngineToPipelineResult
} from './kpis/runtime/index';
export type {
  KpiCategory,
  KpiCalculationType,
  KpiDefinition,
  KpiValue,
  KpiCalculation,
  KpiContext,
  KpiWarning,
  KpiDatasetSize,
  KpiExecutionSummary,
  KpiTelemetry,
  KpiResult,
  DatasetFieldStats
} from './kpis/runtime/index';

/** End-to-End Analysis Runtime (PR-102F) */
export {
  AnalysisRuntimeFacade,
  createAnalysisRuntimeFacade,
  AnalysisPipelineRunner,
  createAnalysisPipelineRunner,
  createAnalysisExecutionContext,
  resolveAnalysisContext,
  ensureRequestDatasetId,
  createSkippedStageExecution,
  createStageExecution,
  replaceStageExecution,
  buildAnalysisExecutionTelemetry
} from './integration/runtime/index';
export type {
  AnalysisExecutionContext,
  CreateAnalysisExecutionContextInput,
  AnalysisExecutionResult,
  AnalysisExecutionTelemetry,
  AnalysisPipelineExecutionSummary,
  AnalysisPipelineRunnerDependencies
} from './integration/runtime/index';
