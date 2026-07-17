/**
 * İSTEBUL Business — normalizer port arayüzleri.
 *
 * Implementasyon yoktur. Gelecek Import Engine bu sözleşmeleri uygular.
 */

import type { BusinessDataset } from '../models/BusinessDataset';
import type { BusinessEntityTypeId } from '../entities/BusinessEntityType';
import type { BusinessSourceTypeId } from '../models/BusinessSource';
import type { BusinessValidationResult } from '../models/BusinessValidationResult';

/**
 * Ham kaynağı BusinessDataset’e dönüştürür.
 */
export interface IDataNormalizer {
  /** Desteklenen kaynak tipleri */
  readonly supportedSourceTypes: readonly BusinessSourceTypeId[];

  /**
   * Ham girdiyi normalize eder.
   * @param input — kaynak tipine göre buffer, metin veya yapılandırılmış nesne
   */
  normalize(
    input: unknown,
    options?: Readonly<{
      sourceType: BusinessSourceTypeId;
      label?: string;
      locale?: 'tr' | 'en';
    }>
  ): Promise<BusinessDataset>;
}

/**
 * Ham girdideki şema / sütun yapısını sezer.
 */
export interface ISchemaDetector {
  detect(
    input: unknown,
    options?: Readonly<{
      sourceType?: BusinessSourceTypeId;
    }>
  ): Promise<
    Readonly<{
      columnKeys: readonly string[];
      rowCountEstimate?: number;
      confidence?: number;
    }>
  >;
}

/**
 * Ham girdideki entity tiplerini önerir.
 */
export interface IEntityDetector {
  detect(
    input: unknown,
    options?: Readonly<{
      sourceType?: BusinessSourceTypeId;
      hints?: readonly BusinessEntityTypeId[];
    }>
  ): Promise<
    Readonly<{
      suggestions: readonly {
        entityType: BusinessEntityTypeId;
        confidence: number;
        label?: string;
      }[];
    }>
  >;
}

/**
 * BusinessDataset üzerinde doğrulama çalıştırır.
 */
export interface IValidationEngine {
  validate(dataset: BusinessDataset): Promise<BusinessValidationResult>;
}
