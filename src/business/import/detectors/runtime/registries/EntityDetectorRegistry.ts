/**
 * EntityDetectorRegistry — PR-101D.
 */

import type { EntityDetector } from '../detectors/types';
import { BUILTIN_ENTITY_DETECTORS } from '../detectors/entityDetectors';

export class EntityDetectorRegistry {
  private readonly byId = new Map<string, EntityDetector>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const detector of BUILTIN_ENTITY_DETECTORS) {
        this.byId.set(detector.id, detector);
      }
    }
  }

  register(detector: EntityDetector): void {
    if (!detector?.id || typeof detector.id !== 'string') {
      throw new Error('EntityDetector.id zorunludur.');
    }
    if (this.byId.has(detector.id)) {
      throw new Error(`EntityDetector zaten kayıtlı: ${detector.id}`);
    }
    if (typeof detector.detect !== 'function') {
      throw new Error(`EntityDetector.detect fonksiyon olmalıdır: ${detector.id}`);
    }
    this.byId.set(detector.id, detector);
  }

  unregister(id: string): boolean {
    return this.byId.delete(id);
  }

  getById(id: string): EntityDetector | undefined {
    return this.byId.get(id);
  }

  getAll(): readonly EntityDetector[] {
    return Object.freeze([...this.byId.values()]);
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createEntityDetectorRegistry(
  seedBuiltins = true
): EntityDetectorRegistry {
  return new EntityDetectorRegistry(seedBuiltins);
}
