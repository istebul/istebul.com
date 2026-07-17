/**
 * İSTEBUL Business Import Engine — sonuç tipi.
 */

import type { BusinessDataset } from '../../dataset/models/BusinessDataset';
import type { ImportError } from './ImportError';
import type { ImportStage, ImportStatus } from './ImportStage';

/**
 * İçe aktarma sonucu.
 */
export interface ImportResult {
  /** İstek kimliği */
  requestId: string;
  /** Son durum */
  status: ImportStatus;
  /** Son tamamlanan veya hata aşaması */
  lastStage: ImportStage;
  /** Üretilen dataset — başarılı işlerde */
  dataset?: BusinessDataset;
  /** Hatalar */
  errors: readonly ImportError[];
  /** Uyarılar — iş başarılı olsa da bilgi amaçlı */
  warnings: readonly ImportError[];
  /** Tamamlanma zamanı (ISO 8601) */
  completedAt?: string;
}
