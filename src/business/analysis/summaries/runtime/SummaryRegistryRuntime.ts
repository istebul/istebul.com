/**
 * İSTEBUL Business Analysis Engine — SummaryRegistryRuntime (PR-102E).
 */

import type { SummarySectionId } from './SummarySection';
import {
  SUMMARY_SECTION_LABELS,
  SUMMARY_SECTION_ORDER
} from './SummarySection';

/**
 * Summary bölüm tanımı.
 */
export interface SummarySectionDefinition {
  id: SummarySectionId;
  title: string;
  order: number;
  enabled: boolean;
}

/**
 * Runtime summary bölüm kayıt sistemi.
 */
export class SummaryRegistryRuntime {
  private readonly byId = new Map<string, SummarySectionDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      SUMMARY_SECTION_ORDER.forEach((id, index) => {
        this.byId.set(id, {
          id,
          title: SUMMARY_SECTION_LABELS[id],
          order: index + 1,
          enabled: true
        });
      });
    }
  }

  register(definition: SummarySectionDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('SummarySectionDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Summary bölümü zaten kayıtlı: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  unregister(sectionId: string): boolean {
    return this.byId.delete(sectionId);
  }

  getById(sectionId: string): SummarySectionDefinition | undefined {
    return this.byId.get(sectionId);
  }

  getAll(): readonly SummarySectionDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly SummarySectionDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createSummaryRegistryRuntime(
  seedBuiltins = true
): SummaryRegistryRuntime {
  return new SummaryRegistryRuntime(seedBuiltins);
}

export default SummaryRegistryRuntime;
