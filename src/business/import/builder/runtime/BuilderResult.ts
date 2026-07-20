/**
 * İSTEBUL Business Import Engine — BuilderResult (PR-101I).
 */

import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { ImportResult } from '../../types/ImportResult';
import type { DatasetAssembly } from './DatasetAssembly';
import type { NormalizationSummary } from './NormalizationSummary';
import type { ValidationSummary } from './ValidationSummary';

/**
 * Builder telemetrisi.
 */
export interface BuilderTelemetry {
  /** Entity sayısı */
  entityCount: number;
  /** Kayıt (satır) sayısı */
  recordCount: number;
  /** Benzersiz alan (sütun) sayısı — tüm entity'ler */
  fieldCount: number;
  /** Derleme süresi (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
}

/**
 * Dataset builder çıktısı.
 */
export interface BuilderResult {
  /** Üretilen BusinessDataset */
  dataset: BusinessDataset;
  /** Import sonucu — dataset bağlı */
  importResult: ImportResult;
  /** Ara derleme modeli */
  assembly: DatasetAssembly;
  /** Telemetri */
  telemetry: BuilderTelemetry;
  /** Normalizasyon özeti */
  normalizationSummary: NormalizationSummary;
  /** Doğrulama özeti — bağlamda varsa */
  validationSummary?: ValidationSummary;
}

export const PIPELINE_BAG_DATASET_BUILD_RESULT_KEY =
  'datasetBuildResult' as const;

/**
 * BuilderResult → ImportResult (dataset zaten bağlı).
 */
export function toImportResult(result: BuilderResult): ImportResult {
  return result.importResult;
}
