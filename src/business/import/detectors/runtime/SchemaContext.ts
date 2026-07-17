/**
 * İSTEBUL Business Import Engine — SchemaContext (PR-101D).
 */

import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';
import type { BusinessSourceTypeId } from '../../../dataset/models/BusinessSource';
import type { ImportAdapterTypeId } from '../../types/ImportSource';

/**
 * Şema tespiti girdisi — ham yapı; parse/CSV yok.
 */
export interface SchemaContext {
  /** Ham girdi (nesne dizisi, columns/rows, headers/records) */
  input: unknown;
  /** Kaynak tipi ipucu */
  sourceType?: BusinessSourceTypeId | ImportAdapterTypeId;
  /** Entity ipuçları */
  entityHints?: readonly BusinessEntityTypeId[];
  /** Dil */
  locale: 'tr' | 'en';
  /** Kolon başına örnek değeri üst sınırı */
  maxSampleValues?: number;
  /** Kiracı etiketi */
  tenantId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * SchemaContext üretir — locale varsayılanı `tr`.
 */
export function createSchemaContext(
  partial: Omit<SchemaContext, 'locale'> & { locale?: 'tr' | 'en' }
): SchemaContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
