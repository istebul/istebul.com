/**
 * İSTEBUL Business Import Engine — ValidationResultRuntime (PR-101C).
 */

import type { ValidationIssue } from './ValidationIssue';
import type { ValidationSeverity } from './ValidationSeverity';

/**
 * Validation telemetrisi.
 */
export interface ValidationTelemetry {
  /** Süre (ms) */
  durationMs: number;
  /** Başlangıç (ISO 8601) */
  startedAt: string;
  /** Bitiş (ISO 8601) */
  endedAt: string;
  /** Çalışan kural sayısı */
  rulesExecuted: number;
  /** Başarılı kural sayısı (issue üretmeyen) */
  rulesPassed: number;
  /** Başarısız kural sayısı (en az bir issue) */
  rulesFailed: number;
  /** Severity bazlı issue sayıları */
  issueCounts: Readonly<Record<ValidationSeverity, number>>;
}

/**
 * Runtime doğrulama sonucu.
 */
export interface ValidationResultRuntime {
  /** ERROR/CRITICAL yoksa true */
  isValid: boolean;
  /** Tüm bulgular */
  issues: readonly ValidationIssue[];
  /** Telemetri */
  telemetry: ValidationTelemetry;
}

export const PIPELINE_BAG_VALIDATION_RESULT_KEY = 'validationResult' as const;
