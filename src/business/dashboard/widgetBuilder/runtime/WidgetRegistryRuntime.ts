/**
 * İSTEBUL Business Dashboard Engine — WidgetRegistryRuntime (PR-105C).
 */

import type { WidgetDefinition } from './WidgetDefinition';
import { BUILTIN_WIDGET_DEFINITIONS } from './builtinDefinitions';

/**
 * Runtime Widget kayıt sistemi.
 */
export class WidgetRegistryRuntime {
  private readonly byId = new Map<string, WidgetDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_WIDGET_DEFINITIONS) {
        this.byId.set(definition.id, definition);
      }
    }
  }

  register(definition: WidgetDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('WidgetDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Widget tanımı zaten kayıtlı: ${definition.id}`);
    }
    if (!definition.widgetCode || typeof definition.widgetCode !== 'string') {
      throw new Error(
        `WidgetDefinition.widgetCode zorunludur: ${definition.id}`
      );
    }
    this.byId.set(definition.id, definition);
  }

  unregister(widgetId: string): boolean {
    return this.byId.delete(widgetId);
  }

  getById(widgetId: string): WidgetDefinition | undefined {
    return this.byId.get(widgetId);
  }

  getByCode(widgetCode: string): WidgetDefinition | undefined {
    return this.getAll().find((item) => item.widgetCode === widgetCode);
  }

  getAll(): readonly WidgetDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly WidgetDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createWidgetRegistryRuntime(
  seedBuiltins = true
): WidgetRegistryRuntime {
  return new WidgetRegistryRuntime(seedBuiltins);
}

export default WidgetRegistryRuntime;
