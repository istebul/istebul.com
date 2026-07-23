/**
 * İSTEBUL Business Decision Engine — RecommendationBuilderRuntime (PR-103C).
 *
 * PolicyResult üzerinden standart Recommendation nesneleri üretir.
 * Karar mekanizmasını değiştirmez; Action Plan oluşturmaz.
 */

import type { AnalysisResult } from '../../../analysis/models/AnalysisResult';
import type { DecisionContext } from '../../models/DecisionContext';
import type { DecisionOpportunity } from '../../models/DecisionOpportunity';
import type { DecisionPriorityLevel } from '../../models/DecisionPriority';
import type { DecisionRecommendation } from '../../models/DecisionRecommendation';
import type { DecisionRisk } from '../../models/DecisionRisk';
import type { IRecommendationBuilder } from '../../ports/IRecommendationBuilder';
import type { PolicyCategory } from '../../policies/runtime/PolicyDefinition';
import type { PolicyEvaluation } from '../../policies/runtime/PolicyEvaluation';
import type { PolicySeverity } from '../../policies/runtime/PolicyDefinition';
import {
  endDecisionStageTimer,
  nowMs,
  startDecisionStageTimer
} from '../../pipeline/runtime/DecisionTiming';
import type { RecommendationCategory } from './RecommendationCategory';
import type { RecommendationContext } from './RecommendationContext';
import { createRecommendationContext } from './RecommendationContext';
import type {
  RecommendationDefinition,
  RecommendationSeverity
} from './RecommendationDefinition';
import type { RecommendationRecord } from './RecommendationRecord';
import type { RecommendationRegistryRuntime } from './RecommendationRegistryRuntime';
import { createRecommendationRegistryRuntime } from './RecommendationRegistryRuntime';
import type {
  RecommendationResult,
  RecommendationSummary,
  RecommendationTelemetry,
  RecommendationWarning
} from './RecommendationResult';

function mapPolicySeverityToRecommendationSeverity(
  severity: PolicySeverity
): RecommendationSeverity {
  return severity;
}

function mapPolicySeverityToPriority(
  severity: PolicySeverity
): DecisionPriorityLevel {
  if (severity === 'INFO') {
    return 'dusuk';
  }
  if (severity === 'WARNING') {
    return 'orta';
  }
  if (severity === 'ERROR') {
    return 'yuksek';
  }
  return 'kritik';
}

function mapPolicyCategoryToRecommendationCategory(
  category: PolicyCategory
): RecommendationCategory {
  return category;
}

function resolveDefinition(
  registry: RecommendationRegistryRuntime,
  evaluation: PolicyEvaluation
): RecommendationDefinition {
  const fromPolicy = registry.getBySourcePolicyId(evaluation.definition.id);
  if (fromPolicy) {
    return fromPolicy;
  }

  const severity = mapPolicySeverityToRecommendationSeverity(
    evaluation.definition.severity
  );

  return {
    id: `rec-${evaluation.definition.id}`,
    code: evaluation.definition.id.toUpperCase().replace(/-/g, '_'),
    title: evaluation.definition.name,
    description: evaluation.definition.description,
    category: mapPolicyCategoryToRecommendationCategory(
      evaluation.definition.category
    ),
    defaultSeverity: severity,
    defaultPriority: mapPolicySeverityToPriority(evaluation.definition.severity),
    sourcePolicyId: evaluation.definition.id,
    order: evaluation.definition.order,
    enabled: true
  };
}

function resolveSourceFinding(
  evaluation: PolicyEvaluation,
  analysisResult?: AnalysisResult
): string | undefined {
  if (!analysisResult || !Array.isArray(analysisResult.findings)) {
    return undefined;
  }

  const operator = evaluation.definition.operator;
  if (operator !== 'finding-severity' && operator !== 'finding-rule') {
    return undefined;
  }

  const target = evaluation.definition.findingSeverity ?? 'kritik';
  const match =
    operator === 'finding-rule'
      ? analysisResult.findings.find(
          (item) => item.severity === target && Boolean(item.ruleId)
        )
      : analysisResult.findings.find((item) => item.severity === target);

  return match?.id;
}

