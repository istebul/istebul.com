/**
 * İSTEBUL Business Import Engine — okuyucu portu.
 *
 * Ham kaynağı bellek içi temsile okur. Bu PR’da implementasyon yoktur.
 */

import type { ImportAdapterTypeId } from '../types/ImportSource';
import type { ImportContext } from '../types/ImportContext';

/**
 * Kaynak tipine özel reader sözleşmesi.
 */
export interface IImportReader {
  /** Desteklenen adapter tipi */
  readonly adapterType: ImportAdapterTypeId;

  /**
   * Bu reader verilen bağlamı okuyabilir mi (tanı seviyesi).
   */
  canRead(context: ImportContext): boolean;

  /**
   * Ham okuma — parse / dönüşüm yapmaz.
   * Implementasyon sonraki PR’lardadır.
   */
  read(context: ImportContext, payloadRef?: string): Promise<unknown>;
}
