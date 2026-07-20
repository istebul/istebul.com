/**
 * İSTEBUL Business Report Engine — ReportRegistryRuntime (PR-104B).
 */

import type { ReportPartId } from './ReportPart';
import { REPORT_PART_LABELS, REPORT_PART_ORDER } from './ReportPart';

/**
 * Report Model parça tanımı.
 */
export interface ReportPartDefinition {
  id: ReportPartId;
  title: string;
  order: number;
  enabled: boolean;
}

/**
 * Runtime Report Model parça kayıt sistemi.
 */
export class ReportRegistryRuntime {
  private readonly byId = new Map<string, ReportPartDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      REPORT_PART_ORDER.forEach((id, index) => {
        this.byId.set(id, {
          id,
          title: REPORT_PART_LABELS[id],
          order: index + 1,
          enabled: true
        });
      });
    }
  }

  register(definition: ReportPartDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('ReportPartDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Report Model parçası zaten kayıtlı: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  unregister(partId: string): boolean {
    return this.byId.delete(partId);
  }

  getById(partId: string): ReportPartDefinition | undefined {
    return this.byId.get(partId);
  }

  getAll(): readonly ReportPartDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly ReportPartDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createReportRegistryRuntime(
  seedBuiltins = true
): ReportRegistryRuntime {
  return new ReportRegistryRuntime(seedBuiltins);
}

export default ReportRegistryRuntime;
