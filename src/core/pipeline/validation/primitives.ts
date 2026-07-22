/**
 * İSTEBUL Core — shared validation primitives (PR-901B).
 *
 * Full domain validators stay in domain packages; these helpers reduce
 * duplicated locale / optional-string / provider checks.
 */

import type { ValidationIssueBase } from '../../execution/index';

const VALID_LOCALES = new Set(['tr', 'en']);

/**
 * Returns whether a locale string is in the supported set.
 */
export function isValidExecutionLocale(locale: string): boolean {
  return VALID_LOCALES.has(locale);
}

/**
 * Appends INVALID_LOCALE when locale is unsupported.
 */
export function pushInvalidLocaleIssue(
  issues: ValidationIssueBase[],
  locale: string
): void {
  if (!isValidExecutionLocale(locale)) {
    issues.push({
      code: 'INVALID_LOCALE',
      message: `Geçersiz locale: ${String(locale)}`,
      severity: 'error'
    });
  }
}

/**
 * Appends an error when an optional string field is present but empty.
 */
export function pushEmptyOptionalStringIssue(
  issues: ValidationIssueBase[],
  value: unknown,
  code: string,
  message: string
): void {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push({ code, message, severity: 'error' });
  }
}

/**
 * Appends PROVIDER_CONTEXT_REQUIRED when both context and id are missing.
 */
export function pushProviderContextRequiredIssue(
  issues: ValidationIssueBase[],
  providerContext: unknown,
  providerId: unknown
): void {
  if (!providerContext && !providerId) {
    issues.push({
      code: 'PROVIDER_CONTEXT_REQUIRED',
      message: 'providerContext veya providerId zorunludur.',
      severity: 'error'
    });
  }
}

/**
 * Appends EMPTY_PROVIDER_CONTEXT_ID when providerContext.providerId is empty.
 */
export function pushEmptyProviderContextIdIssue(
  issues: ValidationIssueBase[],
  providerContext: { providerId?: unknown } | null | undefined
): void {
  if (!providerContext) {
    return;
  }
  if (
    !providerContext.providerId ||
    typeof providerContext.providerId !== 'string' ||
    providerContext.providerId.trim() === ''
  ) {
    issues.push({
      code: 'EMPTY_PROVIDER_CONTEXT_ID',
      message: 'providerContext.providerId zorunludur.',
      severity: 'error'
    });
  }
}
