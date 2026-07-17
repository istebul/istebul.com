export { BUSINESS_MODULES } from './constants/BusinessModules';
export { BUSINESS_ROUTES, getBusinessRouteByPath } from './routes/business-routes';
export { mountBusinessHomePage, BUSINESS_HOME_COPY } from './pages/BusinessHomePage';
export { createBusinessModuleCardElement } from './components/BusinessModuleCard';
export { createBusinessLayoutShell } from './layouts/BusinessLayout';
export type {
  BusinessModule,
  BusinessModuleId,
  BusinessModuleStatus
} from './types/business-module';
export type {
  BusinessRouteDefinition,
  BusinessRouteName
} from './routes/business-routes';

/** Knowledge Architecture — Report DNA, KPI, kategori, prompt, çıktı kayıtları */
export {
  CATEGORY_COUNT,
  CATEGORY_REGISTRY,
  getCategoryById,
  listCategories,
  REPORT_COUNT,
  REPORT_REGISTRY,
  REPORT_STATUS_LABELS,
  getReportById,
  listActiveReports,
  listReports,
  listReportsByCategory,
  KPI_COUNT,
  KPI_REGISTRY,
  getKPIById,
  listKPIs,
  listKPIsByCategory,
  PROMPT_COUNT,
  PROMPT_REGISTRY,
  getPromptByKey,
  listPromptKeys,
  OUTPUT_COUNT,
  OUTPUT_REGISTRY,
  getOutputById,
  listOutputs
} from './knowledge';
export type {
  BusinessCategoryId,
  BusinessCategoryKind,
  CategoryDefinition,
  DashboardWidgetSuggestion,
  ReportDefinition,
  ReportStatus,
  RequiredDataTypeId,
  SupportedFileType,
  KPICalculationType,
  KPIDefinition,
  PromptKey,
  PromptRegistryEntry,
  OutputDefinition,
  OutputFormatId,
  BusinessKnowledgeAIPort,
  KnowledgeAnalysisDataRef,
  KnowledgeAnalysisRequest,
  KnowledgeAnalysisResult
} from './knowledge';

/** BusinessDataset — resmi veri modeli foundation */
export {
  ENTITY_TYPE_COUNT,
  ENTITY_TYPE_REGISTRY,
  getEntityTypeById,
  listEntityTypes,
  SOURCE_TYPE_COUNT,
  SOURCE_TYPE_REGISTRY,
  getSourceTypeById,
  listSourceTypes,
  VALIDATION_SEVERITY_LABELS,
  BUSINESS_DATASET_SCHEMA_VERSION,
  BUSINESS_DATASET_ROOT_KEYS,
  BUSINESS_DATASET_MODEL_COUNT,
  BUSINESS_DATASET_PORT_INTERFACE_COUNT,
  BUSINESS_DATASET_EXAMPLE_COUNT
} from './dataset';
export type {
  BusinessDataset,
  BusinessMetadata,
  BusinessEntity,
  BusinessEntityLayout,
  BusinessColumn,
  BusinessColumnDataType,
  BusinessRow,
  BusinessCellValue,
  BusinessRelation,
  BusinessRelationKind,
  BusinessSource,
  BusinessSourceTypeId,
  BusinessAttachment,
  BusinessValidationResult,
  BusinessDatasetVersion,
  BusinessEntityTypeId,
  BusinessEntityTypeDefinition,
  BusinessSourceTypeDefinition,
  ValidationResult,
  ValidationSeverity,
  Severity,
  ValidationInfo,
  ValidationWarning,
  ValidationError,
  IDataNormalizer,
  ISchemaDetector,
  IEntityDetector,
  IValidationEngine,
  BusinessDatasetRootKey
} from './dataset';

/** Import Engine — Architecture Freeze v1.0 foundation */
export {
  IMPORT_STATUS_LABELS,
  IMPORT_ENGINE_PORT_COUNT,
  IMPORT_PIPELINE_STAGES,
  IMPORT_PIPELINE_STAGE_COUNT,
  getImportPipelineStage,
  listImportPipelineStages,
  IMPORT_ADAPTER_REGISTRY,
  IMPORT_ADAPTER_COUNT,
  getImportAdapterById,
  listImportAdapters,
  IMPORT_ENGINE_SCHEMA_VERSION,
  IMPORT_ENGINE_DEFAULT_LOCALE
} from './import';
export type {
  ImportAdapterTypeId,
  ImportSource,
  ImportStage,
  ImportStatus,
  ImportError,
  ImportContext,
  ImportRequest,
  ImportResult,
  IImportReader,
  IImportDetector,
  ImportDetectionResult,
  ISemanticMapper,
  SemanticColumnMapping,
  SemanticMappingResult,
  IImportValidator,
  IImportPipeline,
  ImportPipelineStageDefinition,
  ImportAdapterRegistration
} from './import';

/** Analysis Engine — Architecture Freeze v1.0 foundation */
export {
  ANALYSIS_MODEL_COUNT,
  ANALYSIS_STATUS_LABELS,
  ANALYSIS_ENGINE_PORT_COUNT,
  ANALYSIS_PIPELINE_STAGES,
  ANALYSIS_PIPELINE_STAGE_COUNT,
  getAnalysisPipelineStage,
  listAnalysisPipelineStages,
  ANALYSIS_REGISTRY,
  ANALYSIS_REGISTRY_COUNT,
  RULE_REGISTRY,
  RULE_REGISTRY_COUNT,
  FINDING_REGISTRY,
  FINDING_REGISTRY_COUNT,
  KPI_REGISTRY_BRIDGE,
  KPI_REGISTRY_BRIDGE_COUNT,
  ANALYSIS_REGISTRY_STRUCTURE_COUNT,
  listAnalyses,
  getAnalysisById,
  listRules,
  getRuleById,
  listFindingTemplates,
  getFindingTemplateByCode,
  listBridgedKPIs,
  getBridgedKPIById,
  ANALYSIS_ENGINE_SCHEMA_VERSION,
  ANALYSIS_ENGINE_NAME,
  ANALYSIS_ENGINE_DEFAULT_LOCALE,
  ANALYSIS_PIPELINE_STAGE_IDS,
  ANALYSIS_REGISTRY_KIND
} from './analysis';
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
  AnalysisResult,
  IAnalysisEngine,
  IKPIEngine,
  IRuleEngine,
  IAnalysisPipeline,
  IFindingBuilder,
  ISummaryBuilder,
  AnalysisPipelineStageDefinition,
  AnalysisDefinitionEntry,
  FindingTemplateDefinition,
  AnalysisRegistryKind,
  AnalysisRuleDefinition,
  AnalysisRuleStatus,
  AnalysisRuleEvaluationInput,
  KPIComputationRequest,
  KPIComputationOutcome,
  KPIComputationHandler
} from './analysis';
