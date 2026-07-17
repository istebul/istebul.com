/**
 * İSTEBUL Business Import Engine — ValidationRuntime (PR-101C).
 *
 * Yalnızca yapısal doğrulama. Schema detection / CSV / AI yok.
 */

import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../pipeline/runtime/timing';
import type { ValidationContext } from './ValidationContext';
import type { ValidationIssue } from './ValidationIssue';
import type { ValidationRegistryRuntime } from './ValidationRegistryRuntime';
import type {
  ValidationResultRuntime,
  ValidationTelemetry
} from './ValidationResultRuntime';
import {
  isBlockingSeverity,
  type ValidationSeverity
} from './ValidationSeverity';
import { createValidationRegistryRuntime } from './ValidationRegistryRuntime';

function emptyCounts(): Record<ValidationSeverity, number> {
  return { INFO: 0, WARNING: 0, ERROR: 0, CRITICAL: 0 };
}

/**
 * Validation Runtime orchestrator.
 */
export class ValidationRuntime {
  private readonly registry: ValidationRegistryRuntime;

  constructor(registry?: ValidationRegistryRuntime) {
    this.registry = registry ?? createValidationRegistryRuntime(true);
  }

  getRegistry(): ValidationRegistryRuntime {
    return this.registry;
  }

  /**
   * Kayıtlı kuralları çalıştırır; telemetri üretir.
   */
  validate(context: ValidationContext): ValidationResultRuntime {
    const timer = startStageTimer();
    const startMark = nowMs();
    const rules = this.registry.getAll();
    const issues: ValidationIssue[] = [];
    let rulesPassed = 0;
    let rulesFailed = 0;

    for (const rule of rules) {
      let ruleIssues: readonly ValidationIssue[] = [];
      try {
        ruleIssues = rule.validate(context) ?? [];
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Kural yürütme hatası.';
        ruleIssues = [
          {
            ruleId: rule.id,
            code: 'RULE_EXECUTION_FAILED',
            message: `Kural çalıştırılamadı: ${rule.name}`,
            severity: 'CRITICAL',
            detail: message
          }
        ];
      }
      if (ruleIssues.length === 0) {
        rulesPassed += 1;
      } else {
        rulesFailed += 1;
        issues.push(...ruleIssues);
      }
    }

    const issueCounts = emptyCounts();
    for (const item of issues) {
      issueCounts[item.severity] += 1;
    }

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: ValidationTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      rulesExecuted: rules.length,
      rulesPassed,
      rulesFailed,
      issueCounts
    };

    const isValid = !issues.some((i) => isBlockingSeverity(i.severity));

    return {
      isValid,
      issues: Object.freeze(issues),
      telemetry
    };
  }
}

export function createValidationRuntime(
  registry?: ValidationRegistryRuntime
): ValidationRuntime {
  return new ValidationRuntime(registry);
}

export default ValidationRuntime;
