/**
 * İSTEBUL Business Analysis Engine — dışa aktarım yüzeyi.
 *
 * Architecture Freeze v1.0 — tanım ve port katmanı.
 * AI, dashboard, gerçek KPI / kural yürütme yoktur.
 */

export {
  ANALYSIS_MODEL_COUNT,
  ANALYSIS_STATUS_LABELS
} from './models';
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
} from './models';

export { ANALYSIS_ENGINE_PORT_COUNT } from './ports';
export type {
  IAnalysisEngine,
  IKPIEngine,
  IRuleEngine,
  IAnalysisPipeline,
  IFindingBuilder,
  ISummaryBuilder
} from './ports';

export type { AnalysisPipelineStageDefinition } from './pipeline/AnalysisPipeline';
export {
  ANALYSIS_PIPELINE_STAGES,
  ANALYSIS_PIPELINE_STAGE_COUNT,
  getAnalysisPipelineStage,
  listAnalysisPipelineStages
} from './pipeline/AnalysisPipeline';

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
} from './registry';
export type {
  AnalysisDefinitionEntry,
  FindingTemplateDefinition
} from './registry';

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
