/**
 * İSTEBUL Platform Admin — yerleşik subscription tanımları (PR-201D).
 *
 * Projection-only örnek kayıtlar. Payment / Billing / DB yok.
 */

import type { SubscriptionDefinition } from './Subscription';

/**
 * Yerleşik subscription iskeletleri.
 */
export const BUILTIN_SUBSCRIPTION_DEFINITIONS: readonly SubscriptionDefinition[] =
  Object.freeze([
    {
      identity: { id: 'sub-demo-001', label: 'Demo Pro Monthly' },
      tenantReference: {
        tenantId: 'tenant-demo-001',
        tenantSlug: 'demo-istebul'
      },
      plan: 'pro',
      status: 'active',
      billingCycle: 'monthly',
      usageLimits: {
        maxUsers: 50,
        maxAiRequestsPerMonth: 10000,
        maxStorageMb: 5120
      },
      renewalDate: '2026-08-01T00:00:00.000Z',
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-07-01T12:00:00.000Z'
    },
    {
      identity: { id: 'sub-trial-002', label: 'Acme Starter Trial' },
      tenantReference: {
        tenantId: 'tenant-trial-002',
        tenantSlug: 'trial-acme'
      },
      plan: 'starter',
      status: 'trialing',
      billingCycle: 'monthly',
      usageLimits: {
        maxUsers: 10,
        maxAiRequestsPerMonth: 1000,
        maxStorageMb: 1024
      },
      renewalDate: '2026-07-28T00:00:00.000Z',
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-15T09:30:00.000Z'
    },
    {
      identity: { id: 'sub-free-003', label: 'Startup Free' },
      tenantReference: {
        tenantId: 'tenant-free-003',
        tenantSlug: 'free-startup'
      },
      plan: 'free',
      status: 'active',
      billingCycle: 'none',
      usageLimits: {
        maxUsers: 3,
        maxAiRequestsPerMonth: 100,
        maxStorageMb: 256
      },
      renewalDate: '2099-01-01T00:00:00.000Z',
      createdAt: '2026-07-10T14:00:00.000Z',
      updatedAt: '2026-07-10T14:00:00.000Z'
    },
    {
      identity: { id: 'sub-ent-004', label: 'North Enterprise Yearly' },
      tenantReference: {
        tenantId: 'tenant-ent-004',
        tenantSlug: 'enterprise-north'
      },
      plan: 'enterprise',
      status: 'active',
      billingCycle: 'yearly',
      usageLimits: {
        maxUsers: 500,
        maxAiRequestsPerMonth: 100000,
        maxStorageMb: 51200
      },
      renewalDate: '2026-11-01T00:00:00.000Z',
      createdAt: '2025-11-01T00:00:00.000Z',
      updatedAt: '2026-07-18T16:45:00.000Z'
    },
    {
      identity: { id: 'sub-susp-005', label: 'West Past Due' },
      tenantReference: {
        tenantId: 'tenant-susp-005',
        tenantSlug: 'suspended-west'
      },
      plan: 'starter',
      status: 'past_due',
      billingCycle: 'monthly',
      usageLimits: {
        maxUsers: 10,
        maxAiRequestsPerMonth: 1000,
        maxStorageMb: 1024
      },
      renewalDate: '2026-07-05T00:00:00.000Z',
      createdAt: '2026-03-20T11:00:00.000Z',
      updatedAt: '2026-07-05T08:00:00.000Z'
    },
    {
      identity: { id: 'sub-cancel-006', label: 'Legacy Cancelled' },
      tenantReference: {
        tenantId: 'tenant-demo-001',
        tenantSlug: 'demo-istebul'
      },
      plan: 'starter',
      status: 'cancelled',
      billingCycle: 'monthly',
      usageLimits: {
        maxUsers: 10,
        maxAiRequestsPerMonth: 1000,
        maxStorageMb: 1024
      },
      renewalDate: '2026-02-01T00:00:00.000Z',
      createdAt: '2025-08-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z'
    }
  ]);

/** Yerleşik subscription sayısı */
export const BUILTIN_SUBSCRIPTION_DEFINITION_COUNT =
  BUILTIN_SUBSCRIPTION_DEFINITIONS.length;

/**
 * Yerleşik subscription tanımını id ile döndürür.
 */
export function getBuiltinSubscriptionDefinition(
  subscriptionId: string
): SubscriptionDefinition | undefined {
  return BUILTIN_SUBSCRIPTION_DEFINITIONS.find(
    (item) => item.identity.id === subscriptionId
  );
}
