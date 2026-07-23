/**
 * İSTEBUL Business Export Engine — ExportRegistryRuntime (PR-106B).
 */

import type { ExportPartId } from './ExportPart';
import { EXPORT_PART_LABELS, EXPORT_PART_ORDER } from './ExportPart';

/**
 * Export Model parça tanımı.
 */
export interface ExportPartDefinition {
  id: ExportPartId;
  title: string;
  order: number;
  enabled: boolean;
}

/**
 * Runtime Export Model parça kayıt sistemi.
 */
export class ExportRegistryRuntime {
  private readonly byId = new Map<string, ExportPartDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      EXPORT_PART_ORDER.forEach((id, index) => {
        this.byId.set(id, {
          id,
          title: EXPORT_PART_LABELS[id],
          order: index + 1,
          enabled: true
        });
      });
    }
  }

  register(definition: ExportPartDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('ExportPartDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Export Model parçası zaten kayıtlı: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  unregister(partId: string): boolean {
    return this.byId.delete(partId);
  }

  getById(partId: string): ExportPartDefinition | undefined {
    return this.byId.get(partId);
  }

  getAll(): readonly ExportPartDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly ExportPartDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createExportRegistryRuntime(
  seedBuiltins = true
): ExportRegistryRuntime {
  return new ExportRegistryRuntime(seedBuiltins);
}

export default ExportRegistryRuntime;
