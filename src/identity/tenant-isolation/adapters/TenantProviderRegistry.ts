/**
 * İSTEBUL Identity — TenantProviderRegistry (EPIC-302A).
 */

import type {
  TenantProvider,
  TenantProviderKind,
  TenantProviderRegistration
} from './TenantProvider';
import { BUILTIN_TENANT_PROVIDER_REGISTRATIONS } from './builtinProviders';

const SUPPORTED_TENANT_PROVIDER_KINDS = new Set<TenantProviderKind>([
  'registry',
  'membership',
  'slug',
  'domain',
  'header',
  'claim'
]);

const freezeRegistration = (
  registration: TenantProviderRegistration
): TenantProviderRegistration => Object.freeze({ ...registration });

/**
 * Tenant provider kayıt sistemi.
 *
 * Metadata kayıtları ve opsiyonel provider implementasyonları.
 * Yeni global state yoktur — instance bazlı Map.
 */
export class TenantProviderRegistry {
  private readonly registrations = new Map<
    string,
    TenantProviderRegistration
  >();
  private readonly providers = new Map<string, TenantProvider>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_TENANT_PROVIDER_REGISTRATIONS) {
        this.registerRegistration(definition);
      }
    }
  }

  registerRegistration(registration: TenantProviderRegistration): void {
    if (
      !registration?.id ||
      typeof registration.id !== 'string' ||
      !registration.id.trim()
    ) {
      throw new Error('TenantProviderRegistration.id zorunludur.');
    }
    if (this.registrations.has(registration.id)) {
      throw new Error(`Provider kaydı zaten mevcut: ${registration.id}`);
    }
    if (
      typeof registration.name !== 'string' ||
      !registration.name.trim()
    ) {
      throw new Error(
        `TenantProviderRegistration.name zorunludur: ${registration.id}`
      );
    }
    if (
      typeof registration.description !== 'string' ||
      !registration.description.trim()
    ) {
      throw new Error(
        `TenantProviderRegistration.description zorunludur: ${registration.id}`
      );
    }
    if (
      !registration.kind ||
      typeof registration.kind !== 'string'
    ) {
      throw new Error(
        `TenantProviderRegistration.kind zorunludur: ${registration.id}`
      );
    }
    if (!SUPPORTED_TENANT_PROVIDER_KINDS.has(registration.kind)) {
      throw new Error(
        `TenantProviderRegistration.kind desteklenmiyor: ${registration.id}`
      );
    }
    if (typeof registration.providerRegistered !== 'boolean') {
      throw new Error(
        `TenantProviderRegistration.providerRegistered boolean olmalıdır: ${registration.id}`
      );
    }
    if (registration.providerRegistered) {
      throw new Error(
        `Yeni provider metadata kaydı providerRegistered=false olmalıdır: ${registration.id}`
      );
    }
    if (!Number.isSafeInteger(registration.order) || registration.order <= 0) {
      throw new Error(
        `TenantProviderRegistration.order pozitif güvenli tam sayı olmalıdır: ${registration.id}`
      );
    }

    this.registrations.set(
      registration.id,
      freezeRegistration(registration)
    );
  }

  registerProvider(provider: TenantProvider): void {
    if (!provider?.id || typeof provider.id !== 'string') {
      throw new Error('TenantProvider.id zorunludur.');
    }
    if (!this.registrations.has(provider.id)) {
      throw new Error(`Provider metadata kaydı bulunamadı: ${provider.id}`);
    }
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider implementasyonu zaten kayıtlı: ${provider.id}`);
    }
    const registration = this.registrations.get(provider.id)!;
    if (registration.kind !== provider.kind) {
      throw new Error(
        `Provider kind uyuşmazlığı: ${provider.id} (${provider.kind} !== ${registration.kind})`
      );
    }
    // Provider implementasyonu runtime durumunu korur; yalnızca metadata snapshot dondurulur.
    this.providers.set(provider.id, provider);
    this.registrations.set(
      provider.id,
      freezeRegistration({
        ...registration,
        providerRegistered: true
      })
    );
  }

  unregisterProvider(providerId: string): boolean {
    const registration = this.registrations.get(providerId);
    if (!registration) {
      return false;
    }
    const removed = this.providers.delete(providerId);
    if (removed) {
      this.registrations.set(
        providerId,
        freezeRegistration({
          ...registration,
          providerRegistered: false
        })
      );
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
  ): TenantProviderRegistration | undefined {
    return this.registrations.get(providerId);
  }

  getProviderById(providerId: string): TenantProvider | undefined {
    return this.providers.get(providerId);
  }

  getAllRegistrations(): readonly TenantProviderRegistration[] {
    return Object.freeze(
      [...this.registrations.values()].sort((a, b) => a.order - b.order)
    );
  }

  getRegisteredProviders(): readonly TenantProvider[] {
    return Object.freeze(
      [...this.providers.values()].sort((a, b) => {
        const regA = this.registrations.get(a.id);
        const regB = this.registrations.get(b.id);
        return (regA?.order ?? 0) - (regB?.order ?? 0);
      })
    );
  }

  getByKind(kind: TenantProviderKind): readonly TenantProviderRegistration[] {
    return Object.freeze(
      this.getAllRegistrations().filter((entry) => entry.kind === kind)
    );
  }

  hasRegistration(providerId: string): boolean {
    return this.registrations.has(providerId);
  }

  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  isKindSupported(providerId: string, kind: TenantProviderKind): boolean {
    const registration = this.registrations.get(providerId);
    return registration?.kind === kind;
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

export function createTenantProviderRegistry(
  seedBuiltins = true
): TenantProviderRegistry {
  return new TenantProviderRegistry(seedBuiltins);
}

/** Alias — ProviderRegistryRuntime adlandırma uyumu */
export { TenantProviderRegistry as TenantProviderRegistryRuntime };
export const createTenantProviderRegistryRuntime = createTenantProviderRegistry;

export default TenantProviderRegistry;
