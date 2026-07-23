/**
 * İSTEBUL Identity — Authentication Adapter Foundation (EPIC-301A).
 *
 * Architecture Freeze — authentication/runtime değiştirilmez.
 * Provider implementasyonu yoktur; yalnızca adapter iskeleti.
 */

export type {
  AuthenticationProviderOperation,
  AuthenticationProviderContext
} from './AuthenticationProviderContext';

export {
  createAuthenticationProviderContext
} from './AuthenticationProviderContext';

export type {
  AuthenticationProviderValidationIssue,
  AuthenticationProviderSummaryItem,
  AuthenticationProviderTelemetry,
  AuthenticationProviderResult,
  CreateAuthenticationProviderResultInput
} from './AuthenticationProviderResult';

export {
  createAuthenticationProviderResult,
  createAuthenticationProviderFailure,
  createAuthenticationProviderSuccess
} from './AuthenticationProviderResult';

export type {
  AuthenticationProviderRegistration,
  AuthenticationProviderOperationResult,
  AuthenticationProvider
} from './AuthenticationProvider';

export {
  AuthenticationProviderRegistry,
  AuthenticationProviderRegistryRuntime,
  createAuthenticationProviderRegistry,
  createAuthenticationProviderRegistryRuntime
} from './AuthenticationProviderRegistry';

export {
  BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS,
  BUILTIN_AUTHENTICATION_PROVIDER_COUNT,
  getBuiltinAuthenticationProviderRegistration
} from './builtinProviders';

export {
  validateAuthenticationProviderContext,
  resolveAuthenticationProvider,
  resolveAuthenticationProviderRegistration,
  hasAuthenticationProviderValidationErrors
} from './authenticationAdapterValidation';

export {
  AuthenticationAdapter,
  createAuthenticationAdapter
} from './AuthenticationAdapter';
