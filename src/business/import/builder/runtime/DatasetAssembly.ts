/**
 * İSTEBUL Business Import Engine — DatasetAssembly (PR-101I).
 */

import type { BusinessDatasetVersion } from '../../../dataset/models/BusinessDatasetVersion';
import type { BusinessMetadata } from '../../../dataset/models/BusinessMetadata';
import type { BusinessRelation } from '../../../dataset/models/BusinessRelation';
import type { BusinessSource } from '../../../dataset/models/BusinessSource';
import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { EntityAssembly } from './EntityAssembly';

/**
 * BusinessDataset öncesi ara derleme modeli.
 */
export interface DatasetAssembly {
  /** Üst veri */
  metadata: BusinessMetadata;
  /** Sürüm */
  version: BusinessDatasetVersion;
  /** Kaynak */
  source: BusinessSource;
  /** Entity derlemeleri */
  entities: readonly EntityAssembly[];
  /** İlişkiler — şimdilik boş */
  relations: readonly BusinessRelation[];
  /** Doğrulama özeti (foundation model) */
  validation?: BusinessValidationResult;
}
