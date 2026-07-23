/**
 * İSTEBUL Business Import Engine — ValidationSummary (PR-101I).
 */

import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { ValidationResult } from '../../../dataset/validators/ValidationResult';
import type { ValidationIssue } from '../../validators/runtime/ValidationIssue';
import type { ValidationResultRuntime } from '../../validators/runtime/ValidationResultRuntime';
import type { ValidationSeverity } from '../../validators/runtime/ValidationSeverity';

/**
 * Doğrulama aşaması özeti — builder bağlamı için.
 */
export interface ValidationSummary {
  /** Genel geçer mi */
  isValid: boolean;
  /** Toplam bulgu sayısı */
  issueCount: number;
  /** Runtime severity sayıları */
  counts: Readonly<Record<ValidationSeverity, number>>;
  /** Foundation doğrulama modeli */
  businessValidation: BusinessValidationResult;
}

function mapRuntimeSeverityToFoundation(
  severity: ValidationSeverity
): 'info' | 'warning' | 'error' {
  switch (severity) {
    case 'INFO':
      return 'info';
    case 'WARNING':
      return 'warning';
    case 'ERROR':
    case 'CRITICAL':
      return 'error';
    default: {
      const _exhaustive: never = severity;
      void _exhaustive;
      return 'error';
    }
  }
}

function issueToValidationResult(issue: ValidationIssue): ValidationResult {
  const severity = mapRuntimeSeverityToFoundation(issue.severity);
  return {
    severity,
    code: issue.code,
    message: issue.message
  };
}

/**
 * ValidationResultRuntime → BusinessValidationResult projeksiyonu.
 */
export function toBusinessValidationResult(
  runtime: ValidationResultRuntime,
  validatedAt?: string
): BusinessValidationResult {
  const results = runtime.issues.map(issueToValidationResult);
  const counts = {
    info: runtime.telemetry.issueCounts.INFO ?? 0,
    warning: runtime.telemetry.issueCounts.WARNING ?? 0,
    error:
      (runtime.telemetry.issueCounts.ERROR ?? 0) +
      (runtime.telemetry.issueCounts.CRITICAL ?? 0)
  };
  return {
    isValid: runtime.isValid,
    validatedAt: validatedAt ?? runtime.telemetry.endedAt,
    results: Object.freeze(results),
    counts: Object.freeze(counts)
  };
}

/**
 * ValidationResultRuntime → ValidationSummary projeksiyonu.
 */
export function toValidationSummary(
  runtime: ValidationResultRuntime
): ValidationSummary {
  return {
    isValid: runtime.isValid,
    issueCount: runtime.issues.length,
    counts: runtime.telemetry.issueCounts,
    businessValidation: toBusinessValidationResult(runtime)
  };
}
