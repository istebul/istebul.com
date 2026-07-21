/**
 * İSTEBUL Platform Admin — SubscriptionRegistryRuntime (PR-201D).
 */

import type { SubscriptionDefinition } from './Subscription';
import { BUILTIN_SUBSCRIPTION_DEFINITIONS } from './builtinSubscriptions';

/**
 * Runtime Subscription kayıt sistemi.
 */
export class SubscriptionRegistryRuntime {
  private readonly byId = new Map<string, SubscriptionDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_SUBSCRIPTION_DEFINITIONS) {
        this.byId.set(definition.identity.id, definition);
      }
    }
  }

  register(definition: SubscriptionDefinition): void {
    const id = definition?.identity?.id;
    if (!id || typeof id !== 'string') {
      throw new Error('SubscriptionDefinition.identity.id zorunludur.');
    }
    if (this.byId.has(id)) {
      throw new Error(`Subscription zaten kayıtlı: ${id}`);
    }
    if (
      !definition.tenantReference?.tenantId ||
      typeof definition.tenantReference.tenantId !== 'string'
    ) {
      throw new Error(
        `SubscriptionDefinition.tenantReference.tenantId zorunludur: ${id}`
      );
    }
    if (!definition.plan || typeof definition.plan !== 'string') {
      throw new Error(`SubscriptionDefinition.plan zorunludur: ${id}`);
    }
    this.byId.set(id, definition);
  }

  unregister(subscriptionId: string): boolean {
    return this.byId.delete(subscriptionId);
  }

  getById(subscriptionId: string): SubscriptionDefinition | undefined {
    return this.byId.get(subscriptionId);
  }

  getAll(): readonly SubscriptionDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) =>
        a.identity.id.localeCompare(b.identity.id)
      )
    );
  }

  getByStatus(
    status: SubscriptionDefinition['status']
  ): readonly SubscriptionDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.status === status)
    );
  }

  getByTenantId(tenantId: string): readonly SubscriptionDefinition[] {
    return Object.freeze(
      this.getAll().filter(
        (item) => item.tenantReference.tenantId === tenantId
      )
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createSubscriptionRegistryRuntime(
  seedBuiltins = true
): SubscriptionRegistryRuntime {
  return new SubscriptionRegistryRuntime(seedBuiltins);
}

export default SubscriptionRegistryRuntime;
