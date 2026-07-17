/**
 * İSTEBUL Business Import Engine — stub IImportReader (PR-101B).
 *
 * Gerçek okuma yoktur; read() standart NotImplemented fırlatır.
 */

import type { IImportReader } from '../../ports/IImportReader';
import type { ImportAdapterTypeId } from '../../types/ImportSource';
import type { ImportContext } from '../../types/ImportContext';
import type { ReaderDescriptor } from './ReaderDescriptor';

/**
 * Kayıt metadata’sından üretilen stub reader.
 */
export class StubImportReader implements IImportReader {
  readonly adapterType: ImportAdapterTypeId;
  readonly readerId: string;

  constructor(descriptor: ReaderDescriptor) {
    const primary = descriptor.sourceTypes[0];
    if (!primary) {
      throw new Error('StubImportReader: sourceTypes boş olamaz.');
    }
    this.adapterType = primary;
    this.readerId = descriptor.id;
  }

  canRead(context: ImportContext): boolean {
    return this.adapterType === context.source.type;
  }

  async read(
    _context: ImportContext,
    _payloadRef?: string
  ): Promise<unknown> {
    throw Object.assign(
      new Error(
        `Reader '${this.readerId}' henüz uygulanmadı; dosya okuma yok (PR-101B).`
      ),
      { code: 'NOT_IMPLEMENTED' as const }
    );
  }
}
