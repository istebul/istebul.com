/**
 * İSTEBUL Business Import Engine — ReaderRegistryRuntime (PR-101B).
 *
 * Çalışır kayıt sistemi. Gerçek CSV/Excel okuma yoktur.
 */

import type { ReaderRegistration } from './ReaderRegistration';
import type { ImportTarget } from './ImportTarget';
import {
  DuplicateReaderError,
  InvalidRegistrationError,
  ReaderNotFoundError,
  UnsupportedSourceError
} from './errors';
import {
  ReaderResolver,
  type ReaderResolveResult
} from './ReaderResolver';

function assertValidRegistration(registration: ReaderRegistration): void {
  const d = registration?.descriptor;
  if (!d || typeof d !== 'object') {
    throw new InvalidRegistrationError(
      'Reader kaydı geçersiz: descriptor zorunludur.'
    );
  }
  if (!d.id || typeof d.id !== 'string' || !d.id.trim()) {
    throw new InvalidRegistrationError(
      'Reader kaydı geçersiz: descriptor.id zorunludur.',
      { field: 'id' }
    );
  }
  if (!d.name || typeof d.name !== 'string' || !d.name.trim()) {
    throw new InvalidRegistrationError(
      'Reader kaydı geçersiz: descriptor.name zorunludur.',
      { field: 'name', readerId: d.id }
    );
  }
  if (!d.version || typeof d.version !== 'string') {
    throw new InvalidRegistrationError(
      'Reader kaydı geçersiz: descriptor.version zorunludur.',
      { field: 'version', readerId: d.id }
    );
  }
  if (!Array.isArray(d.sourceTypes) || d.sourceTypes.length === 0) {
    throw new InvalidRegistrationError(
      'Reader kaydı geçersiz: en az bir sourceType gerekir.',
      { field: 'sourceTypes', readerId: d.id }
    );
  }
}

/**
 * Reader Registry Runtime.
 */
export class ReaderRegistryRuntime {
  private readonly byId = new Map<string, ReaderRegistration>();
  private readonly resolver: ReaderResolver;

  constructor() {
    this.resolver = new ReaderResolver(() => this.getAll());
  }

  /**
   * Reader kaydı ekler.
   * @throws DuplicateReaderError | InvalidRegistrationError
   */
  register(registration: ReaderRegistration): void {
    assertValidRegistration(registration);
    const id = registration.descriptor.id.trim();
    if (this.byId.has(id)) {
      throw new DuplicateReaderError(
        `Reader zaten kayıtlı: ${id}`,
        { readerId: id }
      );
    }
    this.byId.set(id, {
      descriptor: {
        ...registration.descriptor,
        id,
        priority: registration.descriptor.priority ?? 0
      },
      createReader: registration.createReader
    });
  }

  /**
   * Reader kaydını kaldırır.
   * @returns true — kaldırıldı; false — yoktu
   */
  unregister(readerId: string): boolean {
    return this.byId.delete(readerId);
  }

  /**
   * Metadata ile reader çözer.
   * @throws UnsupportedSourceError — hiç aday yok ve hedef tanımsız/uygunsuz
   * @throws ReaderNotFoundError — kısıtlar var ama eşleşme yok (opsiyonel throw=false ile sonuç)
   */
  resolve(
    target: ImportTarget,
    options?: Readonly<{ throwIfMissing?: boolean }>
  ): ReaderResolveResult {
    const result = this.resolver.resolve(target);
    const throwIfMissing = options?.throwIfMissing === true;

    if (!result.found && throwIfMissing) {
      if (
        !target.sourceType &&
        !target.mimeType &&
        !target.extension
      ) {
        throw new UnsupportedSourceError(
          'Kaynak metadata yetersiz: sourceType, mimeType veya extension gerekli.',
          { label: target.label ?? '' }
        );
      }
      throw new ReaderNotFoundError(
        'Hedef için uygun reader bulunamadı.',
        {
          sourceType: target.sourceType ?? '',
          mimeType: target.mimeType ?? '',
          extension: target.extension ?? '',
          tenantId: target.tenantId ?? ''
        }
      );
    }

    return result;
  }

  /**
   * Hedef için en az bir reader var mı?
   */
  supports(target: ImportTarget): boolean {
    return this.resolver.supports(target);
  }

  /**
   * Tüm kayıtlar (kopya dizi).
   */
  getAll(): readonly ReaderRegistration[] {
    return Object.freeze([...this.byId.values()]);
  }

  /**
   * Tüm kayıtları temizler.
   */
  clear(): void {
    this.byId.clear();
  }

  /**
   * Kayıt sayısı.
   */
  count(): number {
    return this.byId.size;
  }

  /**
   * Kimliğe göre kayıt.
   */
  getById(readerId: string): ReaderRegistration | undefined {
    return this.byId.get(readerId);
  }
}

export function createReaderRegistryRuntime(): ReaderRegistryRuntime {
  return new ReaderRegistryRuntime();
}

export default ReaderRegistryRuntime;
