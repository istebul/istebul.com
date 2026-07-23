/**
 * İSTEBUL Identity — yerleşik authorization tanımları (PR-203D).
 *
 * Projection-only örnek kayıtlar. Middleware / Policy Engine / RLS yok.
 */

import type { AuthorizationModule } from './AuthorizationModule';

const PLATFORM_READ: AuthorizationModule['permissions'][number] = {
  id: 'perm-platform-read',
  action: { id: 'action-read', name: 'read' },
  resource: { id: 'res-platform', type: 'platform', name: 'Platform' }
};

const TENANT_MANAGE: AuthorizationModule['permissions'][number] = {
  id: 'perm-tenant-manage',
  action: { id: 'action-manage', name: 'manage' },
  resource: { id: 'res-tenant', type: 'tenant', name: 'Tenant' }
};

const USERS_MANAGE: AuthorizationModule['permissions'][number] = {
  id: 'perm-users-manage',
  action: { id: 'action-manage', name: 'manage' },
  resource: { id: 'res-users', type: 'users', name: 'Users' }
};

const DASHBOARD_READ: AuthorizationModule['permissions'][number] = {
  id: 'perm-dashboard-read',
  action: { id: 'action-read', name: 'read' },
  resource: { id: 'res-dashboard', type: 'dashboard', name: 'Dashboard' }
};

const REPORTS_EXPORT: AuthorizationModule['permissions'][number] = {
  id: 'perm-reports-export',
  action: { id: 'action-export', name: 'export' },
  resource: { id: 'res-reports', type: 'reports', name: 'Reports' }
};

const SETTINGS_WRITE: AuthorizationModule['permissions'][number] = {
  id: 'perm-settings-write',
  action: { id: 'action-write', name: 'write' },
  resource: {
    id: 'res-business-settings',
    type: 'business-settings',
    name: 'Business Settings'
  }
};

const LOGS_READ: AuthorizationModule['permissions'][number] = {
  id: 'perm-logs-read',
  action: { id: 'action-read', name: 'read' },
  resource: { id: 'res-logs', type: 'logs', name: 'Logs' }
};

/**
 * Yerleşik Authorization Module iskeletleri.
 */
