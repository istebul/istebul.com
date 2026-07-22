/**
 * İSTEBUL Identity — Supabase tenant provider ↔ adapter entegrasyonu (EPIC-302B).
 *
 * TenantAdapter interface değiştirilmez.
 * Provider registry üzerinden adapter'a bağlanır.
 */

import type { TenantAdapter } from '../../adapters/TenantAdapter';
import { createTenantAdapter } from '../../adapters/TenantAdapter';
import type { TenantProviderRegistration } from '../../adapters/TenantProvider';
import type { TenantProviderRegistry } from '../../adapters/TenantProviderRegistry';
import { createTenantProviderRegistry } from '../../adapters/TenantProviderRegistry';
import {
  SUPABASE_TENANT_PROVIDER_DESCRIPTION,
  SUPABASE_TENANT_PROVIDER_ID,
  SUPABASE_TENANT_PROVIDER_NAME
} from './constants';
import type { SupabaseTenantProvider } from './SupabaseTenantProvider';

/**
 * Supabase tenant provider metadata kaydı.
 */
export function createSupabaseTenantProviderRegistration(
  order = 10
): TenantProviderRegistration {
  return {
    id: SUPABASE_TENANT_PROVIDER_ID,
    name: SUPABASE_TENANT_PROVIDER_NAME,
    description: SUPABASE_TENANT_PROVIDER_DESCRIPTION,
    kind: 'registry',
    providerRegistered: false,
    order
  };
}

/**
 * Registry'ye Supabase metadata + implementasyon kaydeder.
 */
export function registerSupabaseTenantProvider(
  registry: TenantProviderRegistry,
  provider: SupabaseTenantProvider
): void {
  if (!registry.hasRegistration(provider.id)) {
    registry.registerRegistration(
      createSupabaseTenantProviderRegistration()
    );
  }
  if (!registry.hasProvider(provider.id)) {
    registry.registerProvider(provider);
  }
}

/**
 * Supabase provider ile TenantAdapter oluşturur.
 *
 * Adapter interface değiştirilmez; yalnızca registry seed edilir.
 */
export function createTenantAdapterWithSupabaseProvider(
  provider: SupabaseTenantProvider,
  options: { seedBuiltins?: boolean } = {}
): TenantAdapter {
  const registry = createTenantProviderRegistry(options.seedBuiltins ?? true);
  registerSupabaseTenantProvider(registry, provider);
  return createTenantAdapter(registry);
}

/**
 * Mevcut adapter registry'sine Supabase provider bağlar.
 */
export function attachSupabaseTenantProvider(
  adapter: TenantAdapter,
  provider: SupabaseTenantProvider
): TenantAdapter {
  registerSupabaseTenantProvider(adapter.getRegistry(), provider);
  return adapter;
}
