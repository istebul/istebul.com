/**
 * SchemaDetectorRegistry — PR-101D.
 */

import type { SchemaDetector } from '../detectors/types';
import { BUILTIN_SCHEMA_DETECTORS } from '../detectors/schemaDetectors';

export class SchemaDetectorRegistry {
  private readonly byId = new Map<string, SchemaDetector>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const detector of BUILTIN_SCHEMA_DETECTORS) {
        this.byId.set(detector.id, detector);
      }
    }
  }

  register(detector: SchemaDetector): void {
    if (!detector?.id || typeof detector.id !== 'string') {
      throw new Error('SchemaDetector.id zorunludur.');
    }
    if (this.byId.has(detector.id)) {
      throw new Error(`SchemaDetector zaten kayıtlı: ${detector.id}`);
    }
    if (typeof detector.detect !== 'function') {
      throw new Error(`SchemaDetector.detect fonksiyon olmalıdır: ${detector.id}`);
    }
    this.byId.set(detector.id, detector);
  }

  unregister(id: string): boolean {
    return this.byId.delete(id);
  }

  getById(id: string): SchemaDetector | undefined {
    return this.byId.get(id);
  }

  getAll(): readonly SchemaDetector[] {
    return Object.freeze([...this.byId.values()]);
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createSchemaDetectorRegistry(
  seedBuiltins = true
): SchemaDetectorRegistry {
  return new SchemaDetectorRegistry(seedBuiltins);
}
