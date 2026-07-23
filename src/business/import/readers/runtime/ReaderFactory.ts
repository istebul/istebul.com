/**
 * İSTEBUL Business Import Engine — ReaderFactory (PR-101B).
 *
 * Kayıttan IImportReader üretir. Gerçek parse yoktur.
 */

import type { IImportReader } from '../../ports/IImportReader';
import type { ImportTarget } from './ImportTarget';
import type { ReaderRegistryRuntime } from './ReaderRegistryRuntime';
import { ReaderNotFoundError } from './errors';
import { StubImportReader } from './StubImportReader';
import type { ReaderLookupTelemetry } from './telemetry';

export interface ReaderFactoryResult {
  reader: IImportReader;
  readerId: string;
  telemetry: ReaderLookupTelemetry;
}

/**
 * ReaderFactory — resolve + create.
 */
export class ReaderFactory {
  private readonly registry: ReaderRegistryRuntime;

  constructor(registry: ReaderRegistryRuntime) {
    this.registry = registry;
  }

  /**
   * Hedef metadata ile reader örneği üretir.
   * @throws ReaderNotFoundError | UnsupportedSourceError
   */
  create(target: ImportTarget): ReaderFactoryResult {
    const resolved = this.registry.resolve(target, { throwIfMissing: true });
    const registration = resolved.registration;
    if (!registration) {
      throw new ReaderNotFoundError('Reader kaydı çözülemedi.');
    }

    const reader = registration.createReader
      ? registration.createReader()
      : new StubImportReader(registration.descriptor);

    return {
      reader,
      readerId: registration.descriptor.id,
      telemetry: resolved.telemetry
    };
  }

  /**
   * Kimliğe göre reader üretir.
   */
  createById(readerId: string): IImportReader {
    const registration = this.registry.getById(readerId);
    if (!registration) {
      throw new ReaderNotFoundError(`Reader bulunamadı: ${readerId}`, {
        readerId
      });
    }
    if (registration.createReader) {
      return registration.createReader();
    }
    return new StubImportReader(registration.descriptor);
  }
}

export function createReaderFactory(
  registry: ReaderRegistryRuntime
): ReaderFactory {
  return new ReaderFactory(registry);
}
