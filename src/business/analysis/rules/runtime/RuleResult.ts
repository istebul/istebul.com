/**
 * İSTEBUL Business Analysis Engine — Rule Engine runtime sonucu (PR-102C).
 */

import type { AnalysisFinding } from '../../models/AnalysisFinding';
import type { RuleEvaluation } from './RuleEvaluation';

/**
 * Rule uyarısı.
 */
export interface RuleWarning {
  code: string;
  message: string;
  ruleId?: string;
}

/**
 * Rule yürütme özeti.
 */
export interface RuleSummary {
  evaluatedCount: number;
  triggeredCount: number;
  passedCount: number;
  skippedCount: number;
  success: boolean;
}

/**
 * Rule telemetrisi.
 */
export interface RuleTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  evaluatedRuleCount: number;
  triggeredRuleCount: number;
  passedRuleCount: number;
  skippedRuleCount: number;
  warningCount: number;
}

/**
 * Rule Engine Runtime çıktısı.
 */
export interface RuleResult {
  /** Tüm değerlendirmeler */
  evaluations: readonly RuleEvaluation[];
  /** Tetiklenen kurallar */
  triggeredRules: readonly RuleEvaluation[];
  /** Geçen kurallar */
  passedRules: readonly RuleEvaluation[];
  /** Atlanan kurallar */
  skippedRules: readonly RuleEvaluation[];
  /** Özet */
  summary: RuleSummary;
  /** Uyarılar */
  warnings: readonly RuleWarning[];
  /** Foundation uyumlu bulgular — yalnızca triggered */
  findings: readonly AnalysisFinding[];
  /** Telemetri */
  telemetry: RuleTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_RULE_RUNTIME_RESULT_KEY = 'ruleRuntimeResult' as const;
