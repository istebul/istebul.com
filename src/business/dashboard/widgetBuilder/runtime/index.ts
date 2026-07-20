/**
 * Widget Builder Runtime — dışa aktarımlar (PR-105C).
 */

export type { WidgetId } from './WidgetId';
export {
  WIDGET_LABELS,
  WIDGET_ORDER,
  WIDGET_KIND_BY_ID,
  WIDGET_SOURCE_PART_BY_ID
} from './WidgetId';

export type { WidgetDefinition } from './WidgetDefinition';
export type { WidgetRecord } from './WidgetRecord';

export type { WidgetContext } from './WidgetContext';
export { createWidgetContext } from './WidgetContext';

export type {
  WidgetWarning,
  WidgetTelemetry,
  WidgetMetadata,
  WidgetResult
} from './WidgetResult';
export { PIPELINE_BAG_DASHBOARD_WIDGET_RUNTIME_RESULT_KEY } from './WidgetResult';

export {
  WidgetRegistryRuntime,
  createWidgetRegistryRuntime
} from './WidgetRegistryRuntime';

export {
  WidgetBuilderRuntime,
  createWidgetBuilderRuntime
} from './WidgetBuilderRuntime';

export {
  BUILTIN_WIDGET_DEFINITIONS,
  BUILTIN_WIDGET_DEFINITION_COUNT,
  getBuiltinWidgetDefinition,
  getBuiltinWidgetDefinitionByCode
} from './builtinDefinitions';

export {
  attachWidgetToPipelineContext,
  readWidgetFromPipelineContext,
  attachWidgetToPipelineResult,
  readWidgetFromPipelineResult,
  applyWidgetBuilderToPipelineResult
} from './pipelineBridge';
