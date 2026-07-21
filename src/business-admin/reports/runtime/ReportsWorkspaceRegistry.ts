/**
 * İSTEBUL Business Admin — ReportsWorkspaceRegistry (PR-202C).
 */

import type { ReportsWorkspaceWidgetDefinition } from './ReportsWorkspaceWidget';
import { BUILTIN_REPORTS_WORKSPACE_WIDGETS } from './builtinWidgets';

/**
 * Runtime Reports Workspace widget kayıt sistemi.
 */
export class ReportsWorkspaceRegistry {
  private readonly byId = new Map<string, ReportsWorkspaceWidgetDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_REPORTS_WORKSPACE_WIDGETS) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: ReportsWorkspaceWidgetDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('ReportsWorkspaceWidgetDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(
        `Reports Workspace widget zaten kayıtlı: ${definition.id}`
      );
    }
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error(
        `ReportsWorkspaceWidgetDefinition.name zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(widgetId: string): boolean {
    return this.byId.delete(widgetId);
  }

  getById(widgetId: string): ReportsWorkspaceWidgetDefinition | undefined {
    return this.byId.get(widgetId);
  }

  getAll(): readonly ReportsWorkspaceWidgetDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByKind(
    kind: ReportsWorkspaceWidgetDefinition['kind']
  ): readonly ReportsWorkspaceWidgetDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.kind === kind)
    );
  }

  getVisible(): readonly ReportsWorkspaceWidgetDefinition[] {
    return Object.freeze(
      this.getAll().filter(
        (item) => item.visible && item.status === 'active'
      )
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createReportsWorkspaceRegistry(
  seedBuiltins = true
): ReportsWorkspaceRegistry {
  return new ReportsWorkspaceRegistry(seedBuiltins);
}

export default ReportsWorkspaceRegistry;
