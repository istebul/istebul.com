import type { ProviderCapabilities } from '../models/provider-capabilities';
import type { BusinessProviderKind } from '../../types/business-provider';

/** Built-in capability declarations for known provider kinds. */
export const PROVIDER_CAPABILITIES: Readonly<
  Record<BusinessProviderKind, ProviderCapabilities>
> = Object.freeze({
  mock: Object.freeze({
    kind: 'mock' as const,
    live: false,
    supportsRealtime: false,
    supportsHistorical: true,
    requiresAuth: false,
    requiresNetwork: false,
    label: 'Mock Business Provider',
    description: 'Frozen local mock snapshot for the Intelligence pipeline.'
  }),
  supabase: Object.freeze({
    kind: 'supabase' as const,
    live: true,
    supportsRealtime: true,
    supportsHistorical: true,
    requiresAuth: true,
    requiresNetwork: true,
    label: 'Supabase Provider',
    description: 'Future Supabase-backed live data adapter (not connected).'
  }),
  erp: Object.freeze({
    kind: 'erp' as const,
    live: true,
    supportsRealtime: false,
    supportsHistorical: true,
    requiresAuth: true,
    requiresNetwork: true,
    label: 'ERP Provider',
    description: 'Future ERP integration adapter (not connected).'
  }),
  'garson-ai': Object.freeze({
    kind: 'garson-ai' as const,
    live: true,
    supportsRealtime: true,
    supportsHistorical: false,
    requiresAuth: true,
    requiresNetwork: true,
    label: 'Garson AI Provider',
    description: 'Future Garson AI operational data adapter (not connected).'
  })
});

export function getProviderCapabilities(
  kind: BusinessProviderKind
): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[kind];
}

export function listProviderCapabilities(): readonly ProviderCapabilities[] {
  return Object.freeze(Object.values(PROVIDER_CAPABILITIES));
}

export default getProviderCapabilities;
