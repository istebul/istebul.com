/**
 * İSTEBUL Business Report Engine — ReportSectionRegistryRuntime (PR-104D).
 */

import type { ReportSectionDefinition } from './ReportSectionDefinition';
import { BUILTIN_REPORT_SECTION_DEFINITIONS } from './builtinDefinitions';

/**
 * Runtime Report Section kayıt sistemi.
 */
export class ReportSectionRegistryRuntime {
  private readonly byId = new Map<string, ReportSectionDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_REPORT_SECTION_DEFINITIONS) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: ReportSectionDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('ReportSectionDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(
        `Report Section tanımı zaten kayıtlı: ${definition.id}`
      );
    }
    if (!definition.sectionCode || typeof definition.sectionCode !== 'string') {
      throw new Error(
        `ReportSectionDefinition.sectionCode zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(sectionId: string): boolean {
    return this.byId.delete(sectionId);
  }

  getById(sectionId: string): ReportSectionDefinition | undefined {
    return this.byId.get(sectionId);
  }

  getByCode(sectionCode: string): ReportSectionDefinition | undefined {
    return this.getAll().find((item) => item.sectionCode === sectionCode);
  }

  getAll(): readonly ReportSectionDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly ReportSectionDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createReportSectionRegistryRuntime(
  seedBuiltins = true
): ReportSectionRegistryRuntime {
  return new ReportSectionRegistryRuntime(seedBuiltins);
}

export default ReportSectionRegistryRuntime;
