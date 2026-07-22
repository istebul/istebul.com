/**
 * İSTEBUL Identity — builtin authentication provider metadata (EPIC-301A).
 *
 * Yalnızca metadata kayıtları; provider implementasyonu yoktur.
 */

import type { AuthenticationProviderRegistration } from './AuthenticationProvider';

const BUILTIN_PROVIDER_DEFINITIONS: AuthenticationProviderRegistration[] = [
  {
    id: 'provider-password-001',
    name: 'Password',
    description: 'Parola tabanlı kimlik doğrulama provider slotu.',
    method: 'password',
    providerRegistered: false,
    order: 1
  },
  {
    id: 'provider-magic-link-002',
    name: 'Magic Link',
    description: 'Sihirli bağlantı kimlik doğrulama provider slotu.',
    method: 'magic-link',
    providerRegistered: false,
    order: 2
  },
  {
    id: 'provider-oauth-003',
    name: 'OAuth',
    description: 'OAuth kimlik doğrulama provider slotu.',
    method: 'oauth',
    providerRegistered: false,
    order: 3
  },
  {
    id: 'provider-oidc-004',
    name: 'OIDC',
    description: 'OpenID Connect kimlik doğrulama provider slotu.',
    method: 'oidc',
    providerRegistered: false,
    order: 4
  },
  {
    id: 'provider-api-key-005',
    name: 'API Key',
    description: 'API anahtarı kimlik doğrulama provider slotu.',
    method: 'api-key',
    providerRegistered: false,
    order: 5
  },
  {
    id: 'provider-session-ref-006',
    name: 'Session Reference',
    description: 'Oturum referansı kimlik doğrulama provider slotu.',
    method: 'session-ref',
    providerRegistered: false,
    order: 6
  }
];

export const BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS: readonly AuthenticationProviderRegistration[] =
  Object.freeze(BUILTIN_PROVIDER_DEFINITIONS);

export const BUILTIN_AUTHENTICATION_PROVIDER_COUNT =
  BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS.length;

export function getBuiltinAuthenticationProviderRegistration(
  providerId: string
): AuthenticationProviderRegistration | undefined {
  return BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS.find(
    (entry) => entry.id === providerId
  );
}
