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
