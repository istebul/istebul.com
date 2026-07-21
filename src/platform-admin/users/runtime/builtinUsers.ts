/**
 * İSTEBUL Platform Admin — yerleşik user tanımları (PR-201C).
 *
 * Projection-only örnek kayıtlar. Gerçek DB/API/Auth yok.
 */

import type { UserDefinition } from './User';

/**
 * Yerleşik user iskeletleri.
 */
export const BUILTIN_USER_DEFINITIONS: readonly UserDefinition[] = Object.freeze(
  [
    {
      identity: { id: 'user-owner-001', username: 'platform.owner' },
      displayName: 'Platform Owner',
      email: 'owner@istebul.example',
      role: 'platform-owner',
      tenantReference: {
        tenantId: 'tenant-demo-001',
        tenantSlug: 'demo-istebul'
      },
      status: 'active',
      createdAt: '2025-12-01T10:00:00.000Z',
      updatedAt: '2026-07-01T12:00:00.000Z'
    },
    {
      identity: { id: 'user-admin-002', username: 'platform.admin' },
      displayName: 'Platform Admin',
      email: 'admin@istebul.example',
      role: 'platform-admin',
      tenantReference: {
        tenantId: 'tenant-demo-001',
        tenantSlug: 'demo-istebul'
      },
      status: 'active',
      createdAt: '2026-01-10T09:00:00.000Z',
      updatedAt: '2026-06-20T11:00:00.000Z'
    },
    {
      identity: { id: 'user-tenant-admin-003', username: 'acme.admin' },
      displayName: 'Acme Admin',
      email: 'admin@acme.example',
      role: 'tenant-admin',
      tenantReference: {
        tenantId: 'tenant-trial-002',
        tenantSlug: 'trial-acme'
      },
      status: 'active',
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-15T09:30:00.000Z'
    },
    {
      identity: { id: 'user-member-004', username: 'acme.member' },
      displayName: 'Acme Member',
      email: 'member@acme.example',
      role: 'tenant-member',
      tenantReference: {
        tenantId: 'tenant-trial-002',
        tenantSlug: 'trial-acme'
      },
      status: 'invited',
      createdAt: '2026-06-10T14:00:00.000Z',
      updatedAt: '2026-06-10T14:00:00.000Z'
    },
    {
      identity: { id: 'user-support-005', username: 'support.agent' },
      displayName: 'Support Agent',
      email: 'support@istebul.example',
      role: 'support',
      tenantReference: {
        tenantId: 'tenant-ent-004',
        tenantSlug: 'enterprise-north'
      },
      status: 'active',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-07-18T16:45:00.000Z'
    },
    {
      identity: { id: 'user-viewer-006', username: 'west.viewer' },
      displayName: 'West Viewer',
      email: 'viewer@west.example',
      role: 'viewer',
      tenantReference: {
        tenantId: 'tenant-susp-005',
        tenantSlug: 'suspended-west'
      },
      status: 'suspended',
      createdAt: '2026-03-20T11:00:00.000Z',
      updatedAt: '2026-07-05T08:00:00.000Z'
    }
  ]
);

/** Yerleşik user sayısı */
export const BUILTIN_USER_DEFINITION_COUNT = BUILTIN_USER_DEFINITIONS.length;

/**
 * Yerleşik user tanımını id ile döndürür.
 */
export function getBuiltinUserDefinition(
  userId: string
): UserDefinition | undefined {
  return BUILTIN_USER_DEFINITIONS.find((item) => item.identity.id === userId);
}
