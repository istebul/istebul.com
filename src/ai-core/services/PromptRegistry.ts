import { BUILTIN_PROMPTS } from '../prompts/index.ts';
import type { PromptTemplate } from '../prompts/types.ts';
import type { AIModuleId } from '../types/common.ts';

/**
 * Central prompt catalog — every AI module resolves prompts from here.
 */
export class PromptRegistry {
  private readonly byId = new Map<string, PromptTemplate>();
  private readonly byModule = new Map<AIModuleId, PromptTemplate[]>();

  constructor(seed: PromptTemplate[] = BUILTIN_PROMPTS) {
    for (const template of seed) {
      this.register(template);
    }
  }

  register(template: PromptTemplate): void {
    this.byId.set(template.id, template);
    const list = this.byModule.get(template.moduleId) || [];
    const without = list.filter((t) => t.id !== template.id);
    without.push(template);
    this.byModule.set(template.moduleId, without);
  }

  getById(id: string): PromptTemplate | null {
    return this.byId.get(id) ?? null;
  }

  /**
   * Returns the latest registered template for a module (last register wins).
   */
  getForModule(moduleId: AIModuleId): PromptTemplate | null {
    const list = this.byModule.get(moduleId);
    if (!list || list.length === 0) {
      return null;
    }
    return list[list.length - 1];
  }

  listModules(): AIModuleId[] {
    return [...this.byModule.keys()];
  }

  listAll(): PromptTemplate[] {
    return [...this.byId.values()];
  }
}
