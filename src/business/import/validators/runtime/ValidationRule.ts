/**
 * İSTEBUL Business Import Engine — ValidationRule (PR-101C).
 */

import type { ValidationContext } from './ValidationContext';
import type { ValidationIssue } from './ValidationIssue';
import type { ValidationSeverity } from './ValidationSeverity';

/**
 * Kural hedefi — hangi girdi üzerinde çalışır.
 */
export type ValidationRuleTarget =
  | 'import-request'
  | 'import-context'
  | 'reader-output'
  | 'business-dataset'
  | 'metadata'
  | 'generic';

/**
 * Yapısal doğrulama kuralı.
 */
export interface ValidationRule {
  /** Kural kimliği */
  id: string;
  /** Ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Hedef */
  target: ValidationRuleTarget;
  /** Varsayılan önem — kural issue üretirken override edebilir */
  defaultSeverity: ValidationSeverity;
  /**
   * Yapısal doğrulama — business rule / AI yok.
   */
  validate(context: ValidationContext): readonly ValidationIssue[];
}
