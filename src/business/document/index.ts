/**
 * İSTEBUL Business Document Engine — dışa aktarım yüzeyi.
 *
 * Architecture Freeze v1.0 — tanım ve port katmanı.
 * PDF/Word/HTML üretimi ve dosya kaydı yoktur.
 */

export {
  DOCUMENT_MODEL_COUNT,
  DOCUMENT_EXECUTION_STATUS_LABELS
} from './models';
export type {
  DocumentStage,
  DocumentExecutionStatus,
  DocumentRequest,
  DocumentMetadata,
  DocumentLayout,
  DocumentPageSize,
  DocumentOrientation,
  DocumentStyle,
  DocumentTheme,
  DocumentHeader,
  DocumentFooter,
  DocumentSection,
  DocumentReview,
  DocumentReviewVerdict,
  DocumentModel,
  DocumentContext
} from './models';

export { DOCUMENT_ENGINE_PORT_COUNT } from './ports';
export type {
  IDocumentEngine,
  IDocumentPipeline,
  ILayoutBuilder,
  IStyleResolver,
  IDocumentComposer,
  IDocumentReviewer
} from './ports';

export type { DocumentPipelineStageDefinition } from './pipeline/DocumentPipeline';
export {
  DOCUMENT_PIPELINE_STAGES,
  DOCUMENT_PIPELINE_STAGE_COUNT,
  getDocumentPipelineStage,
  listDocumentPipelineStages
} from './pipeline/DocumentPipeline';

export {
  DOCUMENT_REGISTRY_STRUCTURE_COUNT,
  DOCUMENT_PROFILE_REGISTRY,
  DOCUMENT_PROFILE_REGISTRY_COUNT,
  LAYOUT_REGISTRY,
  LAYOUT_REGISTRY_COUNT,
  STYLE_REGISTRY,
  STYLE_REGISTRY_COUNT,
  THEME_REGISTRY,
  THEME_REGISTRY_COUNT,
  listDocumentProfiles,
  getDocumentProfileById,
  listLayouts,
  getLayoutById,
  listStyles,
  getStyleById,
  listThemes,
  getThemeById
} from './registry';
export type { DocumentProfileDefinition } from './registry';

export {
  DOCUMENT_ENGINE_SCHEMA_VERSION,
  DOCUMENT_ENGINE_NAME,
  DOCUMENT_ENGINE_DEFAULT_LOCALE,
  DOCUMENT_PIPELINE_STAGE_IDS,
  DOCUMENT_REGISTRY_KIND
} from './constants/DocumentEngineConstants';
export type { DocumentRegistryKind } from './constants/DocumentEngineConstants';

export type { LayoutDefinitionEntry } from './layouts/LayoutContract';
export type {
  StyleDefinitionEntry,
  ThemeDefinitionEntry
} from './styles/StyleContract';
