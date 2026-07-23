/**
 * İSTEBUL Business Decision Engine — DecisionSummaryRuntime (PR-103E).
 *
 * PolicyResult, RecommendationResult ve ActionPlanResult üzerinden nesnel
 * Decision Summary üretir. AI, narrative report veya document generation yok.
 */

import type { DecisionPriorityLevel } from '../../models/DecisionPriority';
import type { DecisionSummary } from '../../models/DecisionSummary';
import type { ActionPlanResult } from '../../actionPlans/runtime/ActionPlanResult';
import type { PolicyResult } from '../../policies/runtime/PolicyResult';
import type { RecommendationResult } from '../../recommendations/runtime/RecommendationResult';
import type { RecommendationSeverity } from '../../recommendations/runtime/RecommendationDefinition';
import {
  endDecisionStageTimer,
  nowMs,
  startDecisionStageTimer
} from '../../pipeline/runtime/DecisionTiming';
import type { DecisionSummaryContext } from './DecisionSummaryContext';
import type {
  DecisionSummaryMetadata,
  DecisionSummaryRecord
} from './DecisionSummaryRecord';
import type { DecisionSummaryRegistryRuntime } from './DecisionSummaryRegistryRuntime';
import { createDecisionSummaryRegistryRuntime } from './DecisionSummaryRegistryRuntime';
import type {
  DecisionSummaryResult,
  DecisionSummaryTelemetry,
  DecisionSummaryWarning
} from './DecisionSummaryResult';
import type {
  DecisionSummarySection,
  DecisionSummarySectionId
} from './DecisionSummarySection';
import { DECISION_SUMMARY_SECTION_LABELS } from './DecisionSummarySection';

function section(
  id: DecisionSummarySectionId,
  order: number,
  items: string[],
  metrics: Record<string, string | number | boolean | null>
): DecisionSummarySection {
  return {
    id,
    title: DECISION_SUMMARY_SECTION_LABELS[id],
    items: Object.freeze(items),
    metrics: Object.freeze(metrics),
    order
  };
}

function emptySeverityCounts(): Record<RecommendationSeverity, number> {
  return {
    INFO: 0,
    WARNING: 0,
    ERROR: 0,
    CRITICAL: 0
  };
}

function emptyPriorityCounts(): Record<DecisionPriorityLevel, number> {
  return {
    dusuk: 0,
    orta: 0,
    yuksek: 0,
    kritik: 0
  };
}

function buildSeverityDistribution(
  recommendationResult: RecommendationResult | undefined
): Record<RecommendationSeverity, number> {
  const counts = emptySeverityCounts();
  const fromSummary = recommendationResult?.summary.severityCounts;
  if (fromSummary) {
    for (const key of Object.keys(counts) as RecommendationSeverity[]) {
      counts[key] = fromSummary[key] ?? 0;
    }
  }
  return counts;
}

function buildPriorityDistribution(
  recommendationResult: RecommendationResult | undefined,
  actionPlanResult: ActionPlanResult | undefined
): Record<DecisionPriorityLevel, number> {
  const counts = emptyPriorityCounts();

  if (recommendationResult) {
    for (const record of recommendationResult.records) {
      if (record.informational) {
        continue;
      }
      counts[record.priority] = (counts[record.priority] ?? 0) + 1;
    }
  }

  if (actionPlanResult?.summary.priorityCounts) {
    for (const key of Object.keys(counts) as DecisionPriorityLevel[]) {
      counts[key] += actionPlanResult.summary.priorityCounts[key] ?? 0;
    }
  }

  return counts;
}

