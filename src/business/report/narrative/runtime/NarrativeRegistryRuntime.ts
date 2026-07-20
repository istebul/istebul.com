/**
 * İSTEBUL Business Report Engine — NarrativeRegistryRuntime (PR-104C).
 */

import type { NarrativeKind } from './NarrativeKind';
import type { NarrativeTemplate } from './NarrativeTemplate';
import { BUILTIN_NARRATIVE_TEMPLATES } from './builtinTemplates';

/**
 * Runtime Narrative şablon kayıt sistemi.
 */
export class NarrativeRegistryRuntime {
  private readonly byId = new Map<string, NarrativeTemplate>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const template of BUILTIN_NARRATIVE_TEMPLATES) {
        this.byId.set(template.id, template);
      }
    }
  }

  register(template: NarrativeTemplate): void {
    if (!template?.id || typeof template.id !== 'string') {
      throw new Error('NarrativeTemplate.id zorunludur.');
    }
    if (this.byId.has(template.id)) {
      throw new Error(`Narrative şablonu zaten kayıtlı: ${template.id}`);
    }
    if (!template.title || typeof template.title !== 'string') {
      throw new Error(`NarrativeTemplate.title zorunludur: ${template.id}`);
    }
    if (!template.bodyTemplate || typeof template.bodyTemplate !== 'string') {
      throw new Error(
        `NarrativeTemplate.bodyTemplate zorunludur: ${template.id}`
      );
    }
    this.byId.set(template.id, template);
  }

  unregister(templateId: string): boolean {
    return this.byId.delete(templateId);
  }

  getById(templateId: string): NarrativeTemplate | undefined {
    return this.byId.get(templateId);
  }

  getByKind(kind: NarrativeKind): readonly NarrativeTemplate[] {
    return Object.freeze(
      this.getAll().filter((item) => item.kind === kind)
    );
  }

  getAll(): readonly NarrativeTemplate[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly NarrativeTemplate[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createNarrativeRegistryRuntime(
  seedBuiltins = true
): NarrativeRegistryRuntime {
  return new NarrativeRegistryRuntime(seedBuiltins);
}

export default NarrativeRegistryRuntime;
