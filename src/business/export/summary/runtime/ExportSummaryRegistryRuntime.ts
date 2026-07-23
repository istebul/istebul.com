/**
 * İSTEBUL Business Export Engine — ExportSummaryRegistryRuntime (PR-106E).
 */

import type { ExportSummarySectionId } from './ExportSummarySection';
import {
  EXPORT_SUMMARY_SECTION_LABELS,
  EXPORT_SUMMARY_SECTION_ORDER
} from './ExportSummarySection';

/**
 * Export Summary bölüm tanımı.
 */
export interface ExportSummarySectionDefinition {
  id: ExportSummarySectionId;
  title: string;
  order: number;
  enabled: boolean;
}

/**
 * Runtime Export Summary bölüm kayıt sistemi.
 */
export class ExportSummaryRegistryRuntime {
  private readonly byId = new Map<string, ExportSummarySectionDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      EXPORT_SUMMARY_SECTION_ORDER.forEach((id, index) => {
        this.byId.set(id, {
          id,
          title: EXPORT_SUMMARY_SECTION_LABELS[id],
          order: index + 1,
          enabled: true
        });
      });
    }
  }

  register(definition: ExportSummarySectionDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('ExportSummarySectionDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Export Summary bölümü zaten kayıtlı: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  unregister(sectionId: string): boolean {
    return this.byId.delete(sectionId);
  }

  getById(sectionId: string): ExportSummarySectionDefinition | undefined {
    return this.byId.get(sectionId);
  }

  getAll(): readonly ExportSummarySectionDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly ExportSummarySectionDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createExportSummaryRegistryRuntime(
  seedBuiltins = true
): ExportSummaryRegistryRuntime {
  return new ExportSummaryRegistryRuntime(seedBuiltins);
}

export default ExportSummaryRegistryRuntime;