function buildDecisionMetadataSection(
  context: DecisionSummaryContext,
  order: number
): DecisionSummarySection {
  const decisionId = context.decisionContext?.decisionId ?? null;
  const requestId = context.request?.id ?? null;
  const analysisRequestId =
    context.request?.analysisRequestId ??
    context.decisionContext?.analysisResult?.requestId ??
    null;
  const datasetId =
    context.request?.datasetId ??
    context.decisionContext?.analysisResult?.datasetId ??
    null;
  const locale = context.locale;
  const items = [
    `Decision ID: ${decisionId ?? 'n/a'}`,
    `Request ID: ${requestId ?? 'n/a'}`,
    `Analysis Request ID: ${analysisRequestId ?? 'n/a'}`,
    `Dataset ID: ${datasetId ?? 'n/a'}`,
    `Locale: ${locale}`
  ];
  return section('decision-metadata', order, items, {
    decisionId,
    requestId,
    analysisRequestId,
    datasetId,
    locale
  });
}

function buildPolicySummarySection(
  policyResult: PolicyResult | undefined,
  order: number
): DecisionSummarySection {
  const evaluated = policyResult?.summary.evaluatedCount ?? 0;
  const triggered = policyResult?.summary.triggeredCount ?? 0;
  const passed = policyResult?.summary.passedCount ?? 0;
  const skipped = policyResult?.summary.skippedCount ?? 0;
  const success = policyResult?.summary.success ?? false;
  const items = [
    `Evaluated policies: ${evaluated}`,
    `Triggered policies: ${triggered}`,
    `Passed policies: ${passed}`,
    `Skipped policies: ${skipped}`
  ];
  return section('policy-summary', order, items, {
    evaluatedCount: evaluated,
    triggeredCount: triggered,
    passedCount: passed,
    skippedCount: skipped,
    success,
    present: policyResult !== undefined
  });
}

function buildRecommendationSummarySection(
  recommendationResult: RecommendationResult | undefined,
  order: number
): DecisionSummarySection {
  const recommendationCount =
    recommendationResult?.summary.recommendationCount ?? 0;
  const informational =
    recommendationResult?.summary.informationalCount ?? 0;
  const warningCount = recommendationResult?.summary.warningCount ?? 0;
  const success = recommendationResult?.summary.success ?? false;
  const items = [
    `Recommendations: ${recommendationCount}`,
    `Informational records: ${informational}`,
    `Recommendation warnings: ${warningCount}`
  ];
  return section('recommendation-summary', order, items, {
    recommendationCount,
    informationalCount: informational,
    warningCount,
    success,
    present: recommendationResult !== undefined
  });
}

function buildActionPlanSummarySection(
  actionPlanResult: ActionPlanResult | undefined,
  order: number
): DecisionSummarySection {
  const planCount = actionPlanResult?.summary.actionPlanCount ?? 0;
  const stepCount = actionPlanResult?.summary.stepCount ?? 0;
  const informational =
    actionPlanResult?.summary.informationalCount ?? 0;
  const warningCount = actionPlanResult?.summary.warningCount ?? 0;
  const success = actionPlanResult?.summary.success ?? false;
  const items = [
    `Action plans: ${planCount}`,
    `Action steps: ${stepCount}`,
    `Informational records: ${informational}`,
    `Action plan warnings: ${warningCount}`
  ];
  return section('action-plan-summary', order, items, {
    actionPlanCount: planCount,
    stepCount,
    informationalCount: informational,
    warningCount,
    success,
    present: actionPlanResult !== undefined
  });
}

function buildSeverityDistributionSection(
  severityCounts: Record<RecommendationSeverity, number>,
  order: number
): DecisionSummarySection {
  const items = [
    `INFO: ${severityCounts.INFO}`,
    `WARNING: ${severityCounts.WARNING}`,
    `ERROR: ${severityCounts.ERROR}`,
    `CRITICAL: ${severityCounts.CRITICAL}`
  ];
  return section('severity-distribution', order, items, { ...severityCounts });
}

