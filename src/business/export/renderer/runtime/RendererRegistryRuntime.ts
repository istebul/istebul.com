/**
 * İSTEBUL Business Export Engine — RendererRegistryRuntime (PR-106C).
 */

import type { RenderPartId } from './RenderPart';
import { RENDER_PART_LABELS, RENDER_PART_ORDER } from './RenderPart';

/**
 * Render Document parça tanımı.
 */
export interface RenderPartDefinition {
  id: RenderPartId;
  title: string;
  order: number;
  enabled: boolean;
}

/**
 * Runtime Renderer parça kayıt sistemi.
 */
export class RendererRegistryRuntime {
  private readonly byId = new Map<string, RenderPartDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      RENDER_PART_ORDER.forEach((id, index) => {
        this.byId.set(id, {
          id,
          title: RENDER_PART_LABELS[id],
          order: index + 1,
          enabled: true
        });
      });
    }
  }

  register(definition: RenderPartDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('RenderPartDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Render parçası zaten kayıtlı: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  unregister(partId: string): boolean {
    return this.byId.delete(partId);
  }

  getById(partId: string): RenderPartDefinition | undefined {
    return this.byId.get(partId);
  }

  getAll(): readonly RenderPartDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly RenderPartDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createRendererRegistryRuntime(
  seedBuiltins = true
): RendererRegistryRuntime {
  return new RendererRegistryRuntime(seedBuiltins);
}

export default RendererRegistryRuntime;
