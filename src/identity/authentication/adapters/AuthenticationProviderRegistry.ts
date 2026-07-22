/**
 * İSTEBUL Identity — AuthenticationProviderRegistry (EPIC-301A).
 */

import type {
  AuthenticationProvider,
  AuthenticationProviderRegistration
} from './AuthenticationProvider';
import type { AuthenticationMethod } from '../runtime/AuthenticationModule';
import { BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS } from './builtinProviders';

/**
 * Authentication provider kayıt sistemi.
 *
 * Metadata kayıtları ve opsiyonel provider implementasyonları.
 * Yeni global state yoktur — instance bazlı Map.
 */
export class AuthenticationProviderRegistry {
  private readonly registrations = new Map<
    string,
    AuthenticationProviderRegistration
  >();
  private readonly providers = new Map<string, AuthenticationProvider>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS) {
        this.registrations.set(definition.id, definition);
      }
    }
  }

  registerRegistration(
    registration: AuthenticationProviderRegistration
  ): void {
    if (!registration?.id || typeof registration.id !== 'string') {
      throw new Error('AuthenticationProviderRegistration.id zorunludur.');
    }
    if (this.registrations.has(registration.id)) {
      throw new Error(`Provider kaydı zaten mevcut: ${registration.id}`);
    }
    if (!registration.name || typeof registration.name !== 'string') {
      throw new Error(
        `AuthenticationProviderRegistration.name zorunludur: ${registration.id}`
      );
    }
    if (!registration.method) {
      throw new Error(
        `AuthenticationProviderRegistration.method zorunludur: ${registration.id}`
      );
    }
    this.registrations.set(registration.id, registration);
  }

  registerProvider(provider: AuthenticationProvider): void {
    if (!provider?.id || typeof provider.id !== 'string') {
      throw new Error('AuthenticationProvider.id zorunludur.');
    }
    if (!this.registrations.has(provider.id)) {
      throw new Error(
        `Provider metadata kaydı bulunamadı: ${provider.id}`
      );
    }
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider implementasyonu zaten kayıtlı: ${provider.id}`);
    }
    const registration = this.registrations.get(provider.id)!;
    if (registration.method !== provider.method) {
      throw new Error(
        `Provider method uyuşmazlığı: ${provider.id} (${provider.method} !== ${registration.method})`
      );
    }
    this.providers.set(provider.id, provider);
    this.registrations.set(provider.id, {
      ...registration,
      providerRegistered: true
    });
  }

  unregisterProvider(providerId: string): boolean {
    const registration = this.registrations.get(providerId);
    if (!registration) {
      return false;
    }
    const removed = this.providers.delete(providerId);
    if (removed) {
      this.registrations.set(providerId, {
        ...registration,
        providerRegistered: false
      });
    }
    return removed;
  }

  unregisterRegistration(providerId: string): boolean {
    if (this.providers.has(providerId)) {
      throw new Error(
        `Kayıtlı implementasyon varken metadata silinemez: ${providerId}`
      );
    }
    return this.registrations.delete(providerId);
  }

  getRegistrationById(
    providerId: string
  ): AuthenticationProviderRegistration | undefined {
    return this.registrations.get(providerId);
  }

  getProviderById(providerId: string): AuthenticationProvider | undefined {
    return this.providers.get(providerId);
  }

  getAllRegistrations(): readonly AuthenticationProviderRegistration[] {
    return Object.freeze(
      [...this.registrations.values()].sort((a, b) => a.order - b.order)
    );
  }

  getRegisteredProviders(): readonly AuthenticationProvider[] {
    return Object.freeze(
      [...this.providers.values()].sort((a, b) => {
        const regA = this.registrations.get(a.id);
        const regB = this.registrations.get(b.id);
        return (regA?.order ?? 0) - (regB?.order ?? 0);
      })
    );
  }

  getByMethod(
    method: AuthenticationMethod
  ): readonly AuthenticationProviderRegistration[] {
    return Object.freeze(
      this.getAllRegistrations().filter((entry) => entry.method === method)
    );
  }

  hasRegistration(providerId: string): boolean {
    return this.registrations.has(providerId);
  }

  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  isMethodSupported(
    providerId: string,
    method: AuthenticationMethod
  ): boolean {
    const registration = this.registrations.get(providerId);
    return registration?.method === method;
  }

  registeredProviderCount(): number {
    return this.providers.size;
  }

  registrationCount(): number {
    return this.registrations.size;
  }

  clear(): void {
    this.registrations.clear();
    this.providers.clear();
  }
}

export function createAuthenticationProviderRegistry(
  seedBuiltins = true
): AuthenticationProviderRegistry {
  return new AuthenticationProviderRegistry(seedBuiltins);
}

/** Alias — ProviderRegistryRuntime adlandırma uyumu */
export {
  AuthenticationProviderRegistry as AuthenticationProviderRegistryRuntime
};
export const createAuthenticationProviderRegistryRuntime =
  createAuthenticationProviderRegistry;

export default AuthenticationProviderRegistry;
