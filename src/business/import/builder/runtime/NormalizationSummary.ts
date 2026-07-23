/**
 * İSTEBUL Business Import Engine — NormalizationSummary (PR-101I).
 */

import type {
  AppliedNormalizationRule,
  NormalizationResult,
  NormalizationWarning
} from '../../normalizers/runtime/NormalizationResult';

/**
 * Normalizasyon aşaması özeti — builder bağlamı için.
 */
export interface NormalizationSummary {
  /** Kayıt sayısı */
  recordCount: number;
  /** Normalize edilen alan sayısı */
  fieldsNormalized: number;
  /** Tip dönüşümü yapılan alan sayısı */
  typesTransformed: number;
  /** Uyarı sayısı */
  warningCount: number;
  /** Çalıştırılan kural sayısı */
  rulesExecuted: number;
  /** Normalizasyon süresi (ms) */
  durationMs: number;
  /** Uyarılar */
  warnings: readonly NormalizationWarning[];
  /** Uygulanan kurallar */
  appliedRules: readonly AppliedNormalizationRule[];
}

/**
 * NormalizationResult → NormalizationSummary projeksiyonu.
 */
export function toNormalizationSummary(
  result: NormalizationResult
): NormalizationSummary {
  const { telemetry } = result;
  return {
    recordCount: telemetry.recordCount,
    fieldsNormalized: telemetry.fieldsNormalized,
    typesTransformed: telemetry.typesTransformed,
    warningCount: telemetry.warningCount,
    rulesExecuted: telemetry.rulesExecuted,
    durationMs: telemetry.durationMs,
    warnings: result.warnings,
    appliedRules: result.appliedRules
  };
}
