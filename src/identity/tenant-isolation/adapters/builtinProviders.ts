/**
 * İSTEBUL Identity — builtin tenant provider metadata (EPIC-302A).
 *
 * Yalnızca metadata kayıtları; provider implementasyonu yoktur.
 */

import type { TenantProviderRegistration } from './TenantProvider';

const BUILTIN_PROVIDER_DEFINITIONS: TenantProviderRegistration[] = [
  {
    id: 'provider-tenant-registry-001',
    name: 'Registry',
    description: 'Yerel registry tabanlı tenant çözümleme provider slotu.',
    kind: 'registry',
    providerRegistered: false,
    order: 1
  },
  {
    id: 'provider-tenant-membership-002',
    name: 'Membership',
    description: 'Üyelik tabanlı tenant çözümleme provider slotu.',
    kind: 'membership',
    providerRegistered: false,
    order: 2
  },
  {
    id: 'provider-tenant-slug-003',
    name: 'Slug',
    description: 'Slug tabanlı tenant çözümleme provider slotu.',
    kind: 'slug',
    providerRegistered: false,
    order: 3
  },
  {
    id: 'provider-tenant-domain-004',
    name: 'Domain',
    description: 'Domain tabanlı tenant çözümleme provider slotu.',
    kind: 'domain',
    providerRegistered: false,
    order: 4
  },
  {
    id: 'provider-tenant-header-005',
    name: 'Header',
    description: 'Header tabanlı tenant çözümleme provider slotu.',
    kind: 'header',
    providerRegistered: false,
    order: 5
  },
  {
    id: 'provider-tenant-claim-006',
    name: 'Claim',
    description: 'Claim tabanlı tenant çözümleme provider slotu.',
    kind: 'claim',
    providerRegistered: false,
    order: 6
  }
];

export const BUILTIN_TENANT_PROVIDER_REGISTRATIONS: readonly TenantProviderRegistration[] =
  Object.freeze(BUILTIN_PROVIDER_DEFINITIONS);

export const BUILTIN_TENANT_PROVIDER_COUNT =
  BUILTIN_TENANT_PROVIDER_REGISTRATIONS.length;

export function getBuiltinTenantProviderRegistration(
  providerId: string
): TenantProviderRegistration | undefined {
  return BUILTIN_TENANT_PROVIDER_REGISTRATIONS.find(
    (entry) => entry.id === providerId
  );
}
