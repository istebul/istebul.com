/**
 * İSTEBUL Business Export Engine — FormatRegistryRuntime (PR-106D).
 */

import type { FormatDefinition } from './FormatDefinition';
import type { FormatRepresentationKind } from './FormatRepresentation';
import {
  FORMAT_REPRESENTATION_EXTENSION,
  FORMAT_REPRESENTATION_LABELS,
  FORMAT_REPRESENTATION_MIME,
  FORMAT_REPRESENTATION_ORDER
} from './FormatRepresentation';

/**
 * Runtime Format Representation kayıt sistemi.
 */
export class FormatRegistryRuntime {
  private readonly byId = new Map<string, FormatDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      FORMAT_REPRESENTATION_ORDER.forEach((id, index) => {
        this.byId.set(id, {
          id,
          name: FORMAT_REPRESENTATION_LABELS[id],
          mimeType: FORMAT_REPRESENTATION_MIME[id],
          fileExtension: FORMAT_REPRESENTATION_EXTENSION[id],
          order: index + 1,
          enabled: true
        });
      });
    }
  }

  register(definition: FormatDefinition): void {
    if (!definition?.id || typeof definition.id !== 'string') {
      throw new Error('FormatDefinition.id zorunludur.');
    }
    if (this.byId.has(definition.id)) {
      throw new Error(`Format temsili zaten kayıtlı: ${definition.id}`);
    }
    this.byId.set(definition.id, definition);
  }

  unregister(formatId: string): boolean {
    return this.byId.delete(formatId);
  }

  getById(formatId: string): FormatDefinition | undefined {
    return this.byId.get(formatId);
  }

  getAll(): readonly FormatDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) => a.order - b.order)
    );
  }

  getEnabled(): readonly FormatDefinition[] {
    return Object.freeze(this.getAll().filter((item) => item.enabled));
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }

  listKinds(): readonly FormatRepresentationKind[] {
    return Object.freeze(
      this.getEnabled().map((item) => item.id as FormatRepresentationKind)
    );
  }
}

export function createFormatRegistryRuntime(
  seedBuiltins = true
): FormatRegistryRuntime {
  return new FormatRegistryRuntime(seedBuiltins);
}

export default FormatRegistryRuntime;
