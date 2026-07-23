/**
 * Session Runtime — dışa aktarımlar (PR-203C).
 */

export type {
  SessionState,
  SessionLifetime,
  SessionExpiration,
  RenewalReference,
  SessionActivity,
  DeviceReference,
  Session,
  SessionModule,
  SessionProjection
} from './SessionModule';
export { toSessionProjection } from './SessionModule';

export type { SessionContext } from './SessionContext';
export { createSessionContext } from './SessionContext';

export type {
  SessionValidationIssue,
  SessionSummaryItem,
  SessionSummary,
  SessionTelemetry,
  SessionResult
} from './SessionResult';
export { PIPELINE_BAG_SESSION_RESULT_KEY } from './SessionResult';

export {
  SessionRegistry,
  SessionRegistryRuntime,
  createSessionRegistry,
  createSessionRegistryRuntime
} from './SessionRegistry';

export { SessionRuntime, createSessionRuntime } from './SessionRuntime';

export {
  BUILTIN_SESSION_MODULES,
  BUILTIN_SESSION_MODULE_COUNT,
  getBuiltinSessionModule
} from './builtinModules';

export {
  validateSessionContext,
  resolveSessionIdentityProjections,
  resolveSessionAuthenticationProjections,
  resolveRequestedSessions
} from './sessionValidation';

export {
  buildSessionSummary,
  buildSessionSummaryItems
} from './sessionSummary';
