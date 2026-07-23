/**
 * İSTEBUL Business — dataset düzeyinde doğrulama sonucu.
 */

import type { ValidationResult } from '../validators/ValidationResult';

/**
 * Tüm dataset için toplanmış doğrulama özeti.
 */
export interface BusinessValidationResult {
  /** Genel geçer mi — kritik hata yoksa true kabul edilir (motor tanımlar) */
  isValid: boolean;
  /** Doğrulama zamanı (ISO 8601) */
  validatedAt: string;
  /** Tekil bulgular */
  results: readonly ValidationResult[];
  /** Özet sayılar */
  counts: Readonly<{
    info: number;
    warning: number;
    error: number;
  }>;
}
