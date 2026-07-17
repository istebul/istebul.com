/**
 * İSTEBUL Business Import Engine — ValidationSeverity (PR-101C).
 *
 * Dataset katmanındaki `info|warning|error` ile karışmaması için
 * runtime değerleri büyük harflidir.
 */

/**
 * Doğrulama önem derecesi.
 *
 * | Teknik | Türkçe |
 * |--------|--------|
 * | INFO | Bilgi |
 * | WARNING | Uyarı |
 * | ERROR | Hata |
 * | CRITICAL | Kritik |
 */
export type ValidationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export const VALIDATION_RUNTIME_SEVERITY_LABELS: Readonly<
  Record<ValidationSeverity, string>
> = Object.freeze({
  INFO: 'Bilgi',
  WARNING: 'Uyarı',
  ERROR: 'Hata',
  CRITICAL: 'Kritik'
});

export const VALIDATION_SEVERITY_RANK: Readonly<
  Record<ValidationSeverity, number>
> = Object.freeze({
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4
});

export function isBlockingSeverity(severity: ValidationSeverity): boolean {
  return severity === 'ERROR' || severity === 'CRITICAL';
}
