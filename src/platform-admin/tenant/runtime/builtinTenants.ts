/**
 * İSTEBUL Platform Admin — yerleşik tenant tanımları (PR-201B).
 *
 * Projection-only örnek kayıtlar. Gerçek DB/API yok.
 */

import type { TenantDefinition } from './Tenant';

/**
 * Yerleşik tenant iskeletleri.
 */
export const BUILTIN_TENANT_DEFINITIONS: readonly TenantDefinition[] =
  Object.freeze([
    {
      identity: {
        id: 'tenant-demo-001',
        slug: 'demo-istebul',
        displayName: 'Demo İSTEBUL'
      },
      organization: {
        name: 'Demo Organizasyon A.Ş.',
        countryCode: 'TR',
        industry: 'technology'
      },
      subscriptionStatus: 'active',
      plan: 'pro',
      status: 'active',
      limits: {
        maxUsers: 50,
        maxAiRequestsPerMonth: 10000,
        maxStorageMb: 5120
      },
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-07-01T12:00:00.000Z'
    },
    {
      identity: {
        id: 'tenant-trial-002',
        slug: 'trial-acme',
        displayName: 'Acme Trial'
      },
      organization: {
        name: 'Acme Deneme Ltd.',
        countryCode: 'TR',
        industry: 'retail'
      },
      subscriptionStatus: 'trial',
      plan: 'starter',
      status: 'active',
      limits: {
        maxUsers: 10,
        maxAiRequestsPerMonth: 1000,
        maxStorageMb: 1024
      },
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-15T09:30:00.000Z'
    },
    {
      identity: {
        id: 'tenant-free-003',
        slug: 'free-startup',
        displayName: 'Startup Free'
      },
      organization: {
        name: 'Startup Free',
        countryCode: 'TR'
      },
      subscriptionStatus: 'none',
      plan: 'free',
      status: 'pending',
      limits: {
        maxUsers: 3,
        maxAiRequestsPerMonth: 100,
        maxStorageMb: 256
      },
      createdAt: '2026-07-10T14:00:00.000Z',
      updatedAt: '2026-07-10T14:00:00.000Z'
    },
    {
      identity: {
        id: 'tenant-ent-004',
        slug: 'enterprise-north',
        displayName: 'North Enterprise'
      },
      organization: {
        name: 'North Holding',
        countryCode: 'TR',
        industry: 'finance'
      },
      subscriptionStatus: 'active',
      plan: 'enterprise',
      status: 'active',
      limits: {
        maxUsers: 500,
        maxAiRequestsPerMonth: 100000,
        maxStorageMb: 51200
      },
      createdAt: '2025-11-01T00:00:00.000Z',
      updatedAt: '2026-07-18T16:45:00.000Z'
    },
    {
      identity: {
        id: 'tenant-susp-005',
        slug: 'suspended-west',
        displayName: 'West Suspended'
      },
      organization: {
        name: 'West Ops',
        countryCode: 'TR',
        industry: 'services'
      },
      subscriptionStatus: 'past_due',
      plan: 'starter',
      status: 'suspended',
      limits: {
        maxUsers: 10,
        maxAiRequestsPerMonth: 1000,
        maxStorageMb: 1024
      },
      createdAt: '2026-03-20T11:00:00.000Z',
      updatedAt: '2026-07-05T08:00:00.000Z'
    }
  ]);

/** Yerleşik tenant sayısı */
export const BUILTIN_TENANT_DEFINITION_COUNT =
  BUILTIN_TENANT_DEFINITIONS.length;

/**
 * Yerleşik tenant tanımını id ile döndürür.
 */
export function getBuiltinTenantDefinition(
  tenantId: string
): TenantDefinition | undefined {
  return BUILTIN_TENANT_DEFINITIONS.find(
    (item) => item.identity.id === tenantId
  );
}
