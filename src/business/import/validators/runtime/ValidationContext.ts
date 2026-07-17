/**
 * İSTEBUL Business Import Engine — ValidationContext (PR-101C).
 */

import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { BusinessMetadata } from '../../../dataset/models/BusinessMetadata';
import type { ImportContext } from '../../types/ImportContext';
import type { ImportRequest } from '../../types/ImportRequest';

/**
 * Doğrulama hedefleri — yapısal kontroller için girdi torbası.
 */
export interface ValidationContext {
  /** Import isteği */
  request?: ImportRequest;
  /** Import bağlamı */
  importContext?: ImportContext;
  /** Reader çıktısı — ham; parse edilmez */
  readerOutput?: unknown;
  /** BusinessDataset */
  dataset?: BusinessDataset;
  /** Ayrı metadata (dataset.metadata ile birlikte veya tek başına) */
  metadata?: BusinessMetadata;
  /** Dil */
  locale: 'tr' | 'en';
  /** Kiracı etiketi — multi-tenant izlenebilirlik */
  tenantId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * ValidationContext üretir — locale varsayılanı `tr`.
 */
export function createValidationContext(
  partial: Omit<ValidationContext, 'locale'> & { locale?: 'tr' | 'en' } = {}
): ValidationContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
