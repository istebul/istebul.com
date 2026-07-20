/**
 * İSTEBUL Business Decision Engine — PolicyEngineRuntime (PR-103B).
 *
 * AnalysisResult üzerinde iş politikalarını değerlendirir.
 * Öneri üretmez, aksiyon planı oluşturmaz.
 */

import type { AnalysisResult } from '../../../analysis/models/AnalysisResult';
import type { AnalysisFinding } from '../../../analysis/models/AnalysisFinding';
import type { KPIResult as FoundationKPIResult } from '../../../analysis/models/KPIResult';
import {
  endDecisionStageTimer,
  nowMs,
  startDecisionStageTimer
} from '../../pipeline/runtime/DecisionTiming';
import type { PolicyContext } from './PolicyContext';
import type { PolicyDefinition } from './PolicyDefinition';
import type { PolicyEvaluation } from './PolicyEvaluation';
import type { PolicyRegistryRuntime } from './PolicyRegistryRuntime';
import { createPolicyRegistryRuntime } from './PolicyRegistryRuntime';
import type {
  PolicyResult,
  PolicyTelemetry,
  PolicyWarning
} from './PolicyResult';
import { BUILTIN_POLICY_THRESHOLDS } from './builtinDefinitions';

function toNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function findKpiValue(
  kpiResults: readonly FoundationKPIResult[],
  kpiId: string
): FoundationKPIResult | undefined {
  return kpiResults.find((item) => item.kpiId === kpiId);
}

/**
 * Veri kalitesi skoru (0–100).
 * Öncelik: AnalysisScore id=data-quality → filled-value-ratio KPI → türetilmiş skor.
 */
function resolveDataQualityScore(analysisResult: AnalysisResult): {
  score: number | null;
  skipReason?: string;
} {
  const qualityScore = analysisResult.scores?.find(
    (item) => item.id === 'data-quality' || item.id === 'quality'
  );
  if (qualityScore && typeof qualityScore.value === 'number') {
    const max = qualityScore.maxValue > 0 ? qualityScore.maxValue : 100;
    return {
      score: Math.round((qualityScore.value / max) * 10000) / 100
    };
  }

  const filled = findKpiValue(analysisResult.kpiResults ?? [], 'filled-value-ratio');
  if (filled && !filled.unavailableReason) {
    const ratio = toNumber(filled.value);
    if (ratio !== null) {
      return { score: Math.round(ratio * 10000) / 100 };
    }
  }

  const empty = findKpiValue(analysisResult.kpiResults ?? [], 'empty-value-ratio');
  if (empty && !empty.unavailableReason) {
    const ratio = toNumber(empty.value);
    if (ratio !== null) {
      return { score: Math.round((1 - ratio) * 10000) / 100 };
    }
  }

  const stats = analysisResult.statistics;
  if (stats && typeof stats.rowCount === 'number' && stats.rowCount > 0) {
    const findingPenalty = Math.min(
      40,
      (stats.findingCount ?? 0) * 10
    );
    return { score: Math.max(0, 100 - findingPenalty) };
  }

  if (stats && stats.rowCount === 0) {
    return { score: 0 };
  }

  return {
    score: null,
    skipReason: 'Veri kalitesi skoru hesaplanamadı.'
  };
}

function hasRequiredMetadata(analysisResult: AnalysisResult): {
  present: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!analysisResult.requestId || typeof analysisResult.requestId !== 'string') {
    missing.push('requestId');
  }
  if (!analysisResult.datasetId || typeof analysisResult.datasetId !== 'string') {
    missing.push('datasetId');
  }
  if (!analysisResult.statistics || typeof analysisResult.statistics !== 'object') {
    missing.push('statistics');
  }
  if (
    !analysisResult.completedAt ||
    typeof analysisResult.completedAt !== 'string'
  ) {
    missing.push('completedAt');
  }
  return { present: missing.length === 0, missing };
}

function countFindingsBySeverity(
  findings: readonly AnalysisFinding[],
  severity: 'bilgi' | 'uyari' | 'kritik'
): number {
  return findings.filter((item) => item.severity === severity).length;
}

function countRuleSourcedFindings(
  findings: readonly AnalysisFinding[],
  severity?: 'bilgi' | 'uyari' | 'kritik'
): number {
  return findings.filter((item) => {
    if (!item.ruleId) {
      return false;
    }
    if (severity && item.severity !== severity) {
      return false;
    }
    return true;
  }).length;
}

