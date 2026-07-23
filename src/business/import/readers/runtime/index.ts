/**
 * Reader Registry Runtime — dışa aktarımlar (PR-101B).
 */

export type { ReaderDescriptor } from './ReaderDescriptor';
export type { ReaderRegistration } from './ReaderRegistration';
export type { ImportTarget } from './ImportTarget';

export {
  ReaderRegistryError,
  ReaderNotFoundError,
  DuplicateReaderError,
  InvalidRegistrationError,
  UnsupportedSourceError,
  READER_REGISTRY_ERROR_CODES
} from './errors';
export type { ReaderRegistryErrorCode } from './errors';

export type {
  ReaderLookupTelemetry,
  ReaderSelectionReason,
  ReaderSelectionReasonCode
} from './telemetry';
export { PIPELINE_BAG_READER_LOOKUP_KEY } from './telemetry';

export {
  ReaderResolver,
  resolveFromRegistrations
} from './ReaderResolver';
export type { ReaderResolveResult } from './ReaderResolver';

export {
  ReaderRegistryRuntime,
  createReaderRegistryRuntime
} from './ReaderRegistryRuntime';

export { ReaderFactory, createReaderFactory } from './ReaderFactory';
export type { ReaderFactoryResult } from './ReaderFactory';

export { StubImportReader } from './StubImportReader';

export {
  attachReaderLookupToPipelineContext,
  readReaderLookupFromPipelineContext
} from './pipelineBridge';

export { normalizeExtension, normalizeMimeType } from './normalize';
