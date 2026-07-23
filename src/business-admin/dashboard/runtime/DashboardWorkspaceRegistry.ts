/**
 * İSTEBUL Business Admin — DashboardWorkspaceRegistry (PR-202B).
 */

import type { DashboardWorkspaceWidgetDefinition } from './DashboardWorkspaceWidget';
import { BUILTIN_DASHBOARD_WORKSPACE_WIDGETS } from './builtinWidgets';

/**
 * Runtime Dashboard Workspace widget kayıt sistemi.
 */
export class DashboardWorkspaceRegistry {
  private readonly byId = new Map<string, DashboardWorkspaceWidgetDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_DASHBOARD_WORKSPACE_WIDGETS) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: DashboardWorkspaceWidgetDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('DashboardWorkspaceWidgetDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(
        `Dashboard Workspace widget zaten kayıtlı: ${definition.id}`
      );
    }
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error(
        `DashboardWorkspaceWidgetDefinition.name zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(widgetId: string): boolean {
    return this.byId.delete(widgetId);
  }

  getById(widgetId: string): DashboardWorkspaceWidgetDefinition | undefined {
    return this.byId.get(widgetId);
  }

  getAll(): readonly DashboardWorkspaceWidgetDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByKind(
    kind: DashboardWorkspaceWidgetDefinition['kind']
  ): readonly DashboardWorkspaceWidgetDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.kind === kind)
    );
  }

  getVisible(): readonly DashboardWorkspaceWidgetDefinition[] {
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

export function createDashboardWorkspaceRegistry(
  seedBuiltins = true
): DashboardWorkspaceRegistry {
  return new DashboardWorkspaceRegistry(seedBuiltins);
}

export default DashboardWorkspaceRegistry;
