/**
 * Authentication Runtime — dışa aktarımlar (PR-203B).
 */

export type {
  AuthenticationStatus,
  AuthenticationMethod,
  Principal,
  CredentialReference,
  AuthenticationState,
  AuthenticationModule,
  AuthenticationProjection
} from './AuthenticationModule';
export { toAuthenticationProjection } from './AuthenticationModule';

export type { AuthenticationContext } from './AuthenticationContext';
export { createAuthenticationContext } from './AuthenticationContext';

export type {
  AuthenticationValidationIssue,
  AuthenticationSummaryItem,
  AuthenticationSummary,
  AuthenticationTelemetry,
  AuthenticationResult
} from './AuthenticationResult';
export { PIPELINE_BAG_AUTHENTICATION_RESULT_KEY } from './AuthenticationResult';

export {
  AuthenticationRegistry,
  AuthenticationRegistryRuntime,
  createAuthenticationRegistry,
  createAuthenticationRegistryRuntime
} from './AuthenticationRegistry';

export {
  AuthenticationRuntime,
  createAuthenticationRuntime
} from './AuthenticationRuntime';

export {
  BUILTIN_AUTHENTICATION_MODULES,
  BUILTIN_AUTHENTICATION_MODULE_COUNT,
  getBuiltinAuthenticationModule
} from './builtinModules';

export {
  validateAuthenticationContext,
  resolveIdentityProjections,
  resolveRequestedAuthentications
} from './authenticationValidation';

export {
  buildAuthenticationSummary,
  buildAuthenticationSummaryItems
} from './authenticationSummary';
