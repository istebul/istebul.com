/**
 * ColumnDetectorRegistry — PR-101D.
 */

import type { ColumnDetector } from '../detectors/types';
import { BUILTIN_COLUMN_DETECTORS } from '../detectors/columnDetectors';

export class ColumnDetectorRegistry {
  private readonly byId = new Map<string, ColumnDetector>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const detector of BUILTIN_COLUMN_DETECTORS) {
        this.byId.set(detector.id, detector);
      }
    }
  }

  register(detector: ColumnDetector): void {
    if (!detector?.id || typeof detector.id !== 'string') {
      throw new Error('ColumnDetector.id zorunludur.');
    }
    if (this.byId.has(detector.id)) {
      throw new Error(`ColumnDetector zaten kayıtlı: ${detector.id}`);
    }
    if (typeof detector.detect !== 'function') {
      throw new Error(`ColumnDetector.detect fonksiyon olmalıdır: ${detector.id}`);
    }
    this.byId.set(detector.id, detector);
  }

  unregister(id: string): boolean {
    return this.byId.delete(id);
  }

  getById(id: string): ColumnDetector | undefined {
    return this.byId.get(id);
  }

  getAll(): readonly ColumnDetector[] {
    return Object.freeze([...this.byId.values()]);
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createColumnDetectorRegistry(
  seedBuiltins = true
): ColumnDetectorRegistry {
  return new ColumnDetectorRegistry(seedBuiltins);
}
