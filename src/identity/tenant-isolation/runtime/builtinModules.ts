/**
 * İSTEBUL Identity — yerleşik tenant isolation tanımları (PR-203E).
 *
 * Projection-only örnek kayıtlar. Supabase RLS / DB / API yok.
 */

import type { TenantIsolationModule } from './TenantIsolationModule';

/**
 * Yerleşik Tenant Isolation Module iskeletleri.
 */
export const BUILTIN_TENANT_ISOLATION_MODULES: readonly TenantIsolationModule[] =
  Object.freeze([
    {
      id: 'iso-platform-001',
      tenantIdentity: {
        tenantId: 'tenant-platform',
        slug: 'istebul-platform',
        displayName: 'İSTEBUL Platform'
      },
      boundary: {
        boundaryId: 'bound-platform-001',
        tenantId: 'tenant-platform',
        label: 'Platform Boundary',
        strict: true
      },
      memberships: [
        {
          membershipId: 'mem-owner-001',
          identityId: 'identity-platform-owner-001',
          tenantId: 'tenant-platform',
          roleLabel: 'platform-owner',
          active: true
        },
        {
          membershipId: 'mem-padmin-002',
          identityId: 'identity-platform-admin-002',
          tenantId: 'tenant-platform',
          roleLabel: 'platform-admin',
          active: true
        }
      ],
      scopes: [
        {
          scopeId: 'scope-platform',
          level: 'platform'
        },
        {
          scopeId: 'scope-tenant-platform',
          level: 'tenant',
          tenantId: 'tenant-platform'
        }
      ],
      isolationRules: [
        {
          ruleId: 'rule-platform-same-allow',
          name: 'Same Tenant Allow',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-platform',
          effect: 'allow'
        },
        {
          ruleId: 'rule-platform-cross-deny',
          name: 'Cross Tenant Deny',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-demo-001',
          effect: 'deny'
        }
      ],
      accessScope: {
        accessScopeId: 'access-platform-001',
        allowedTenantIds: ['tenant-platform'],
        crossTenantAllowed: false
      },
      decisions: [
        {
          decisionId: 'dec-iso-owner-same',
          outcome: 'allow',
          identityId: 'identity-platform-owner-001',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-platform',
          ruleId: 'rule-platform-same-allow',
          reason: 'same-tenant'
        },
        {
          decisionId: 'dec-iso-owner-cross',
          outcome: 'deny',
          identityId: 'identity-platform-owner-001',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-demo-001',
          ruleId: 'rule-platform-cross-deny',
          reason: 'cross-tenant-blocked'
        }
      ],
      primaryIdentityId: 'identity-platform-owner-001',
      authorizationId: 'authz-owner-001',
      sessionId: 'sess-owner-001',
      order: 1,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-07-21T09:00:00.000Z'
    },
    {
      id: 'iso-demo-002',
      tenantIdentity: {
        tenantId: 'tenant-demo-001',
        slug: 'demo-istebul',
        displayName: 'Demo İSTEBUL'
      },
      boundary: {
        boundaryId: 'bound-demo-002',
        tenantId: 'tenant-demo-001',
        label: 'Demo Boundary',
        strict: true
      },
      memberships: [
        {
          membershipId: 'mem-badmin-003',
          identityId: 'identity-business-admin-003',
          tenantId: 'tenant-demo-001',
          roleLabel: 'business-admin',
          active: true
        },
        {
          membershipId: 'mem-member-004',
          identityId: 'identity-tenant-member-004',
          tenantId: 'tenant-demo-001',
          roleLabel: 'tenant-member',
          active: true
        }
      ],
      scopes: [
        {
          scopeId: 'scope-demo-tenant',
          level: 'tenant',
          tenantId: 'tenant-demo-001'
        },
        {
          scopeId: 'scope-demo-membership',
          level: 'membership',
          tenantId: 'tenant-demo-001'
        }
      ],
      isolationRules: [
        {
          ruleId: 'rule-demo-same-allow',
          name: 'Demo Same Tenant Allow',
          sourceTenantId: 'tenant-demo-001',
          targetTenantId: 'tenant-demo-001',
          effect: 'allow'
        },
        {
          ruleId: 'rule-demo-trial-restrict',
          name: 'Demo to Trial Restrict',
          sourceTenantId: 'tenant-demo-001',
          targetTenantId: 'tenant-trial-002',
          effect: 'restrict'
        }
      ],
      accessScope: {
        accessScopeId: 'access-demo-002',
        allowedTenantIds: ['tenant-demo-001'],
        crossTenantAllowed: false
      },
      decisions: [
        {
          decisionId: 'dec-iso-badmin-same',
          outcome: 'allow',
          identityId: 'identity-business-admin-003',
          sourceTenantId: 'tenant-demo-001',
          targetTenantId: 'tenant-demo-001',
          ruleId: 'rule-demo-same-allow'
        },
        {
          decisionId: 'dec-iso-badmin-trial',
          outcome: 'restrict',
          identityId: 'identity-business-admin-003',
          sourceTenantId: 'tenant-demo-001',
          targetTenantId: 'tenant-trial-002',
          ruleId: 'rule-demo-trial-restrict',
          reason: 'partner-read-only'
        },
        {
          decisionId: 'dec-iso-member-same',
          outcome: 'allow',
          identityId: 'identity-tenant-member-004',
          sourceTenantId: 'tenant-demo-001',
          targetTenantId: 'tenant-demo-001',
          ruleId: 'rule-demo-same-allow'
        }
      ],
      primaryIdentityId: 'identity-business-admin-003',
      authorizationId: 'authz-badmin-003',
      sessionId: 'sess-badmin-003',
      order: 2,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-07-21T11:30:00.000Z'
    },
    {
      id: 'iso-trial-003',
      tenantIdentity: {
        tenantId: 'tenant-trial-002',
        slug: 'trial-acme',
        displayName: 'Acme Trial'
      },
      boundary: {
        boundaryId: 'bound-trial-003',
        tenantId: 'tenant-trial-002',
        label: 'Trial Boundary',
        strict: true
      },
      memberships: [
        {
          membershipId: 'mem-viewer-005',
          identityId: 'identity-viewer-005',
          tenantId: 'tenant-trial-002',
          roleLabel: 'viewer',
          active: true
        }
      ],
      scopes: [
        {
          scopeId: 'scope-trial-tenant',
          level: 'tenant',
          tenantId: 'tenant-trial-002'
        },
        {
          scopeId: 'scope-trial-self',
          level: 'self',
          tenantId: 'tenant-trial-002'
        }
      ],
      isolationRules: [
        {
          ruleId: 'rule-trial-same-allow',
          name: 'Trial Same Allow',
          sourceTenantId: 'tenant-trial-002',
          targetTenantId: 'tenant-trial-002',
          effect: 'allow'
        },
        {
          ruleId: 'rule-trial-demo-deny',
          name: 'Trial to Demo Deny',
          sourceTenantId: 'tenant-trial-002',
          targetTenantId: 'tenant-demo-001',
          effect: 'deny'
        }
      ],
      accessScope: {
        accessScopeId: 'access-trial-003',
        allowedTenantIds: ['tenant-trial-002'],
        crossTenantAllowed: false
      },
      decisions: [
        {
          decisionId: 'dec-iso-viewer-same',
          outcome: 'allow',
          identityId: 'identity-viewer-005',
          sourceTenantId: 'tenant-trial-002',
          targetTenantId: 'tenant-trial-002',
          ruleId: 'rule-trial-same-allow'
        },
        {
          decisionId: 'dec-iso-viewer-demo',
          outcome: 'deny',
          identityId: 'identity-viewer-005',
          sourceTenantId: 'tenant-trial-002',
          targetTenantId: 'tenant-demo-001',
          ruleId: 'rule-trial-demo-deny',
          reason: 'cross-tenant-blocked'
        }
      ],
      primaryIdentityId: 'identity-viewer-005',
      authorizationId: 'authz-viewer-005',
      sessionId: 'sess-viewer-005',
      order: 3,
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-07-08T09:00:00.000Z'
    },
    {
      id: 'iso-susp-004',
      tenantIdentity: {
        tenantId: 'tenant-susp-005',
        slug: 'suspended-west',
        displayName: 'West Suspended'
      },
      boundary: {
        boundaryId: 'bound-susp-004',
        tenantId: 'tenant-susp-005',
        label: 'Suspended Boundary',
        strict: true
      },
      memberships: [
        {
          membershipId: 'mem-susp-006',
          identityId: 'identity-suspended-006',
          tenantId: 'tenant-susp-005',
          roleLabel: 'tenant-member',
          active: false
        }
      ],
      scopes: [
        {
          scopeId: 'scope-susp-tenant',
          level: 'tenant',
          tenantId: 'tenant-susp-005'
        }
      ],
      isolationRules: [
        {
          ruleId: 'rule-susp-deny-all',
          name: 'Suspended Deny All',
          sourceTenantId: 'tenant-susp-005',
          effect: 'deny'
        }
      ],
      accessScope: {
        accessScopeId: 'access-susp-004',
        allowedTenantIds: [],
        crossTenantAllowed: false
      },
      decisions: [
        {
          decisionId: 'dec-iso-susp-deny',
          outcome: 'deny',
          identityId: 'identity-suspended-006',
          sourceTenantId: 'tenant-susp-005',
          targetTenantId: 'tenant-susp-005',
          ruleId: 'rule-susp-deny-all',
          reason: 'membership-inactive'
        }
      ],
      primaryIdentityId: 'identity-suspended-006',
      authorizationId: 'authz-susp-006',
      sessionId: 'sess-susp-006',
      order: 4,
      createdAt: '2026-03-20T11:00:00.000Z',
      updatedAt: '2026-07-05T08:00:00.000Z'
    },
    {
      id: 'iso-demo-member-005',
      tenantIdentity: {
        tenantId: 'tenant-demo-001',
        slug: 'demo-istebul',
        displayName: 'Demo İSTEBUL'
      },
      boundary: {
        boundaryId: 'bound-demo-member-005',
        tenantId: 'tenant-demo-001',
        label: 'Demo Member Boundary',
        strict: true
      },
      memberships: [
        {
          membershipId: 'mem-member-only-004',
          identityId: 'identity-tenant-member-004',
          tenantId: 'tenant-demo-001',
          roleLabel: 'tenant-member',
          active: true
        }
      ],
      scopes: [
        {
          scopeId: 'scope-member-self',
          level: 'self',
          tenantId: 'tenant-demo-001'
        }
      ],
      isolationRules: [
        {
          ruleId: 'rule-member-same-allow',
          name: 'Member Same Allow',
          sourceTenantId: 'tenant-demo-001',
          targetTenantId: 'tenant-demo-001',
          effect: 'allow'
        },
        {
          ruleId: 'rule-member-platform-deny',
          name: 'Member Platform Deny',
          sourceTenantId: 'tenant-demo-001',
          targetTenantId: 'tenant-platform',
          effect: 'deny'
        }
      ],
      accessScope: {
        accessScopeId: 'access-demo-member-005',
        allowedTenantIds: ['tenant-demo-001'],
        crossTenantAllowed: false
      },
      decisions: [
        {
          decisionId: 'dec-iso-member-self',
          outcome: 'allow',
          identityId: 'identity-tenant-member-004',
          sourceTenantId: 'tenant-demo-001',
          targetTenantId: 'tenant-demo-001',
          ruleId: 'rule-member-same-allow'
        },
        {
          decisionId: 'dec-iso-member-platform',
          outcome: 'deny',
          identityId: 'identity-tenant-member-004',
          sourceTenantId: 'tenant-demo-001',
          targetTenantId: 'tenant-platform',
          ruleId: 'rule-member-platform-deny',
          reason: 'cross-tenant-blocked'
        }
      ],
      primaryIdentityId: 'identity-tenant-member-004',
      authorizationId: 'authz-member-004',
      sessionId: 'sess-member-004',
      order: 5,
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-07-18T10:00:00.000Z'
    },
    {
      id: 'iso-padmin-006',
      tenantIdentity: {
        tenantId: 'tenant-platform',
        slug: 'istebul-platform',
        displayName: 'İSTEBUL Platform'
      },
      boundary: {
        boundaryId: 'bound-padmin-006',
        tenantId: 'tenant-platform',
        label: 'Platform Admin Boundary',
        strict: false
      },
      memberships: [
        {
          membershipId: 'mem-padmin-only-002',
          identityId: 'identity-platform-admin-002',
          tenantId: 'tenant-platform',
          roleLabel: 'platform-admin',
          active: true
        }
      ],
      scopes: [
        {
          scopeId: 'scope-padmin-platform',
          level: 'platform'
        },
        {
          scopeId: 'scope-padmin-tenant',
          level: 'tenant',
          tenantId: 'tenant-platform'
        }
      ],
      isolationRules: [
        {
          ruleId: 'rule-padmin-same-allow',
          name: 'PAdmin Same Allow',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-platform',
          effect: 'allow'
        },
        {
          ruleId: 'rule-padmin-demo-restrict',
          name: 'PAdmin Demo Restrict',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-demo-001',
          effect: 'restrict'
        }
      ],
      accessScope: {
        accessScopeId: 'access-padmin-006',
        allowedTenantIds: ['tenant-platform', 'tenant-demo-001'],
        crossTenantAllowed: true
      },
      decisions: [
        {
          decisionId: 'dec-iso-padmin-same',
          outcome: 'allow',
          identityId: 'identity-platform-admin-002',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-platform',
          ruleId: 'rule-padmin-same-allow'
        },
        {
          decisionId: 'dec-iso-padmin-demo',
          outcome: 'restrict',
          identityId: 'identity-platform-admin-002',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-demo-001',
          ruleId: 'rule-padmin-demo-restrict',
          reason: 'support-read-only'
        }
      ],
      primaryIdentityId: 'identity-platform-admin-002',
      authorizationId: 'authz-padmin-002',
      sessionId: 'sess-padmin-002',
      order: 6,
      createdAt: '2026-02-01T09:00:00.000Z',
      updatedAt: '2026-07-20T14:00:00.000Z'
    },
    {
      id: 'iso-owner-mobile-007',
      tenantIdentity: {
        tenantId: 'tenant-platform',
        slug: 'istebul-platform',
        displayName: 'İSTEBUL Platform'
      },
      boundary: {
        boundaryId: 'bound-owner-mobile-007',
        tenantId: 'tenant-platform',
        label: 'Owner Mobile Boundary',
        strict: true
      },
      memberships: [
        {
          membershipId: 'mem-owner-mobile-001',
          identityId: 'identity-platform-owner-001',
          tenantId: 'tenant-platform',
          roleLabel: 'platform-owner',
          active: true
        }
      ],
      scopes: [
        {
          scopeId: 'scope-owner-mobile-platform',
          level: 'platform'
        }
      ],
      isolationRules: [
        {
          ruleId: 'rule-owner-mobile-allow',
          name: 'Owner Mobile Allow',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-platform',
          effect: 'allow'
        }
      ],
      accessScope: {
        accessScopeId: 'access-owner-mobile-007',
        allowedTenantIds: ['tenant-platform'],
        crossTenantAllowed: false
      },
      decisions: [
        {
          decisionId: 'dec-iso-owner-mobile',
          outcome: 'allow',
          identityId: 'identity-platform-owner-001',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-platform',
          ruleId: 'rule-owner-mobile-allow'
        }
      ],
      primaryIdentityId: 'identity-platform-owner-001',
      authorizationId: 'authz-owner-mobile-007',
      sessionId: 'sess-owner-mobile-007',
      order: 7,
      createdAt: '2026-07-21T20:00:00.000Z',
      updatedAt: '2026-07-21T20:15:00.000Z'
    },
    {
      id: 'iso-anon-008',
      tenantIdentity: {
        tenantId: 'tenant-platform',
        slug: 'istebul-platform',
        displayName: 'İSTEBUL Platform'
      },
      boundary: {
        boundaryId: 'bound-anon-008',
        tenantId: 'tenant-platform',
        label: 'Anonymous Boundary',
        strict: true
      },
      memberships: [],
      scopes: [
        {
          scopeId: 'scope-anon-self',
          level: 'self'
        }
      ],
      isolationRules: [
        {
          ruleId: 'rule-anon-deny',
          name: 'Anonymous Deny',
          sourceTenantId: 'tenant-platform',
          effect: 'deny'
        }
      ],
      accessScope: {
        accessScopeId: 'access-anon-008',
        allowedTenantIds: [],
        crossTenantAllowed: false
      },
      decisions: [
        {
          decisionId: 'dec-iso-anon-deny',
          outcome: 'deny',
          identityId: 'identity-platform-owner-001',
          sourceTenantId: 'tenant-platform',
          targetTenantId: 'tenant-platform',
          ruleId: 'rule-anon-deny',
          reason: 'unauthenticated'
        }
      ],
      primaryIdentityId: 'identity-platform-owner-001',
      authorizationId: 'authz-anon-008',
      sessionId: 'sess-anon-008',
      order: 8,
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T01:00:00.000Z'
    },
    {
      id: 'iso-enterprise-009',
      tenantIdentity: {
        tenantId: 'tenant-ent-004',
        slug: 'enterprise-north',
        displayName: 'North Enterprise'
      },
      boundary: {
        boundaryId: 'bound-ent-009',
        tenantId: 'tenant-ent-004',
        label: 'Enterprise Boundary',
        strict: true
      },
      memberships: [
        {
          membershipId: 'mem-ent-placeholder',
          identityId: 'identity-platform-admin-002',
          tenantId: 'tenant-ent-004',
          roleLabel: 'support',
          active: true
        }
      ],
      scopes: [
        {
          scopeId: 'scope-ent-tenant',
          level: 'tenant',
          tenantId: 'tenant-ent-004'
        }
      ],
      isolationRules: [
        {
          ruleId: 'rule-ent-same-allow',
          name: 'Enterprise Same Allow',
          sourceTenantId: 'tenant-ent-004',
          targetTenantId: 'tenant-ent-004',
          effect: 'allow'
        },
        {
          ruleId: 'rule-ent-demo-deny',
          name: 'Enterprise Demo Deny',
          sourceTenantId: 'tenant-ent-004',
          targetTenantId: 'tenant-demo-001',
          effect: 'deny'
        }
      ],
      accessScope: {
        accessScopeId: 'access-ent-009',
        allowedTenantIds: ['tenant-ent-004'],
        crossTenantAllowed: false
      },
      decisions: [
        {
          decisionId: 'dec-iso-ent-same',
          outcome: 'allow',
          identityId: 'identity-platform-admin-002',
          sourceTenantId: 'tenant-ent-004',
          targetTenantId: 'tenant-ent-004',
          ruleId: 'rule-ent-same-allow'
        },
        {
          decisionId: 'dec-iso-ent-demo',
          outcome: 'deny',
          identityId: 'identity-platform-admin-002',
          sourceTenantId: 'tenant-ent-004',
          targetTenantId: 'tenant-demo-001',
          ruleId: 'rule-ent-demo-deny',
          reason: 'cross-tenant-blocked'
        }
      ],
      primaryIdentityId: 'identity-platform-admin-002',
      authorizationId: 'authz-padmin-002',
      sessionId: 'sess-padmin-002',
      order: 9,
      createdAt: '2025-11-01T00:00:00.000Z',
      updatedAt: '2026-07-18T16:45:00.000Z'
    }
  ] as TenantIsolationModule[]);

/** Yerleşik isolation sayısı */
export const BUILTIN_TENANT_ISOLATION_MODULE_COUNT =
  BUILTIN_TENANT_ISOLATION_MODULES.length;

/**
 * Yerleşik isolation tanımını id ile döndürür.
 */
export function getBuiltinTenantIsolationModule(
  isolationId: string
): TenantIsolationModule | undefined {
  return BUILTIN_TENANT_ISOLATION_MODULES.find((item) => item.id === isolationId);
}
