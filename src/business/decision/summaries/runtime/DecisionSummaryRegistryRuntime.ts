/**
 * İSTEBUL Business Decision Engine — DecisionSummaryRegistryRuntime (PR-103E).
 */

import type { DecisionSummarySectionId } from './DecisionSummarySection';
import {
  DECISION_SUMMARY_SECTION_LABELS,
  DECISION_SUMMARY_SECTION_ORDER
} from './DecisionSummarySection';

/**
 * Decision Summary bölüm tanımı.
 */
export interface DecisionSummarySectionDefinition {
  id: DecisionSummarySectionId;
  title: string;
  order: number;
  enabled: boolean;
}

/**
 * Runtime Decision Summary bölüm kayıt sistemi.
 */
export class DecisionSummaryRegistryRuntime {
  private readonly byId = new Map<string, DecisionSummarySectionDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      DECISION_SUMMARY_SECTION_ORDER.forEach((id, index) => {
        this.byId.set(id, {
          id,
          title: DECISION_SUMMARY_SECTION_LABELS[id],
          order: index + 1,
          enabled: true
        });
      });
    }
  }

  register(definition: DecisionSummarySectionDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('DecisionSummarySectionDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(
        `Decision Summary bölümü zaten kayıtlı: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(sectionId: string): boolean {
    return this.byId.delete(sectionId);
  }

  getById(sectionId: string): DecisionSummarySectionDefinition | undefined {
    return this.byId.get(sectionId);
  }

  getAll(): readonly DecisionSummarySectionDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly DecisionSummarySectionDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createDecisionSummaryRegistryRuntime(
  seedBuiltins = true
): DecisionSummaryRegistryRuntime {
  return new DecisionSummaryRegistryRuntime(seedBuiltins);
}

export default DecisionSummaryRegistryRuntime;