function buildPriorityDistributionSection(
  priorityCounts: Record<DecisionPriorityLevel, number>,
  order: number
): DecisionSummarySection {
  const items = [
    `dusuk: ${priorityCounts.dusuk}`,
    `orta: ${priorityCounts.orta}`,
    `yuksek: ${priorityCounts.yuksek}`,
    `kritik: ${priorityCounts.kritik}`
  ];
  return section('priority-distribution', order, items, { ...priorityCounts });
}

function buildExecutionSummarySection(
  context: DecisionSummaryContext,
  sectionsBuilt: number,
  order: number
): DecisionSummarySection {
  const policyDuration = context.policyResult?.telemetry.durationMs ?? 0;
  const recommendationDuration =
    context.recommendationResult?.telemetry.durationMs ?? 0;
  const actionPlanDuration =
    context.actionPlanResult?.telemetry.durationMs ?? 0;
  const items = [
    `Sections built: ${sectionsBuilt}`,
    `Policy durationMs: ${policyDuration}`,
    `Recommendation durationMs: ${recommendationDuration}`,
    `Action plan durationMs: ${actionPlanDuration}`
  ];
  return section('execution-summary', order, items, {
    sectionsBuilt,
    policyDurationMs: policyDuration,
    recommendationDurationMs: recommendationDuration,
    actionPlanDurationMs: actionPlanDuration
  });
}

function buildHeadline(sections: readonly DecisionSummarySection[]): string {
  const policy = sections.find((item) => item.id === 'policy-summary');
  const recommendation = sections.find(
    (item) => item.id === 'recommendation-summary'
  );
  const actionPlan = sections.find((item) => item.id === 'action-plan-summary');
  const triggered = Number(policy?.metrics.triggeredCount ?? 0);
  const recommendationCount = Number(
    recommendation?.metrics.recommendationCount ?? 0
  );
  const stepCount = Number(actionPlan?.metrics.stepCount ?? 0);
  return `Karar özeti: ${triggered} tetiklenen politika, ${recommendationCount} öneri, ${stepCount} aksiyon.`;
}

function buildHighlights(
  sections: readonly DecisionSummarySection[]
): string[] {
  const highlights: string[] = [];
  for (const sectionItem of sections) {
    if (sectionItem.items.length > 0) {
      highlights.push(`${sectionItem.title}: ${sectionItem.items[0]}`);
    }
  }
  return highlights;
}

function buildCautions(
  severityCounts: Record<RecommendationSeverity, number>,
  hasAnyInput: boolean
): readonly string[] | undefined {
  const cautions: string[] = [];
  if (!hasAnyInput) {
    cautions.push('EMPTY_DECISION_INPUTS');
  }
  if (severityCounts.CRITICAL > 0) {
    cautions.push('CRITICAL_RECOMMENDATIONS_PRESENT');
  }
  if (severityCounts.ERROR > 0) {
    cautions.push('ERROR_RECOMMENDATIONS_PRESENT');
  }
  return cautions.length > 0 ? Object.freeze(cautions) : undefined;
}

/**
 * Decision Summary Runtime.
 */
export class DecisionSummaryRuntime {
  private readonly registry: DecisionSummaryRegistryRuntime;

  constructor(registry?: DecisionSummaryRegistryRuntime) {
    this.registry = registry ?? createDecisionSummaryRegistryRuntime(true);
  }

  getRegistry(): DecisionSummaryRegistryRuntime {
    return this.registry;
  }

