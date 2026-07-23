/**
 * Narrative Composer Runtime — dışa aktarımlar (PR-104C).
 */

export type { NarrativeKind } from './NarrativeKind';
export {
  NARRATIVE_KIND_LABELS,
  NARRATIVE_KIND_ORDER
} from './NarrativeKind';

export type { NarrativeTemplate } from './NarrativeTemplate';
export type { NarrativeRecord } from './NarrativeRecord';

export type { NarrativeContext } from './NarrativeContext';
export { createNarrativeContext } from './NarrativeContext';

export type {
  NarrativeWarning,
  NarrativeTelemetry,
  NarrativeMetadata,
  NarrativeResult
} from './NarrativeResult';
export { PIPELINE_BAG_NARRATIVE_RUNTIME_RESULT_KEY } from './NarrativeResult';

export {
  NarrativeRegistryRuntime,
  createNarrativeRegistryRuntime
} from './NarrativeRegistryRuntime';

export {
  NarrativeComposerRuntime,
  createNarrativeComposerRuntime
} from './NarrativeComposerRuntime';

export {
  BUILTIN_NARRATIVE_TEMPLATES,
  BUILTIN_NARRATIVE_TEMPLATE_COUNT,
  getBuiltinNarrativeTemplate,
  getBuiltinNarrativeTemplateByKind
} from './builtinTemplates';

export {
  attachNarrativeToPipelineContext,
  readNarrativeFromPipelineContext,
  attachNarrativeToPipelineResult,
  readNarrativeFromPipelineResult,
  applyNarrativeComposerToPipelineResult
} from './pipelineBridge';
