/**
 * İSTEBUL Business Analysis Engine — KpiRegistryRuntime (PR-102B).
 */

import type { KpiDefinition } from './KpiDefinition';
import { BUILTIN_KPI_DEFINITIONS } from './builtinDefinitions';

/**
 * Runtime KPI tanım kayıt sistemi.
 */
export class KpiRegistryRuntime {
  private readonly byId = new Map<string, KpiDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_KPI_DEFINITIONS) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: KpiDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('KpiDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`KPI tanımı zaten kayıtlı: ${definition.id}`);
    }
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error(`KpiDefinition.name zorunludur: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  unregister(kpiId: string): boolean {
    return this.byId.delete(kpiId);
  }

  getById(kpiId: string): KpiDefinition | undefined {
    return this.byId.get(kpiId);
  }

  getAll(): readonly KpiDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByCategory(category: KpiDefinition['category']): readonly KpiDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.category === category)
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createKpiRegistryRuntime(
  seedBuiltins = true
): KpiRegistryRuntime {
  return new KpiRegistryRuntime(seedBuiltins);
}

export default KpiRegistryRuntime;