function evaluateDefinition(
  definition: PolicyDefinition,
  analysisResult: AnalysisResult
): Omit<PolicyEvaluation, 'durationMs'> {
  if (!definition.enabled) {
    return {
      definition,
      outcome: 'skipped',
      message: 'Politika pasif; değerlendirme atlandı.',
      skipReason: 'Policy disabled.',
      threshold: definition.threshold
    };
  }

  if (definition.id === 'minimum-data-quality-score') {
    const resolved = resolveDataQualityScore(analysisResult);
    if (resolved.skipReason || resolved.score === null) {
      return {
        definition,
        outcome: 'skipped',
        observedValue: resolved.score,
        threshold: definition.threshold,
        message: resolved.skipReason ?? 'Skor yok.',
        skipReason: resolved.skipReason ?? 'Score unavailable.'
      };
    }
    const threshold =
      definition.threshold ?? BUILTIN_POLICY_THRESHOLDS.MINIMUM_DATA_QUALITY_SCORE;
    const violated = resolved.score < threshold;
    return {
      definition,
      outcome: violated ? 'triggered' : 'passed',
      observedValue: resolved.score,
      threshold,
      message: violated
        ? `Veri kalitesi skoru eşiğin altında: ${resolved.score} < ${threshold}`
        : `Veri kalitesi skoru yeterli: ${resolved.score} (eşik ${threshold})`
    };
  }

  if (definition.id === 'minimum-dataset-size') {
    const stats = analysisResult.statistics;
    if (!stats || typeof stats !== 'object') {
      return {
        definition,
        outcome: 'skipped',
        message: 'statistics yok; dataset boyutu değerlendirilemedi.',
        skipReason: 'statistics missing.',
        threshold: definition.threshold
      };
    }
    const minEntities =
      definition.threshold ?? BUILTIN_POLICY_THRESHOLDS.MINIMUM_ENTITY_COUNT;
    const minRows = BUILTIN_POLICY_THRESHOLDS.MINIMUM_ROW_COUNT;
    const entityCount = stats.entityCount ?? 0;
    const rowCount = stats.rowCount ?? 0;
    const violated = entityCount < minEntities || rowCount < minRows;
    return {
      definition,
      outcome: violated ? 'triggered' : 'passed',
      observedValue: entityCount,
      threshold: minEntities,
      message: violated
        ? `Dataset boyutu yetersiz: entity=${entityCount}, row=${rowCount}`
        : `Dataset boyutu yeterli: entity=${entityCount}, row=${rowCount}`
    };
  }

  if (definition.operator === 'finding-severity') {
    const target = definition.findingSeverity ?? 'kritik';
    const findings = Array.isArray(analysisResult.findings)
      ? analysisResult.findings
      : [];
    const count = countFindingsBySeverity(findings, target);
    const triggered = count > 0;
    return {
      definition,
      outcome: triggered ? 'triggered' : 'passed',
      observedValue: count,
      message: triggered
        ? `${count} adet '${target}' bulgu mevcut.`
        : `'${target}' bulgu yok.`
    };
  }

  if (definition.operator === 'finding-rule') {
    const target = definition.findingSeverity ?? 'kritik';
    const findings = Array.isArray(analysisResult.findings)
      ? analysisResult.findings
      : [];
    const count = countRuleSourcedFindings(findings, target);
    const triggered = count > 0;
    return {
      definition,
      outcome: triggered ? 'triggered' : 'passed',
      observedValue: count,
      message: triggered
        ? `${count} adet kural kaynaklı '${target}' bulgu mevcut.`
        : `Kural kaynaklı '${target}' bulgu yok.`
    };
  }

  if (definition.operator === 'present') {
    const meta = hasRequiredMetadata(analysisResult);
    return {
      definition,
      outcome: meta.present ? 'passed' : 'triggered',
      observedValue: meta.present,
      message: meta.present
        ? 'Zorunlu metadata mevcut.'
        : `Eksik metadata: ${meta.missing.join(', ')}`
    };
  }

  return {
    definition,
    outcome: 'skipped',
    message: 'Politika operatörü desteklenmiyor.',
    skipReason: `Unsupported operator: ${definition.operator}`,
    threshold: definition.threshold
  };
}

/**
 * Policy Engine Runtime.
 */
