/**
 * İSTEBUL Business Decision Engine — Policy Engine runtime sonucu (PR-103B).
 */

import type { PolicyEvaluation } from './PolicyEvaluation';

/**
 * Policy uyarısı.
 */
export interface PolicyWarning {
  code: string;
  message: string;
  policyId?: string;
}

/**
 * Policy yürütme özeti.
 */
export interface PolicySummary {
  evaluatedCount: number;
  triggeredCount: number;
  passedCount: number;
  skippedCount: number;
  success: boolean;
}

/**
 * Policy telemetrisi.
 */
export interface PolicyTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  evaluatedPolicyCount: number;
  triggeredPolicyCount: number;
  passedPolicyCount: number;
  skippedPolicyCount: number;
  warningCount: number;
}

/**
 * Policy Engine Runtime çıktısı.
 */
export interface PolicyResult {
  /** Tüm değerlendirmeler */
  evaluations: readonly PolicyEvaluation[];
  /** Tetiklenen politikalar */
  triggeredPolicies: readonly PolicyEvaluation[];
  /** Geçen politikalar */
  passedPolicies: readonly PolicyEvaluation[];
  /** Atlanan politikalar */
  skippedPolicies: readonly PolicyEvaluation[];
  /** Özet */
  summary: PolicySummary;
  /** Uyarılar */
  warnings: readonly PolicyWarning[];
  /** Telemetri */
  telemetry: PolicyTelemetry;
}

/** Pipeline bag anahtarı — Decision Engine */
export const PIPELINE_BAG_POLICY_RUNTIME_RESULT_KEY =
  'policyRuntimeResult' as const;
