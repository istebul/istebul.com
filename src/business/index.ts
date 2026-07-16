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
