/**
 * İSTEBUL Business Import Engine — çalışma bağlamı.
 */

import type { ImportSource } from './ImportSource';
import type { ImportStage, ImportStatus } from './ImportStage';

/**
 * Tek bir içe aktarma işinin bağlamı.
 * Henüz dosya okuma veya persist yoktur; yalnızca veri taşıyıcısı.
 */
export interface ImportContext {
  /** İş kimliği — izlenebilirlik */
  importId: string;
  /** Kaynak */
  source: ImportSource;
  /** İstek dili */
  locale: 'tr' | 'en';
  /** Güncel aşama */
  currentStage: ImportStage;
  /** Güncel durum */
  status: ImportStatus;
  /** İsteğe bağlı hedef rapor DNA kimliği (Knowledge Architecture) */
  targetReportId?: string;
  /** İsteğe bağlı entity ipuçları */
  entityHints?: readonly string[];
  /** Bağlam meta */
  metadata?: Readonly<Record<string, string>>;
}
