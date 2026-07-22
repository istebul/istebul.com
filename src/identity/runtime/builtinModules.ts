/**
 * İSTEBUL Identity — yerleşik kimlik tanımları (PR-203A).
 *
 * Projection-only örnek kayıtlar. Login / Auth / DB yok.
 */

import type { IdentityModule } from './IdentityModule';

/**
 * Yerleşik Identity Module iskeletleri — Platform + Business Admin ortak kullanım.
 */
export const BUILTIN_IDENTITY_MODULES: readonly IdentityModule[] = Object.freeze(
  [
    {
      id: 'identity-platform-owner-001',
      user: {
        id: 'user-owner-001',
        displayName: 'Platform Owner',
        email: 'owner@istebul.example',
        username: 'platform-owner'
      },
      tenant: {
        id: 'tenant-platform',
        slug: 'istebul-platform',
        displayName: 'İSTEBUL Platform'
      },
      roles: [
        {
          id: 'platform-owner',
          name: 'Platform Owner',
          scope: 'platform'
        }
      ],
      permissions: [
        {
          id: 'perm-platform-all',
          action: '*',
          resource: 'platform'
        },
        {
          id: 'perm-tenant-read',
          action: 'read',
          resource: 'tenant'
        }
      ],
      claims: {
        audience: 'platform-admin',
        locale: 'tr'
      },
      sessionReference: {
        sessionId: 'sess-ref-owner-001',
        issuedAt: '2026-07-01T10:00:00.000Z',
        expiresAt: '2026-07-22T10:00:00.000Z'
      },
      status: 'active',
      order: 1,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-07-01T12:00:00.000Z'
    },
    {
      id: 'identity-platform-admin-002',
      user: {
        id: 'user-padmin-002',
        displayName: 'Platform Admin',
        email: 'admin@istebul.example',
        username: 'platform-admin'
      },
      tenant: {
        id: 'tenant-platform',
        slug: 'istebul-platform',
        displayName: 'İSTEBUL Platform'
      },
      roles: [
        {
          id: 'platform-admin',
          name: 'Platform Admin',
          scope: 'platform'
        }
      ],
      permissions: [
        {
          id: 'perm-users-manage',
          action: 'manage',
          resource: 'users'
        },
        {
          id: 'perm-tenant-manage',
          action: 'manage',
          resource: 'tenant'
        },
        {
          id: 'perm-logs-read',
          action: 'read',
          resource: 'logs'
        }
      ],
      claims: {
        audience: 'platform-admin',
        locale: 'tr'
      },
      sessionReference: {
        sessionId: 'sess-ref-padmin-002',
        issuedAt: '2026-07-10T08:00:00.000Z'
      },
      status: 'active',
      order: 2,
      createdAt: '2026-02-01T09:00:00.000Z',
      updatedAt: '2026-07-10T08:00:00.000Z'
    },
    {
      id: 'identity-business-admin-003',
      user: {
        id: 'user-badmin-003',
        displayName: 'Business Admin',
        email: 'biz-admin@demo.example',
        username: 'biz-admin'
      },
      tenant: {
        id: 'tenant-demo-001',
        slug: 'demo-istebul',
        displayName: 'Demo İSTEBUL'
      },
      roles: [
        {
          id: 'business-admin',
          name: 'Business Admin',
          scope: 'business'
        },
        {
          id: 'tenant-admin',
          name: 'Tenant Admin',
          scope: 'tenant'
        }
      ],
      permissions: [
        {
          id: 'perm-dashboard-read',
          action: 'read',
          resource: 'dashboard'
        },
        {
          id: 'perm-reports-export',
          action: 'export',
          resource: 'reports'
        },
        {
          id: 'perm-settings-write',
          action: 'write',
          resource: 'business-settings'
        }
      ],
      claims: {
        audience: 'business-admin',
        tenantId: 'tenant-demo-001',
        locale: 'tr'
      },
      sessionReference: {
        sessionId: 'sess-ref-badmin-003',
        issuedAt: '2026-07-15T11:00:00.000Z',
        expiresAt: '2026-07-22T11:00:00.000Z'
      },
      status: 'active',
      order: 3,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-07-15T11:00:00.000Z'
    },
    {
      id: 'identity-tenant-member-004',
      user: {
        id: 'user-member-004',
        displayName: 'Tenant Member',
        email: 'member@demo.example',
        username: 'member'
      },
      tenant: {
        id: 'tenant-demo-001',
        slug: 'demo-istebul',
        displayName: 'Demo İSTEBUL'
      },
      roles: [
        {
          id: 'tenant-member',
          name: 'Tenant Member',
          scope: 'tenant'
        }
      ],
      permissions: [
        {
          id: 'perm-dashboard-read-member',
          action: 'read',
          resource: 'dashboard'
        }
      ],
      claims: {
        audience: 'business-admin',
        tenantId: 'tenant-demo-001',
        locale: 'tr'
      },
      sessionReference: {
        sessionId: 'sess-ref-member-004'
      },
      status: 'active',
      order: 4,
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z'
    },
    {
      id: 'identity-viewer-005',
      user: {
        id: 'user-viewer-005',
        displayName: 'Viewer',
        email: 'viewer@trial.example'
      },
      tenant: {
        id: 'tenant-trial-002',
        slug: 'trial-acme',
        displayName: 'Acme Trial'
      },
      roles: [
        {
          id: 'viewer',
          name: 'Viewer',
          scope: 'tenant'
        }
      ],
      permissions: [
        {
          id: 'perm-reports-read',
          action: 'read',
          resource: 'reports'
        }
      ],
      claims: {
        audience: 'business-admin',
        tenantId: 'tenant-trial-002',
        locale: 'en'
      },
      sessionReference: {
        sessionId: 'sess-ref-viewer-005',
        issuedAt: '2026-07-18T09:00:00.000Z'
      },
      status: 'pending',
      order: 5,
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-07-18T09:00:00.000Z'
    },
    {
      id: 'identity-suspended-006',
      user: {
        id: 'user-susp-006',
        displayName: 'Suspended User',
        email: 'suspended@west.example',
        username: 'west-suspended'
      },
      tenant: {
        id: 'tenant-susp-005',
        slug: 'suspended-west',
        displayName: 'West Suspended'
      },
      roles: [
        {
          id: 'tenant-member',
          name: 'Tenant Member',
          scope: 'tenant'
        }
      ],
      permissions: [],
      claims: {
        audience: 'business-admin',
        tenantId: 'tenant-susp-005',
        suspended: true
      },
      sessionReference: {
        sessionId: 'sess-ref-susp-006',
        issuedAt: '2026-05-01T10:00:00.000Z',
        expiresAt: '2026-05-02T10:00:00.000Z'
      },
      status: 'suspended',
      order: 6,
      createdAt: '2026-03-20T11:00:00.000Z',
      updatedAt: '2026-07-05T08:00:00.000Z'
    }
  ]
);

/** Yerleşik kimlik sayısı */
export const BUILTIN_IDENTITY_MODULE_COUNT = BUILTIN_IDENTITY_MODULES.length;

/**
 * Yerleşik kimlik tanımını id ile döndürür.
 */
export function getBuiltinIdentityModule(
  identityId: string
): IdentityModule | undefined {
  return BUILTIN_IDENTITY_MODULES.find((item) => item.id === identityId);
}
