/**
 * İSTEBUL Business Admin — BusinessSettingsWorkspaceRegistry (PR-202E).
 */

import type { BusinessSettingsWorkspaceWidgetDefinition } from './BusinessSettingsWorkspaceWidget';
import { BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGETS } from './builtinWidgets';

/**
 * Runtime Business Settings Workspace section kayıt sistemi.
 */
export class BusinessSettingsWorkspaceRegistry {
  private readonly byId = new Map<
    string,
    BusinessSettingsWorkspaceWidgetDefinition
  >();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGETS) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: BusinessSettingsWorkspaceWidgetDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error(
        'BusinessSettingsWorkspaceWidgetDefinition.id zorunludur.'
      );
    }
    if (this.byId.has(definition.id)) {
      throw new Error(
        `Business Settings Workspace section zaten kayıtlı: ${definition.id}`
      );
    }
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error(
        `BusinessSettingsWorkspaceWidgetDefinition.name zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(widgetId: string): boolean {
    return this.byId.delete(widgetId);
  }

  getById(
    widgetId: string
  ): BusinessSettingsWorkspaceWidgetDefinition | undefined {
    return this.byId.get(widgetId);
  }

  getAll(): readonly BusinessSettingsWorkspaceWidgetDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getByKind(
    kind: BusinessSettingsWorkspaceWidgetDefinition['kind']
  ): readonly BusinessSettingsWorkspaceWidgetDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.kind === kind)
    );
  }

  getVisible(): readonly BusinessSettingsWorkspaceWidgetDefinition[] {
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

export function createBusinessSettingsWorkspaceRegistry(
  seedBuiltins = true
): BusinessSettingsWorkspaceRegistry {
  return new BusinessSettingsWorkspaceRegistry(seedBuiltins);
}

export default BusinessSettingsWorkspaceRegistry;
