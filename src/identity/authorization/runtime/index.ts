/**
 * Authorization Runtime — dışa aktarımlar (PR-203D).
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
  AuthorizationProjection
} from './AuthorizationModule';
export { toAuthorizationProjection } from './AuthorizationModule';

export type { AuthorizationContext } from './AuthorizationContext';
export { createAuthorizationContext } from './AuthorizationContext';

export type {
  AuthorizationValidationIssue,
  AuthorizationSummaryItem,
  AuthorizationSummary,
  AuthorizationTelemetry,
  AuthorizationResult
} from './AuthorizationResult';
export { PIPELINE_BAG_AUTHORIZATION_RESULT_KEY } from './AuthorizationResult';

export {
  AuthorizationRegistry,
  AuthorizationRegistryRuntime,
  createAuthorizationRegistry,
  createAuthorizationRegistryRuntime
} from './AuthorizationRegistry';

export {
  AuthorizationRuntime,
  createAuthorizationRuntime
} from './AuthorizationRuntime';

export {
  BUILTIN_AUTHORIZATION_MODULES,
  BUILTIN_AUTHORIZATION_MODULE_COUNT,
  getBuiltinAuthorizationModule
} from './builtinModules';

export {
  validateAuthorizationContext,
  resolveAuthorizationIdentityProjections,
  resolveAuthorizationAuthenticationProjections,
  resolveAuthorizationSessionProjections,
  resolveRequestedAuthorizations
} from './authorizationValidation';

export {
  buildAuthorizationSummary,
  buildAuthorizationSummaryItems
} from './authorizationSummary';
