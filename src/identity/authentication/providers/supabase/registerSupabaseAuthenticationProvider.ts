/**
 * İSTEBUL Identity — Supabase provider ↔ adapter entegrasyonu (EPIC-301B).
 *
 * AuthenticationAdapter interface değiştirilmez.
 * Provider registry üzerinden adapter'a bağlanır.
 */

import type { AuthenticationAdapter } from '../../adapters/AuthenticationAdapter';
import { createAuthenticationAdapter } from '../../adapters/AuthenticationAdapter';
import type { AuthenticationProviderRegistration } from '../../adapters/AuthenticationProvider';
import type { AuthenticationProviderRegistry } from '../../adapters/AuthenticationProviderRegistry';
import { createAuthenticationProviderRegistry } from '../../adapters/AuthenticationProviderRegistry';
import {
  SUPABASE_AUTHENTICATION_PROVIDER_DESCRIPTION,
  SUPABASE_AUTHENTICATION_PROVIDER_ID,
  SUPABASE_AUTHENTICATION_PROVIDER_NAME
} from './constants';
import type { SupabaseAuthenticationProvider } from './SupabaseAuthenticationProvider';

/**
 * Supabase provider metadata kaydı.
 */
export function createSupabaseAuthenticationProviderRegistration(
  order = 10
): AuthenticationProviderRegistration {
  return {
    id: SUPABASE_AUTHENTICATION_PROVIDER_ID,
    name: SUPABASE_AUTHENTICATION_PROVIDER_NAME,
    description: SUPABASE_AUTHENTICATION_PROVIDER_DESCRIPTION,
    method: 'password',
    providerRegistered: false,
    order
  };
}

/**
 * Registry'ye Supabase metadata + implementasyon kaydeder.
 */
export function registerSupabaseAuthenticationProvider(
  registry: AuthenticationProviderRegistry,
  provider: SupabaseAuthenticationProvider
): void {
  if (!registry.hasRegistration(provider.id)) {
    registry.registerRegistration(
      createSupabaseAuthenticationProviderRegistration()
    );
  }
  if (!registry.hasProvider(provider.id)) {
    registry.registerProvider(provider);
  }
}

/**
 * Supabase provider ile AuthenticationAdapter oluşturur.
 *
 * Adapter interface değiştirilmez; yalnızca registry seed edilir.
 */
export function createAuthenticationAdapterWithSupabaseProvider(
  provider: SupabaseAuthenticationProvider,
  options: { seedBuiltins?: boolean } = {}
): AuthenticationAdapter {
  const registry = createAuthenticationProviderRegistry(
    options.seedBuiltins ?? true
  );
  registerSupabaseAuthenticationProvider(registry, provider);
  return createAuthenticationAdapter(registry);
}

/**
 * Mevcut adapter registry'sine Supabase provider bağlar.
 */
export function attachSupabaseAuthenticationProvider(
  adapter: AuthenticationAdapter,
  provider: SupabaseAuthenticationProvider
): AuthenticationAdapter {
  registerSupabaseAuthenticationProvider(adapter.getRegistry(), provider);
  return adapter;
}
