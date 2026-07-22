/**
 * İSTEBUL Identity — Supabase Authentication Provider (EPIC-301B).
 *
 * Architecture Freeze — AuthenticationRuntime / IdentityRuntime /
 * AuthenticationAdapter interface değiştirilmez.
 */

export type { AuthenticationErrorCode } from './AuthenticationError';

export {
  AuthenticationError,
  SessionExpired,
  InvalidCredentials,
  ProviderUnavailable,
  createAuthenticationErrorByCode,
  toAuthenticationError
} from './AuthenticationError';

export {
  SUPABASE_AUTHENTICATION_PROVIDER_ID,
  SUPABASE_AUTHENTICATION_PROVIDER_NAME,
  SUPABASE_AUTHENTICATION_PROVIDER_DESCRIPTION
} from './constants';

export type { SupabaseAuthenticationContext } from './SupabaseAuthenticationContext';

export {
  SUPABASE_CONTEXT_BAG_KEY,
  createSupabaseAuthenticationContext,
  toAuthenticationProviderContext,
  fromAuthenticationProviderContext,
  validateSupabaseAuthenticateCredentials
} from './SupabaseAuthenticationContext';

export type {
  SupabaseAuthUser,
  SupabaseAuthSession,
  SupabaseAuthenticationErrorInfo,
  SupabaseAuthenticationResult,
  CreateSupabaseAuthenticationResultInput
} from './SupabaseAuthenticationResult';

export {
  createSupabaseAuthenticationResult,
  toPrincipalFromSupabaseUser,
  toCredentialReferenceFromSupabaseSession,
  toAuthenticationProviderResult
} from './SupabaseAuthenticationResult';

export type {
  SupabaseAuthUserLike,
  SupabaseAuthSessionLike,
  SupabaseClientAuthErrorLike,
  SupabaseAuthResponseLike,
  SupabaseAuthClientLike
} from './SupabaseAuthClient';

export { assertSupabaseAuthClient } from './SupabaseAuthClient';

export type { SupabaseAuthErrorLike } from './supabaseErrorMapping';

export {
  mapSupabaseErrorMessageToCode,
  mapSupabaseAuthError,
  mapUnknownProviderError
} from './supabaseErrorMapping';

export type { SupabaseAuthenticationProviderDependencies } from './SupabaseAuthenticationProvider';

export {
  SupabaseAuthenticationProvider,
  createSupabaseAuthenticationProvider
} from './SupabaseAuthenticationProvider';

export {
  createSupabaseAuthenticationProviderRegistration,
  registerSupabaseAuthenticationProvider,
  createAuthenticationAdapterWithSupabaseProvider,
  attachSupabaseAuthenticationProvider
} from './registerSupabaseAuthenticationProvider';
