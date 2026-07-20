/**
 * Report Section Builder Runtime — dışa aktarımlar (PR-104D).
 */

export type { ReportSectionId } from './ReportSectionId';
export {
  REPORT_SECTION_LABELS,
  REPORT_SECTION_ORDER,
  REPORT_SECTION_KIND_BY_ID,
  REPORT_SECTION_NARRATIVE_KIND
} from './ReportSectionId';

export type { ReportSectionDefinition } from './ReportSectionDefinition';
export type { ReportSectionRecord } from './ReportSectionRecord';

export type { ReportSectionContext } from './ReportSectionContext';
export { createReportSectionContext } from './ReportSectionContext';

export type {
  ReportSectionWarning,
  ReportSectionTelemetry,
  ReportSectionMetadata,
  ReportSectionResult
} from './ReportSectionResult';
export { PIPELINE_BAG_REPORT_SECTION_RUNTIME_RESULT_KEY } from './ReportSectionResult';

export {
  ReportSectionRegistryRuntime,
  createReportSectionRegistryRuntime
} from './ReportSectionRegistryRuntime';

export {
  ReportSectionBuilderRuntime,
  createReportSectionBuilderRuntime
} from './ReportSectionBuilderRuntime';

export {
  BUILTIN_REPORT_SECTION_DEFINITIONS,
  BUILTIN_REPORT_SECTION_DEFINITION_COUNT,
  getBuiltinReportSectionDefinition,
  getBuiltinReportSectionDefinitionByCode
} from './builtinDefinitions';

export {
  attachReportSectionToPipelineContext,
  readReportSectionFromPipelineContext,
  attachReportSectionToPipelineResult,
  readReportSectionFromPipelineResult,
  applyReportSectionBuilderToPipelineResult
} from './pipelineBridge';
