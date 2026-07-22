/**
 * İSTEBUL Core — shared execution validation / error contracts (PR-901A).
 *
 * Type-only. Import-engine ValidationIssue (ruleId/path/detail) is out of scope.
 */

/**
 * Canonical severity for identity / admin validation issues.
 */
export type ExecutionIssueSeverity = 'warning' | 'error';

/**
 * Shared validation issue shape used across E2E integration results.
 */
export interface ValidationIssueBase {
  code: string;
  message: string;
  severity: ExecutionIssueSeverity;
}

/**
 * Alias — preferred name for execution-layer validation issues.
 */
export type ExecutionValidationIssue = ValidationIssueBase;
