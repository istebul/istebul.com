/**
 * İSTEBUL Business Report Engine — ReportSummaryRegistryRuntime (PR-104E).
 */

import type { ReportSummarySectionId } from './ReportSummarySection';
import {
  REPORT_SUMMARY_SECTION_LABELS,
  REPORT_SUMMARY_SECTION_ORDER
} from './ReportSummarySection';

/**
 * Report Summary bölüm tanımı.
 */
export interface ReportSummarySectionDefinition {
  id: ReportSummarySectionId;
  title: string;
  order: number;
  enabled: boolean;
}

/**
 * Runtime Report Summary bölüm kayıt sistemi.
 */
export class ReportSummaryRegistryRuntime {
  private readonly byId = new Map<string, ReportSummarySectionDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      REPORT_SUMMARY_SECTION_ORDER.forEach((id, index) => {
        this.byId.set(id, {
          id,
          title: REPORT_SUMMARY_SECTION_LABELS[id],
          order: index + 1,
          enabled: true
        });
      });
    }
  }

  register(definition: ReportSummarySectionDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('ReportSummarySectionDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(
        `Report Summary bölümü zaten kayıtlı: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(sectionId: string): boolean {
    return this.byId.delete(sectionId);
  }

  getById(sectionId: string): ReportSummarySectionDefinition | undefined {
    return this.byId.get(sectionId);
  }

  getAll(): readonly ReportSummarySectionDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly ReportSummarySectionDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createReportSummaryRegistryRuntime(
  seedBuiltins = true
): ReportSummaryRegistryRuntime {
  return new ReportSummaryRegistryRuntime(seedBuiltins);
}

export default ReportSummaryRegistryRuntime;
