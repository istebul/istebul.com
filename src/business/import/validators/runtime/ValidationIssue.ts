/**
 * İSTEBUL Business Import Engine — ValidationIssue (PR-101C).
 */

import type { ValidationSeverity } from './ValidationSeverity';

/**
 * Tek bir yapısal doğrulama bulgusu.
 */
export interface ValidationIssue {
  /** Kural kimliği */
  ruleId: string;
  /** Bulgu kodu */
  code: string;
  /** Mesaj (Türkçe) */
  message: string;
  /** Önem */
  severity: ValidationSeverity;
  /** Alan yolu — örn. `request.source.type` */
  path?: string;
  /** Teknik detay */
  detail?: string;
}
