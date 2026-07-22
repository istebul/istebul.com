/**
 * İSTEBUL Identity — yerleşik authentication tanımları (PR-203B).
 *
 * Projection-only örnek kayıtlar. Gerçek provider / JWT / OAuth yok.
 */

import type { AuthenticationModule } from './AuthenticationModule';

/**
 * Yerleşik Authentication Module iskeletleri.
 */
export const BUILTIN_AUTHENTICATION_MODULES: readonly AuthenticationModule[] =
  Object.freeze([
    {
      id: 'auth-owner-001',
      state: {
        stateId: 'state-owner-001',
        status: 'authenticated',
        principal: {
          principalId: 'principal-owner-001',
          identityId: 'identity-platform-owner-001',
          displayName: 'Platform Owner',
          tenantId: 'tenant-platform'
        },
        credentialReference: {
          credentialId: 'cred-owner-001',
          method: 'session-ref',
          issuedAt: '2026-07-01T10:00:00.000Z',
          expiresAt: '2026-07-22T10:00:00.000Z'
        },
        method: 'session-ref',
        lastAuthenticatedAt: '2026-07-21T09:00:00.000Z'
      },
      order: 1,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-07-21T09:00:00.000Z'
    },
    {
      id: 'auth-padmin-002',
      state: {
        stateId: 'state-padmin-002',
        status: 'authenticated',
        principal: {
          principalId: 'principal-padmin-002',
          identityId: 'identity-platform-admin-002',
          displayName: 'Platform Admin',
          tenantId: 'tenant-platform'
        },
        credentialReference: {
          credentialId: 'cred-padmin-002',
          method: 'password',
          issuedAt: '2026-07-10T08:00:00.000Z',
          expiresAt: '2026-07-24T08:00:00.000Z'
        },
        method: 'password',
        lastAuthenticatedAt: '2026-07-20T14:00:00.000Z'
      },
      order: 2,
      createdAt: '2026-02-01T09:00:00.000Z',
      updatedAt: '2026-07-20T14:00:00.000Z'
    },
    {
      id: 'auth-badmin-003',
      state: {
        stateId: 'state-badmin-003',
        status: 'authenticated',
        principal: {
          principalId: 'principal-badmin-003',
          identityId: 'identity-business-admin-003',
          displayName: 'Business Admin',
          tenantId: 'tenant-demo-001'
        },
        credentialReference: {
          credentialId: 'cred-badmin-003',
          method: 'magic-link',
          issuedAt: '2026-07-15T11:00:00.000Z',
          expiresAt: '2026-07-22T11:00:00.000Z'
        },
        method: 'magic-link',
        lastAuthenticatedAt: '2026-07-21T11:30:00.000Z'
      },
      order: 3,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-07-21T11:30:00.000Z'
    },
    {
      id: 'auth-member-004',
      state: {
        stateId: 'state-member-004',
        status: 'pending',
        principal: {
          principalId: 'principal-member-004',
          identityId: 'identity-tenant-member-004',
          displayName: 'Tenant Member',
          tenantId: 'tenant-demo-001'
        },
        credentialReference: {
          credentialId: 'cred-member-004',
          method: 'oauth',
          issuedAt: '2026-07-18T10:00:00.000Z'
        },
        method: 'oauth'
      },
      order: 4,
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-07-18T10:00:00.000Z'
    },
    {
      id: 'auth-viewer-005',
      state: {
        stateId: 'state-viewer-005',
        status: 'expired',
        principal: {
          principalId: 'principal-viewer-005',
          identityId: 'identity-viewer-005',
          displayName: 'Viewer',
          tenantId: 'tenant-trial-002'
        },
        credentialReference: {
          credentialId: 'cred-viewer-005',
          method: 'oidc',
          issuedAt: '2026-07-01T09:00:00.000Z',
          expiresAt: '2026-07-08T09:00:00.000Z'
        },
        method: 'oidc',
        lastAuthenticatedAt: '2026-07-01T09:05:00.000Z'
      },
      order: 5,
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-07-08T09:00:00.000Z'
    },
    {
      id: 'auth-susp-006',
      state: {
        stateId: 'state-susp-006',
        status: 'revoked',
        principal: {
          principalId: 'principal-susp-006',
          identityId: 'identity-suspended-006',
          displayName: 'Suspended User',
          tenantId: 'tenant-susp-005'
        },
        credentialReference: {
          credentialId: 'cred-susp-006',
          method: 'api-key',
          issuedAt: '2026-05-01T10:00:00.000Z',
          expiresAt: '2026-05-02T10:00:00.000Z'
        },
        method: 'api-key',
        lastAuthenticatedAt: '2026-05-01T10:05:00.000Z'
      },
      order: 6,
      createdAt: '2026-03-20T11:00:00.000Z',
      updatedAt: '2026-07-05T08:00:00.000Z'
    },
    {
      id: 'auth-anon-007',
      state: {
        stateId: 'state-anon-007',
        status: 'unauthenticated',
        principal: {
          principalId: 'principal-anon-007',
          identityId: 'identity-platform-owner-001',
          displayName: 'Anonymous Projection',
          tenantId: 'tenant-platform'
        },
        credentialReference: {
          credentialId: 'cred-anon-007',
          method: 'session-ref'
        },
        method: 'session-ref'
      },
      order: 7,
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T00:00:00.000Z'
    }
  ] as AuthenticationModule[]);

/** Yerleşik authentication sayısı */
export const BUILTIN_AUTHENTICATION_MODULE_COUNT =
  BUILTIN_AUTHENTICATION_MODULES.length;

/**
 * Yerleşik authentication tanımını id ile döndürür.
 */
export function getBuiltinAuthenticationModule(
  authenticationId: string
): AuthenticationModule | undefined {
  return BUILTIN_AUTHENTICATION_MODULES.find(
    (item) => item.id === authenticationId
  );
}
