/**
 * İSTEBUL Business — Knowledge Architecture dışa aktarım yüzeyi.
 *
 * Report DNA, KPI, kategori, prompt, çıktı ve gelecek AI port sözleşmeleri.
 * Bu katman tanım / kayıt odaklıdır; rapor üretim motoru içermez.
 */

export type {
  BusinessCategoryId,
  BusinessCategoryKind,
  CategoryDefinition
} from './categories/CategoryDefinition';
export {
  CATEGORY_COUNT,
  CATEGORY_REGISTRY,
  getCategoryById,
  listCategories
} from './categories/CategoryRegistry';

export type {
  DashboardWidgetSuggestion,
  ReportDefinition,
  ReportStatus,
  RequiredDataTypeId,
  SupportedFileType
} from './reports/ReportDefinition';
export { REPORT_STATUS_LABELS } from './reports/ReportDefinition';
export {
  REPORT_COUNT,
  REPORT_REGISTRY,
  getReportById,
  listActiveReports,
  listReports,
  listReportsByCategory
} from './reports/ReportRegistry';

export type {
  KPICalculationType,
  KPIDefinition
} from './kpis/KPIDefinition';
export {
  KPI_COUNT,
  KPI_REGISTRY,
  getKPIById,
  listKPIs,
  listKPIsByCategory
} from './kpis/KPIRegistry';

export type {
  PromptKey,
  PromptRegistryEntry
} from './prompts/PromptDefinition';
export {
  PROMPT_COUNT,
  PROMPT_REGISTRY,
  getPromptByKey,
  listPromptKeys
} from './prompts/PromptRegistry';

export type {
  OutputDefinition,
  OutputFormatId
} from './outputs/OutputDefinition';
export {
  OUTPUT_COUNT,
  OUTPUT_REGISTRY,
  getOutputById,
  listOutputs
} from './outputs/OutputRegistry';

export type {
  BusinessKnowledgeAIPort,
  KnowledgeAnalysisDataRef,
  KnowledgeAnalysisRequest,
  KnowledgeAnalysisResult
} from './schemas/KnowledgeAIInterfaces';