export const BUILTIN_AUTHORIZATION_MODULES: readonly AuthorizationModule[] =
  Object.freeze([
    {
      id: 'authz-owner-001',
      identityId: 'identity-platform-owner-001',
      authenticationId: 'auth-owner-001',
      sessionId: 'sess-owner-001',
      principalId: 'principal-owner-001',
      roles: [
        {
          id: 'platform-owner',
          name: 'Platform Owner',
          scope: 'platform',
          permissionIds: ['perm-platform-read', 'perm-tenant-manage']
        }
      ],
      permissions: [PLATFORM_READ, TENANT_MANAGE],
      policies: [
        {
          id: 'policy-platform-owner-allow',
          name: 'Platform Owner Allow All',
          roleIds: ['platform-owner'],
          effect: 'allow'
        }
      ],
      decisions: [
        {
          decisionId: 'dec-owner-platform-read',
          outcome: 'allow',
          roleId: 'platform-owner',
          permissionId: 'perm-platform-read',
          resourceId: 'res-platform',
          actionId: 'action-read',
          policyId: 'policy-platform-owner-allow',
          reason: 'role-match'
        },
        {
          decisionId: 'dec-owner-tenant-manage',
          outcome: 'allow',
          roleId: 'platform-owner',
          permissionId: 'perm-tenant-manage',
          resourceId: 'res-tenant',
          actionId: 'action-manage',
          policyId: 'policy-platform-owner-allow',
          reason: 'role-match'
        }
      ],
      order: 1,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-07-21T09:00:00.000Z'
    },
    {
      id: 'authz-padmin-002',
      identityId: 'identity-platform-admin-002',
      authenticationId: 'auth-padmin-002',
      sessionId: 'sess-padmin-002',
      principalId: 'principal-padmin-002',
      roles: [
        {
          id: 'platform-admin',
          name: 'Platform Admin',
          scope: 'platform',
          permissionIds: [
            'perm-users-manage',
            'perm-tenant-manage',
            'perm-logs-read'
          ]
        }
      ],
      permissions: [USERS_MANAGE, TENANT_MANAGE, LOGS_READ],
      policies: [
        {
          id: 'policy-padmin-allow',
          name: 'Platform Admin Allow',
          roleIds: ['platform-admin'],
          effect: 'allow'
        },
        {
          id: 'policy-padmin-deny-settings',
          name: 'Platform Admin Deny Settings Write',
          roleIds: ['platform-admin'],
          effect: 'deny',
          resourceId: 'res-business-settings',
          actionId: 'action-write'
        }
      ],
      decisions: [
        {
          decisionId: 'dec-padmin-users',
          outcome: 'allow',
          roleId: 'platform-admin',
          permissionId: 'perm-users-manage',
          resourceId: 'res-users',
          actionId: 'action-manage',
          policyId: 'policy-padmin-allow'
        },
        {
          decisionId: 'dec-padmin-logs',
          outcome: 'allow',
          roleId: 'platform-admin',
          permissionId: 'perm-logs-read',
          resourceId: 'res-logs',
          actionId: 'action-read',
          policyId: 'policy-padmin-allow'
        },
        {
          decisionId: 'dec-padmin-settings-deny',
          outcome: 'deny',
          roleId: 'platform-admin',
          permissionId: 'perm-settings-write',
          resourceId: 'res-business-settings',
          actionId: 'action-write',
          policyId: 'policy-padmin-deny-settings',
          reason: 'policy-deny'
        }
      ],
      order: 2,
      createdAt: '2026-02-01T09:00:00.000Z',
      updatedAt: '2026-07-20T14:00:00.000Z'
    },
    {
      id: 'authz-badmin-003',
      identityId: 'identity-business-admin-003',
      authenticationId: 'auth-badmin-003',
      sessionId: 'sess-badmin-003',
      principalId: 'principal-badmin-003',
      roles: [
        {
          id: 'business-admin',
          name: 'Business Admin',
          scope: 'business',
          permissionIds: [
            'perm-dashboard-read',
            'perm-reports-export',
            'perm-settings-write'
          ]
        },
        {
          id: 'tenant-admin',
          name: 'Tenant Admin',
          scope: 'tenant',
          permissionIds: ['perm-dashboard-read']
        }
      ],
      permissions: [DASHBOARD_READ, REPORTS_EXPORT, SETTINGS_WRITE],
      policies: [
        {
          id: 'policy-badmin-allow',
          name: 'Business Admin Allow',
          roleIds: ['business-admin', 'tenant-admin'],
          effect: 'allow'
        }
      ],
      decisions: [
        {
          decisionId: 'dec-badmin-dashboard',
          outcome: 'allow',
          roleId: 'business-admin',
          permissionId: 'perm-dashboard-read',
          resourceId: 'res-dashboard',
          actionId: 'action-read',
          policyId: 'policy-badmin-allow'
        },
        {
          decisionId: 'dec-badmin-export',
          outcome: 'allow',
          roleId: 'business-admin',
          permissionId: 'perm-reports-export',
          resourceId: 'res-reports',
          actionId: 'action-export',
          policyId: 'policy-badmin-allow'
        },
        {
          decisionId: 'dec-badmin-settings',
          outcome: 'allow',
          roleId: 'business-admin',
          permissionId: 'perm-settings-write',
          resourceId: 'res-business-settings',
          actionId: 'action-write',
          policyId: 'policy-badmin-allow'
        }
      ],
      order: 3,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-07-21T11:30:00.000Z'
    },
    {
      id: 'authz-member-004',
      identityId: 'identity-tenant-member-004',
      authenticationId: 'auth-member-004',
      sessionId: 'sess-member-004',
      principalId: 'principal-member-004',
      roles: [
        {
          id: 'tenant-member',
          name: 'Tenant Member',
          scope: 'tenant',
          permissionIds: ['perm-dashboard-read']
        }
      ],
      permissions: [DASHBOARD_READ],
      policies: [
        {
          id: 'policy-member-allow-dashboard',
          name: 'Member Dashboard Read',
          roleIds: ['tenant-member'],
          effect: 'allow',
          resourceId: 'res-dashboard',
          actionId: 'action-read'
        },
        {
          id: 'policy-member-deny-export',
          name: 'Member Deny Export',
          roleIds: ['tenant-member'],
          effect: 'deny',
          resourceId: 'res-reports',
          actionId: 'action-export'
        }
      ],
      decisions: [
        {
          decisionId: 'dec-member-dashboard',
          outcome: 'allow',
          roleId: 'tenant-member',
          permissionId: 'perm-dashboard-read',
          resourceId: 'res-dashboard',
          actionId: 'action-read',
          policyId: 'policy-member-allow-dashboard'
        },
        {
          decisionId: 'dec-member-export-deny',
          outcome: 'deny',
          roleId: 'tenant-member',
          permissionId: 'perm-reports-export',
          resourceId: 'res-reports',
          actionId: 'action-export',
          policyId: 'policy-member-deny-export',
          reason: 'insufficient-role'
        }
      ],
      order: 4,
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-07-18T10:00:00.000Z'
    },
    {
      id: 'authz-viewer-005',
      identityId: 'identity-viewer-005',
      authenticationId: 'auth-viewer-005',
      sessionId: 'sess-viewer-005',
      principalId: 'principal-viewer-005',
      roles: [
        {
          id: 'viewer',
          name: 'Viewer',
          scope: 'tenant',
          permissionIds: ['perm-reports-export']
        }
      ],
      permissions: [
        {
          id: 'perm-reports-read',
          action: { id: 'action-read', name: 'read' },
          resource: { id: 'res-reports', type: 'reports', name: 'Reports' }
        }
      ],
      policies: [
        {
          id: 'policy-viewer-read',
          name: 'Viewer Read Reports',
          roleIds: ['viewer'],
          effect: 'allow',
          resourceId: 'res-reports',
          actionId: 'action-read'
        }
      ],
      decisions: [
        {
          decisionId: 'dec-viewer-reports-read',
          outcome: 'allow',
          roleId: 'viewer',
          permissionId: 'perm-reports-read',
          resourceId: 'res-reports',
          actionId: 'action-read',
          policyId: 'policy-viewer-read'
        },
        {
          decisionId: 'dec-viewer-export-deny',
          outcome: 'deny',
          roleId: 'viewer',
          permissionId: 'perm-reports-export',
          resourceId: 'res-reports',
          actionId: 'action-export',
          reason: 'expired-session-context'
        }
      ],
      order: 5,
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-07-08T09:00:00.000Z'
    },
    {
      id: 'authz-susp-006',
      identityId: 'identity-suspended-006',
      authenticationId: 'auth-susp-006',
      sessionId: 'sess-susp-006',
      principalId: 'principal-susp-006',
      roles: [
        {
          id: 'tenant-member',
          name: 'Tenant Member',
          scope: 'tenant',
          permissionIds: []
        }
      ],
      permissions: [],
      policies: [
        {
          id: 'policy-suspended-deny-all',
          name: 'Suspended Deny All',
          roleIds: ['tenant-member'],
          effect: 'deny'
        }
      ],
      decisions: [
        {
          decisionId: 'dec-susp-deny-dashboard',
          outcome: 'deny',
          roleId: 'tenant-member',
          permissionId: 'perm-dashboard-read',
          resourceId: 'res-dashboard',
          actionId: 'action-read',
          policyId: 'policy-suspended-deny-all',
          reason: 'identity-suspended'
        }
      ],
      order: 6,
      createdAt: '2026-03-20T11:00:00.000Z',
      updatedAt: '2026-07-05T08:00:00.000Z'
    },
    {
      id: 'authz-owner-mobile-007',
      identityId: 'identity-platform-owner-001',
      authenticationId: 'auth-owner-001',
      sessionId: 'sess-owner-mobile-007',
      principalId: 'principal-owner-001',
      roles: [
        {
          id: 'platform-owner',
          name: 'Platform Owner',
          scope: 'platform',
          permissionIds: ['perm-platform-read']
        }
      ],
      permissions: [PLATFORM_READ],
      policies: [
        {
          id: 'policy-owner-mobile-allow',
          name: 'Owner Mobile Allow',
          roleIds: ['platform-owner'],
          effect: 'allow',
          resourceId: 'res-platform',
          actionId: 'action-read'
        }
      ],
      decisions: [
        {
          decisionId: 'dec-owner-mobile-platform',
          outcome: 'allow',
          roleId: 'platform-owner',
          permissionId: 'perm-platform-read',
          resourceId: 'res-platform',
          actionId: 'action-read',
          policyId: 'policy-owner-mobile-allow'
        }
      ],
      order: 7,
      createdAt: '2026-07-21T20:00:00.000Z',
      updatedAt: '2026-07-21T20:15:00.000Z'
    },
    {
      id: 'authz-anon-008',
      identityId: 'identity-platform-owner-001',
      authenticationId: 'auth-anon-007',
      sessionId: 'sess-anon-008',
      principalId: 'principal-anon-007',
      roles: [],
      permissions: [],
      policies: [
        {
          id: 'policy-anon-deny',
          name: 'Anonymous Deny',
          roleIds: [],
          effect: 'deny'
        }
      ],
      decisions: [
        {
          decisionId: 'dec-anon-deny',
          outcome: 'deny',
          roleId: 'viewer',
          permissionId: 'perm-platform-read',
          resourceId: 'res-platform',
          actionId: 'action-read',
          policyId: 'policy-anon-deny',
          reason: 'unauthenticated'
        }
      ],
      order: 8,
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T01:00:00.000Z'
    }
  ] as AuthorizationModule[]);

/** Yerleşik authorization sayısı */
export const BUILTIN_AUTHORIZATION_MODULE_COUNT =
  BUILTIN_AUTHORIZATION_MODULES.length;

/**
 * Yerleşik authorization tanımını id ile döndürür.
 */
export function getBuiltinAuthorizationModule(
  authorizationId: string
): AuthorizationModule | undefined {
  return BUILTIN_AUTHORIZATION_MODULES.find(
    (item) => item.id === authorizationId
  );
}
