/**
 * İSTEBUL Business Dashboard Engine — DashboardSummaryRegistryRuntime (PR-105E).
 */

import type { DashboardSummarySectionId } from './DashboardSummarySection';
import {
  DASHBOARD_SUMMARY_SECTION_LABELS,
  DASHBOARD_SUMMARY_SECTION_ORDER
} from './DashboardSummarySection';

/**
 * Dashboard Summary bölüm tanımı.
 */
export interface DashboardSummarySectionDefinition {
  id: DashboardSummarySectionId;
  title: string;
  order: number;
  enabled: boolean;
}

/**
 * Runtime Dashboard Summary bölüm kayıt sistemi.
 */
export class DashboardSummaryRegistryRuntime {
  private readonly byId = new Map<string, DashboardSummarySectionDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      DASHBOARD_SUMMARY_SECTION_ORDER.forEach((id, index) => {
        this.byId.set(id, {
          id,
          title: DASHBOARD_SUMMARY_SECTION_LABELS[id],
          order: index + 1,
          enabled: true
        });
      });
    }
  }

  register(definition: DashboardSummarySectionDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('DashboardSummarySectionDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(
        `Dashboard Summary bölümü zaten kayıtlı: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(sectionId: string): boolean {
    return this.byId.delete(sectionId);
  }

  getById(sectionId: string): DashboardSummarySectionDefinition | undefined {
    return this.byId.get(sectionId);
  }

  getAll(): readonly DashboardSummarySectionDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly DashboardSummarySectionDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createDashboardSummaryRegistryRuntime(
  seedBuiltins = true
): DashboardSummaryRegistryRuntime {
  return new DashboardSummaryRegistryRuntime(seedBuiltins);
}

export default DashboardSummaryRegistryRuntime;
