/**
 * İSTEBUL Business Import Engine — Reader Registration (PR-101B).
 */

import type { IImportReader } from '../../ports/IImportReader';
import type { ReaderDescriptor } from './ReaderDescriptor';

/**
 * Registry’ye kayıt edilen reader girişi.
 *
 * `createReader` opsiyoneldir — bu PR’da gerçek okuyucu yoktur;
 * fabrika stub üretebilir.
 */
export interface ReaderRegistration {
  /** Metadata tanımı */
  descriptor: ReaderDescriptor;
  /**
   * Reader örneği üretici.
   * Verilmezse ReaderFactory stub IImportReader döner (read → NotImplemented).
   */
  createReader?: () => IImportReader;
}
