/**
 * İSTEBUL Business Import Engine — NormalizationResult (PR-101H).
 */

import type { NormalizedField } from './NormalizedField';
import type { NormalizedRecord } from './NormalizedRecord';

/**
 * Normalizasyon uyarısı.
 */
export interface NormalizationWarning {
  /** Uyarı kodu */
  code: string;
  /** Mesaj (Türkçe) */
  message: string;
  /** Alan yolu — örn. `records[0].price` */
  path?: string;
  /** İlgili kural */
  ruleId?: string;
  /** Kaynak kolon */
  sourceKey?: string;
}

/**
 * Uygulanan kural özeti.
 */
export interface AppliedNormalizationRule {
  /** Kural kimliği */
  ruleId: string;
  /** Kaç kez uygulandı */
  count: number;
}

/**
 * Normalizasyon telemetrisi.
 */
export interface NormalizationTelemetry {
  /** Çalışan kural sayısı (kayıt × alan × kural çağrıları) */
  rulesExecuted: number;
  /** Normalize edilen alan sayısı */
  fieldsNormalized: number;
  /** Tip dönüşümü yapılan alan sayısı */
  typesTransformed: number;
  /** Uyarı sayısı */
  warningCount: number;
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Kayıt sayısı */
  recordCount: number;
}

/**
 * Runtime normalizasyon sonucu — BusinessDataset değildir.
 */
export interface NormalizationResult {
  /** Normalize kayıtlar */
  records: readonly NormalizedRecord[];
  /** Tüm benzersiz normalize alan tanımları (fieldName bazlı) */
  fields: readonly NormalizedField[];
  /** Uyarılar */
  warnings: readonly NormalizationWarning[];
  /** Uygulanan kurallar */
  appliedRules: readonly AppliedNormalizationRule[];
  /** Telemetri */
  telemetry: NormalizationTelemetry;
}

export const PIPELINE_BAG_NORMALIZATION_RESULT_KEY =
  'normalizationResult' as const;
