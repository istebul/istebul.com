/**
 * İSTEBUL Business Admin — ExportWorkspaceRegistry (PR-202D).
 */

import type { ExportWorkspaceWidgetDefinition } from './ExportWorkspaceWidget';
import { BUILTIN_EXPORT_WORKSPACE_WIDGETS } from './builtinWidgets';

/**
 * Runtime Export Workspace widget kayıt sistemi.
 */
export class ExportWorkspaceRegistry {
  private readonly byId = new Map<string, ExportWorkspaceWidgetDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_EXPORT_WORKSPACE_WIDGETS) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: ExportWorkspaceWidgetDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('ExportWorkspaceWidgetDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(
        `Export Workspace widget zaten kayıtlı: ${definition.id}`
      );
    }
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error(
        `ExportWorkspaceWidgetDefinition.name zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(widgetId: string): boolean {
    return this.byId.delete(widgetId);
  }

  getById(widgetId: string): ExportWorkspaceWidgetDefinition | undefined {
    return this.byId.get(widgetId);
  }

  getAll(): readonly ExportWorkspaceWidgetDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByKind(
    kind: ExportWorkspaceWidgetDefinition['kind']
  ): readonly ExportWorkspaceWidgetDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.kind === kind)
    );
  }

  getVisible(): readonly ExportWorkspaceWidgetDefinition[] {
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

export function createExportWorkspaceRegistry(
  seedBuiltins = true
): ExportWorkspaceRegistry {
  return new ExportWorkspaceRegistry(seedBuiltins);
}

export default ExportWorkspaceRegistry;
