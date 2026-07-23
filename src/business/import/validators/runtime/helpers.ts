/**
 * Ortak yapısal kontrol yardımcıları.
 */

import type { ValidationIssue } from './ValidationIssue';
import type { ValidationSeverity } from './ValidationSeverity';

export function issue(
  ruleId: string,
  code: string,
  message: string,
  severity: ValidationSeverity,
  path?: string,
  detail?: string
): ValidationIssue {
  return { ruleId, code, message, severity, path, detail };
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