function buildRecordFromTriggered(
  evaluation: PolicyEvaluation,
  definition: RecommendationDefinition,
  index: number,
  analysisResult?: AnalysisResult
): RecommendationRecord {
  const severity = mapPolicySeverityToRecommendationSeverity(
    evaluation.definition.severity
  );
  const priority =
    definition.defaultPriority ||
    mapPolicySeverityToPriority(evaluation.definition.severity);
  const id = `rec-${evaluation.definition.id}-${index}`;
  const title = definition.title || evaluation.definition.name;
  const description = evaluation.message || definition.description;
  const sourcePolicy = evaluation.definition.id;
  const sourceFinding = resolveSourceFinding(evaluation, analysisResult);
  const category = definition.category;

  const recommendation: DecisionRecommendation = {
    id,
    code: definition.code,
    title,
    description,
    priorityLevel: priority
  };

  return {
    id,
    title,
    description,
    category,
    severity,
    priority,
    sourcePolicy,
    sourceFinding,
    metadata: Object.freeze({
      outcome: evaluation.outcome,
      observedValue:
        evaluation.observedValue === undefined
          ? null
          : (evaluation.observedValue as string | number | boolean | null),
      threshold:
        evaluation.threshold === undefined ? null : evaluation.threshold,
      policyCategory: evaluation.definition.category,
      policySeverity: evaluation.definition.severity,
      sourceFinding: sourceFinding ?? null
    }),
    recommendation,
    informational: false
  };
}

function buildRecordFromSkipped(
  evaluation: PolicyEvaluation,
  index: number
): RecommendationRecord {
  const id = `rec-info-${evaluation.definition.id}-${index}`;
  const title = `Skipped: ${evaluation.definition.name}`;
  const description =
    evaluation.skipReason || evaluation.message || 'Politika atlandı.';

  const recommendation: DecisionRecommendation = {
    id,
    code: `SKIPPED_${evaluation.definition.id.toUpperCase().replace(/-/g, '_')}`,
    title,
    description,
    priorityLevel: 'dusuk'
  };

  return {
    id,
    title,
    description,
    category: 'informational',
    severity: 'INFO',
    priority: 'dusuk',
    sourcePolicy: evaluation.definition.id,
    sourceFinding: undefined,
    metadata: Object.freeze({
      outcome: evaluation.outcome,
      skipReason: evaluation.skipReason ?? null,
      observedValue:
        evaluation.observedValue === undefined
          ? null
          : (evaluation.observedValue as string | number | boolean | null)
    }),
    recommendation,
    informational: true
  };
}

function emptyResult(
  warnings: RecommendationWarning[],
  timing: { startedAt: string; endedAt: string; durationMs: number }
): RecommendationResult {
  const summary: RecommendationSummary = {
    recommendationCount: 0,
    informationalCount: 0,
    warningCount: warnings.length,
    categoryCounts: Object.freeze({}),
    severityCounts: Object.freeze({}),
    success: false
  };
  const telemetry: RecommendationTelemetry = {
    durationMs: timing.durationMs,
    startedAt: timing.startedAt,
    endedAt: timing.endedAt,
    recommendationCount: 0,
    categoryCount: 0,
    categoryDistribution: Object.freeze({}),
    severityDistribution: Object.freeze({}),
    warningCount: warnings.length
  };
  return {
    records: Object.freeze([]),
    recommendations: Object.freeze([]),
    summary,
    warnings: Object.freeze(warnings),
    telemetry
  };
}

/**
 * Recommendation Builder Runtime.
 */
export class RecommendationBuilderRuntime implements IRecommendationBuilder {
  private readonly registry: RecommendationRegistryRuntime;

  constructor(registry?: RecommendationRegistryRuntime) {
    this.registry = registry ?? createRecommendationRegistryRuntime(true);
  }

