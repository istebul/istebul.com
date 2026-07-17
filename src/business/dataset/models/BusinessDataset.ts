/**
 * İSTEBUL Business — resmi veri modeli kök tipi.
 *
 * BusinessDataset, platformun ortak veri dilidir.
 * Bu dosya yalnızca tip tanımlar; import motoru veya UI yoktur.
 */

import type { BusinessAttachment } from './BusinessAttachment';
import type { BusinessDatasetVersion } from './BusinessDatasetVersion';
import type { BusinessEntity } from './BusinessEntity';
import type { BusinessMetadata } from './BusinessMetadata';
import type { BusinessRelation } from './BusinessRelation';
import type { BusinessSource } from './BusinessSource';
import type { BusinessValidationResult } from './BusinessValidationResult';

/**
 * İSTEBUL Business resmi dataset kök modeli.
 */
export interface BusinessDataset {
  /** Kimlik — kararlı dataset anahtarı */
  id: string;
  /** Üst veri */
  metadata: BusinessMetadata;
  /** Sürüm */
  version: BusinessDatasetVersion;
  /** Kaynak */
  source: BusinessSource;
  /** Varlık tabloları */
  entities: readonly BusinessEntity[];
  /** Entity ilişkileri */
  relations: readonly BusinessRelation[];
  /** Ek dosyalar */
  attachments?: readonly BusinessAttachment[];
  /** Son doğrulama sonucu — opsiyonel */
  validation?: BusinessValidationResult;
}