export class PolicyEngineRuntime {
  private readonly registry: PolicyRegistryRuntime;

  constructor(registry?: PolicyRegistryRuntime) {
    this.registry = registry ?? createPolicyRegistryRuntime(true);
  }

  getRegistry(): PolicyRegistryRuntime {
    return this.registry;
  }

  /**
   * Detaylı runtime sonucu — yalnızca politika değerlendirmesi.
   */
  compute(context: PolicyContext): PolicyResult {
    const timer = startDecisionStageTimer();
    const startMark = nowMs();
    const warnings: PolicyWarning[] = [];

    if (!context?.analysisResult || typeof context.analysisResult !== 'object') {
      const timing = endDecisionStageTimer(timer);
      warnings.push({
        code: 'ANALYSIS_RESULT_MISSING',
        message: 'Policy değerlendirmesi için AnalysisResult zorunludur.'
      });
      return {
        evaluations: Object.freeze([]),
        triggeredPolicies: Object.freeze([]),
        passedPolicies: Object.freeze([]),
        skippedPolicies: Object.freeze([]),
        summary: {
          evaluatedCount: 0,
          triggeredCount: 0,
          passedCount: 0,
          skippedCount: 0,
          success: false
        },
        warnings: Object.freeze(warnings),
        telemetry: {
          durationMs:
            timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
          startedAt: timing.startedAt,
          endedAt: timing.endedAt,
          evaluatedPolicyCount: 0,
          triggeredPolicyCount: 0,
          passedPolicyCount: 0,
          skippedPolicyCount: 0,
          warningCount: warnings.length
        }
      };
    }

    const requestedIds =
      context.policyIds && context.policyIds.length > 0
        ? [...context.policyIds]
        : this.registry.getEnabled().map((item) => item.id);

    const evaluations: PolicyEvaluation[] = [];
    const triggered: PolicyEvaluation[] = [];
    const passed: PolicyEvaluation[] = [];
    const skipped: PolicyEvaluation[] = [];

    for (const policyId of requestedIds) {
      const policyTimer = startDecisionStageTimer();
      const definition = this.registry.getById(policyId);

      if (!definition) {
        const timing = endDecisionStageTimer(policyTimer);
        warnings.push({
          code: 'POLICY_NOT_REGISTERED',
          message: `Politika kayıtlı değil: ${policyId}`,
          policyId
        });
        const evaluation: PolicyEvaluation = {
          definition: {
            id: policyId,
            name: policyId,
            description: 'Kayıtlı olmayan politika',
            category: 'analysis',
            severity: 'INFO',
            operator: 'eq',
            order: Number.MAX_SAFE_INTEGER,
            enabled: true
          },
          outcome: 'skipped',
          message: 'Politika registry içinde bulunamadı.',
          skipReason: 'Policy not registered.',
          durationMs: timing.durationMs
        };
        evaluations.push(evaluation);
        skipped.push(evaluation);
        continue;
      }

      const partial = evaluateDefinition(definition, context.analysisResult);
      const timing = endDecisionStageTimer(policyTimer);
      const evaluation: PolicyEvaluation = {
        ...partial,
        durationMs: timing.durationMs
      };
      evaluations.push(evaluation);

      if (evaluation.outcome === 'triggered') {
        triggered.push(evaluation);
      } else if (evaluation.outcome === 'passed') {
        passed.push(evaluation);
      } else {
        skipped.push(evaluation);
      }
    }

    const timing = endDecisionStageTimer(timer);
    const telemetry: PolicyTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      evaluatedPolicyCount: evaluations.length,
      triggeredPolicyCount: triggered.length,
      passedPolicyCount: passed.length,
      skippedPolicyCount: skipped.length,
      warningCount: warnings.length
    };

    return {
      evaluations: Object.freeze(evaluations),
      triggeredPolicies: Object.freeze(triggered),
      passedPolicies: Object.freeze(passed),
      skippedPolicies: Object.freeze(skipped),
      summary: {
        evaluatedCount: evaluations.length,
        triggeredCount: triggered.length,
        passedCount: passed.length,
        skippedCount: skipped.length,
        success: evaluations.length > 0 && skipped.length < evaluations.length
      },
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createPolicyEngineRuntime(
  registry?: PolicyRegistryRuntime
): PolicyEngineRuntime {
  return new PolicyEngineRuntime(registry);
}

export default PolicyEngineRuntime;