  getRegistry(): RecommendationRegistryRuntime {
    return this.registry;
  }

  /**
   * Foundation `IRecommendationBuilder.build`.
   * PolicyResult yoksa boş döner; zengin üretim için `compute` kullanın.
   */
  async build(
    context: DecisionContext,
    analysisResult: AnalysisResult,
    risks: readonly DecisionRisk[],
    opportunities: readonly DecisionOpportunity[]
  ): Promise<readonly DecisionRecommendation[]> {
    const result = this.compute(
      createRecommendationContext({
        decisionContext: context,
        analysisResult,
        risks,
        opportunities,
        locale: context.locale,
        includeSkippedInfo: false
      })
    );
    return result.recommendations;
  }

  /**
   * Detaylı runtime sonucu —
   * triggered → recommendation; passed → yok; skipped → opsiyonel bilgi.
   */
  compute(context: RecommendationContext): RecommendationResult {
    const timer = startDecisionStageTimer();
    const startMark = nowMs();
    const warnings: RecommendationWarning[] = [];
    const records: RecommendationRecord[] = [];

    const policyResult = context.policyResult;

    if (!policyResult) {
      const timing = endDecisionStageTimer(timer);
      warnings.push({
        code: 'POLICY_RESULT_MISSING',
        message:
          'Recommendation üretimi için PolicyResult gerekli.'
      });
      return emptyResult(warnings, {
        ...timing,
        durationMs:
          timing.durationMs || Math.max(0, Math.round(nowMs() - startMark))
      });
    }

    let index = 0;
    for (const evaluation of policyResult.triggeredPolicies) {
      const definition = resolveDefinition(this.registry, evaluation);
      if (!definition.enabled) {
        warnings.push({
          code: 'RECOMMENDATION_DEFINITION_DISABLED',
          message: `Recommendation tanımı pasif: ${definition.id}`,
          recommendationId: definition.id
        });
        continue;
      }
      records.push(
        buildRecordFromTriggered(
          evaluation,
          definition,
          index,
          context.analysisResult
        )
      );
      index += 1;
    }

    // Passed → recommendation oluşturma (bilinçli no-op)

    if (context.includeSkippedInfo !== false) {
      for (const evaluation of policyResult.skippedPolicies) {
        records.push(buildRecordFromSkipped(evaluation, index));
        index += 1;
      }
    }

    const categoryCounts: Partial<Record<RecommendationCategory, number>> = {};
    const severityCounts: Partial<Record<RecommendationSeverity, number>> = {};
    let informationalCount = 0;

    for (const record of records) {
      categoryCounts[record.category] =
        (categoryCounts[record.category] ?? 0) + 1;
      severityCounts[record.severity] =
        (severityCounts[record.severity] ?? 0) + 1;
      if (record.informational) {
        informationalCount += 1;
      }
    }

    const recommendations = records
      .filter((record) => !record.informational)
      .map((record) => record.recommendation);

    const timing = endDecisionStageTimer(timer);
    const categoryCount = Object.keys(categoryCounts).length;

    const summary: RecommendationSummary = {
      recommendationCount: recommendations.length,
      informationalCount,
      warningCount: warnings.length,
      categoryCounts: Object.freeze(categoryCounts),
      severityCounts: Object.freeze(severityCounts),
      success:
        recommendations.length > 0 ||
        informationalCount > 0 ||
        Boolean(policyResult)
    };

    const telemetry: RecommendationTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      recommendationCount: recommendations.length,
      categoryCount,
      categoryDistribution: Object.freeze({ ...categoryCounts }),
      severityDistribution: Object.freeze({ ...severityCounts }),
      warningCount: warnings.length
    };

    return {
      records: Object.freeze(records),
      recommendations: Object.freeze(recommendations),
      summary,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createRecommendationBuilderRuntime(
  registry?: RecommendationRegistryRuntime
): RecommendationBuilderRuntime {
  return new RecommendationBuilderRuntime(registry);
}

export default RecommendationBuilderRuntime;
