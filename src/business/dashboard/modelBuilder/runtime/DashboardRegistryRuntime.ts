/**
 * İSTEBUL Business Dashboard Engine — DashboardRegistryRuntime (PR-105B).
 */

import type { DashboardPartId } from './DashboardPart';
import { DASHBOARD_PART_LABELS, DASHBOARD_PART_ORDER } from './DashboardPart';

/**
 * Dashboard Model parça tanımı.
 */
export interface DashboardPartDefinition {
  id: DashboardPartId;
  title: string;
  order: number;
  enabled: boolean;
}

/**
 * Runtime Dashboard Model parça kayıt sistemi.
 */
export class DashboardRegistryRuntime {
  private readonly byId = new Map<string, DashboardPartDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      DASHBOARD_PART_ORDER.forEach((id, index) => {
        this.byId.set(id, {
          id,
          title: DASHBOARD_PART_LABELS[id],
          order: index + 1,
          enabled: true
        });
      });
    }
  }

  register(definition: DashboardPartDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('DashboardPartDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(
        `Dashboard Model parçası zaten kayıtlı: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(partId: string): boolean {
    return this.byId.delete(partId);
  }

  getById(partId: string): DashboardPartDefinition | undefined {
    return this.byId.get(partId);
  }

  getAll(): readonly DashboardPartDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly DashboardPartDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createDashboardRegistryRuntime(
  seedBuiltins = true
): DashboardRegistryRuntime {
  return new DashboardRegistryRuntime(seedBuiltins);
}

export default DashboardRegistryRuntime;
