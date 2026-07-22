/**
 * İSTEBUL Identity — Session Management Runtime (PR-203C).
 *
 * Architecture Freeze v1.0 — additive runtime.
 * Identity Foundation (PR-203A) ve Authentication Runtime (PR-203B)
 * değiştirilmez.
 * Yalnızca projeksiyon; JWT / Refresh Token / Cookie / Supabase Auth /
 * OAuth / OIDC / API / DB yok.
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
  SessionProjection,
  SessionContext,
  SessionValidationIssue,
  SessionSummaryItem,
  SessionSummary,
  SessionTelemetry,
  SessionResult
} from './runtime/index';

export {
  toSessionProjection,
  createSessionContext,
  PIPELINE_BAG_SESSION_RESULT_KEY,
  SessionRegistry,
  SessionRegistryRuntime,
  createSessionRegistry,
  createSessionRegistryRuntime,
  SessionRuntime,
  createSessionRuntime,
  BUILTIN_SESSION_MODULES,
  BUILTIN_SESSION_MODULE_COUNT,
  getBuiltinSessionModule,
  validateSessionContext,
  resolveSessionIdentityProjections,
  resolveSessionAuthenticationProjections,
  resolveRequestedSessions,
  buildSessionSummary,
  buildSessionSummaryItems
} from './runtime/index';