  /**
   * Detaylı runtime sonucu — bölümler + metadata + telemetri.
   */
  compute(context: DecisionSummaryContext): DecisionSummaryResult {
    const timer = startDecisionStageTimer();
    const startMark = nowMs();
    const warnings: DecisionSummaryWarning[] = [];

    const enabled = this.registry.getEnabled();
    if (enabled.length === 0) {
      warnings.push({
        code: 'NO_SECTIONS_ENABLED',
        message: 'Aktif Decision Summary bölümü yok.'
      });
    }

    const hasAnyInput = Boolean(
      context.policyResult ||
        context.recommendationResult ||
        context.actionPlanResult
    );

    if (!hasAnyInput) {
      warnings.push({
        code: 'EMPTY_DECISION_INPUTS',
        message:
          'Policy/Recommendation/ActionPlan runtime sonuçları yok; boş karar özeti üretildi.'
      });
    }

    const severityCounts = buildSeverityDistribution(
      context.recommendationResult
    );
    const priorityCounts = buildPriorityDistribution(
      context.recommendationResult,
      context.actionPlanResult
    );

    const sections: DecisionSummarySection[] = [];
    let order = 1;

    for (const definition of enabled) {
      switch (definition.id) {
        case 'decision-metadata':
          sections.push(buildDecisionMetadataSection(context, order));
          break;
        case 'policy-summary':
          sections.push(
            buildPolicySummarySection(context.policyResult, order)
          );
          break;
        case 'recommendation-summary':
          sections.push(
            buildRecommendationSummarySection(
              context.recommendationResult,
              order
            )
          );
          break;
        case 'action-plan-summary':
          sections.push(
            buildActionPlanSummarySection(context.actionPlanResult, order)
          );
          break;
        case 'severity-distribution':
          sections.push(
            buildSeverityDistributionSection(severityCounts, order)
          );
          break;
        case 'priority-distribution':
          sections.push(
            buildPriorityDistributionSection(priorityCounts, order)
          );
          break;
        case 'execution-summary':
          sections.push(
            buildExecutionSummarySection(context, sections.length + 1, order)
          );
          break;
        default:
          warnings.push({
            code: 'UNKNOWN_SECTION',
            message: `Bilinmeyen Decision Summary bölümü: ${definition.id}`
          });
          break;
      }
      order += 1;
    }

    const executionIndex = sections.findIndex(
      (item) => item.id === 'execution-summary'
    );
    if (executionIndex >= 0) {
      sections[executionIndex] = buildExecutionSummarySection(
        context,
        sections.length,
        sections[executionIndex].order
      );
    }

    const frozenSections = Object.freeze(sections);
    const decisionSummary: DecisionSummary = {
      headline: buildHeadline(frozenSections),
      highlights: Object.freeze(buildHighlights(frozenSections)),
      cautions: buildCautions(severityCounts, hasAnyInput)
    };

    const sourceStages: string[] = [];
    if (context.policyResult) {
      sourceStages.push('risk-degerlendirme');
    }
    if (context.recommendationResult) {
      sourceStages.push('oneri-olusturma');
    }
    if (context.actionPlanResult) {
      sourceStages.push('oncelik-hesaplama');
    }

    const metadata: DecisionSummaryMetadata = {
      decisionId: context.decisionContext?.decisionId,
      analysisRequestId:
        context.request?.analysisRequestId ??
        context.decisionContext?.analysisResult?.requestId,
      datasetId:
        context.request?.datasetId ??
        context.decisionContext?.analysisResult?.datasetId,
      locale: context.locale,
      generatedAt: new Date().toISOString(),
      sourceStages: Object.freeze(sourceStages)
    };

    const record: DecisionSummaryRecord = {
      decisionSummary,
      sections: frozenSections,
      metadata
    };

    const timing = endDecisionStageTimer(timer);
    const telemetry: DecisionSummaryTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      sectionCount: frozenSections.length,
      policyTotals: context.policyResult?.summary.evaluatedCount ?? 0,
      recommendationTotals:
        context.recommendationResult?.summary.recommendationCount ?? 0,
      actionTotals: context.actionPlanResult?.summary.stepCount ?? 0,
      warningCount: warnings.length
    };

    return {
      record,
      decisionSummary,
      sections: frozenSections,
      metadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createDecisionSummaryRuntime(
  registry?: DecisionSummaryRegistryRuntime
): DecisionSummaryRuntime {
  return new DecisionSummaryRuntime(registry);
}

export default DecisionSummaryRuntime;
