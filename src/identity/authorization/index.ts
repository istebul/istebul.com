/**
 * İSTEBUL Identity — Authorization (RBAC) Runtime (PR-203D).
 *
 * Architecture Freeze v1.0 — additive runtime.
 * Identity Foundation / Authentication / Session (PR-203A–C) değiştirilmez.
 * Yalnızca projeksiyon; Middleware / JWT Claims / Policy Engine /
 * Supabase RLS / API / DB yok.
 */

export type {
  AuthorizationDecisionOutcome,
  AuthorizationRoleScope,
  AuthorizationAction,
  AuthorizationResource,
  AuthorizationPermission,
  AuthorizationRole,
  AuthorizationPolicy,
  AuthorizationDecision,
  AuthorizationModule,
  AuthorizationProjection,
  AuthorizationContext,
  AuthorizationValidationIssue,
  AuthorizationSummaryItem,
  AuthorizationSummary,
  AuthorizationTelemetry,
  AuthorizationResult
} from './runtime/index';

export {
  toAuthorizationProjection,
  createAuthorizationContext,
  PIPELINE_BAG_AUTHORIZATION_RESULT_KEY,
  AuthorizationRegistry,
  AuthorizationRegistryRuntime,
  createAuthorizationRegistry,
  createAuthorizationRegistryRuntime,
  AuthorizationRuntime,
  createAuthorizationRuntime,
  BUILTIN_AUTHORIZATION_MODULES,
  BUILTIN_AUTHORIZATION_MODULE_COUNT,
  getBuiltinAuthorizationModule,
  validateAuthorizationContext,
  resolveAuthorizationIdentityProjections,
  resolveAuthorizationAuthenticationProjections,
  resolveAuthorizationSessionProjections,
  resolveRequestedAuthorizations,
  buildAuthorizationSummary,
  buildAuthorizationSummaryItems
} from './runtime/index';
