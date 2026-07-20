/**
 * İSTEBUL Business Decision Engine — ActionPlanBuilderRuntime (PR-103D).
 *
 * RecommendationResult üzerinden standart Action Plan nesneleri üretir.
 * Yeni karar üretmez; yalnızca uygulanabilir adımlar oluşturur.
 */

import type { DecisionAction } from '../../models/DecisionAction';
import type { DecisionPriorityLevel } from '../../models/DecisionPriority';
import type { RecommendationRecord } from '../../recommendations/runtime/RecommendationRecord';
import {
  endDecisionStageTimer,
  nowMs,
  startDecisionStageTimer
} from '../../pipeline/runtime/DecisionTiming';
import type { ActionPlanContext } from './ActionPlanContext';
import type { ActionPlanDefinition } from './ActionPlanDefinition';
import type { ActionPlanRecord } from './ActionPlanRecord';
import type { ActionPlanRegistryRuntime } from './ActionPlanRegistryRuntime';
import { createActionPlanRegistryRuntime } from './ActionPlanRegistryRuntime';
import type {
  ActionPlanResult,
  ActionPlanSummary,
  ActionPlanTelemetry,
  ActionPlanWarning
} from './ActionPlanResult';
import type { ActionStep } from './ActionStep';

function priorityToImpact(priority: DecisionPriorityLevel): number {
  if (priority === 'kritik') {
    return 95;
  }
  if (priority === 'yuksek') {
    return 80;
  }
  if (priority === 'orta') {
    return 60;
  }
  return 40;
}

function priorityToEffort(priority: DecisionPriorityLevel): number {
  if (priority === 'kritik') {
    return 70;
  }
  if (priority === 'yuksek') {
    return 55;
  }
  if (priority === 'orta') {
    return 40;
  }
  return 25;
}

/**
 * Recommendation record id: `rec-{policyId}-{index}`
 * Builtin sourceRecommendationId: `rec-{policyId}` (definition id)
 */
function resolveSourceRecommendationDefinitionId(
  record: RecommendationRecord
): string | undefined {
  if (record.sourcePolicy) {
    return `rec-${record.sourcePolicy}`;
  }
  // Strip trailing -{index}
  const match = /^(rec-.+)-\d+$/.exec(record.id);
  if (match) {
    return match[1];
  }
  return undefined;
}

function resolveDefinition(
  registry: ActionPlanRegistryRuntime,
  record: RecommendationRecord
): ActionPlanDefinition {
  const definitionId = resolveSourceRecommendationDefinitionId(record);
  if (definitionId) {
    const fromRegistry = registry.getBySourceRecommendationId(definitionId);
    if (fromRegistry) {
      return fromRegistry;
    }
  }

  return {
    id: `plan-fallback-${record.id}`,
    code: `PLAN_${record.recommendation.code}`,
    title: `Action Plan: ${record.title}`,
    description: record.description,
    defaultPriority: record.priority,
    estimatedImpact: priorityToImpact(record.priority),
    estimatedEffort: priorityToEffort(record.priority),
    stepTemplates: Object.freeze([
      Object.freeze({
        order: 1,
        title: 'Öneriyi incele',
        description: record.description,
        kind: 'incele' as const
      }),
      Object.freeze({
        order: 2,
        title: 'İyileştirme uygula',
        description: `“${record.title}” önerisini uygulayın.`,
        kind: 'iyilestir' as const
      }),
      Object.freeze({
        order: 3,
        title: 'Sonucu izle',
        description: 'Uygulama sonrası etkiyi doğrulayın.',
        kind: 'izle' as const
      })
    ]),
    sourceRecommendationId: definitionId,
    order: Number.MAX_SAFE_INTEGER,
    enabled: true
  };
}

function buildSteps(
  definition: ActionPlanDefinition,
  planId: string,
  recommendationId: string
): { steps: ActionStep[]; actions: DecisionAction[] } {
  const steps: ActionStep[] = [];
  const actions: DecisionAction[] = [];

  for (const template of definition.stepTemplates) {
    const stepId = `${planId}-step-${template.order}`;
    steps.push({
      id: stepId,
      order: template.order,
      title: template.title,
      description: template.description,
      kind: template.kind
    });
    actions.push({
      id: stepId,
      kind: template.kind,
      title: template.title,
      description: template.description,
      recommendationId
    });
  }

  return { steps, actions };
}

function buildRecordFromRecommendation(
  record: RecommendationRecord,
  definition: ActionPlanDefinition,
  index: number
): ActionPlanRecord {
  const slug = definition.id.replace(/^plan-/, '');
  const id = `plan-${slug}-${index}`;
  const title = definition.title || `Action Plan: ${record.title}`;
  const description = definition.description || record.description;
  const priority = definition.defaultPriority || record.priority;
  const built = buildSteps(definition, id, record.id);

  return {
    id,
    title,
    description,
    priority,
    estimatedImpact: definition.estimatedImpact,
    estimatedEffort: definition.estimatedEffort,
    steps: Object.freeze(built.steps),
    sourceRecommendation: record.id,
    metadata: Object.freeze({
      recommendationCode: record.recommendation.code,
      recommendationPriority: record.priority,
      recommendationSeverity: record.severity,
      sourcePolicy: record.sourcePolicy ?? null,
      sourceFinding: record.sourceFinding ?? null,
      stepCount: built.steps.length,
      estimatedImpact: definition.estimatedImpact,
      estimatedEffort: definition.estimatedEffort
    }),
    actions: Object.freeze(built.actions),
    informational: false
  };
}

function buildInformationalFromRecommendation(
  record: RecommendationRecord,
  index: number
): ActionPlanRecord {
  const id = `plan-info-${record.id}-${index}`;
  const title = `Skipped recommendation: ${record.title}`;
  const description =
    typeof record.metadata.skipReason === 'string'
      ? record.metadata.skipReason
      : record.description;

  const step: ActionStep = {
    id: `${id}-step-1`,
    order: 1,
    title: 'Bilgi kaydını incele',
    description,
    kind: 'incele'
  };

  const action: DecisionAction = {
    id: step.id,
    kind: 'incele',
    title: step.title,
    description: step.description,
    recommendationId: record.id
  };

  return {
    id,
    title,
    description,
    priority: 'dusuk',
    estimatedImpact: 0,
    estimatedEffort: 0,
    steps: Object.freeze([step]),
    sourceRecommendation: record.id,
    metadata: Object.freeze({
      informational: true,
      skipReason:
        typeof record.metadata.skipReason === 'string'
          ? record.metadata.skipReason
          : null
    }),
    actions: Object.freeze([action]),
    informational: true
  };
}

function emptyResult(
  warnings: ActionPlanWarning[],
  timing: { startedAt: string; endedAt: string; durationMs: number }
): ActionPlanResult {
  const summary: ActionPlanSummary = {
    actionPlanCount: 0,
    stepCount: 0,
    informationalCount: 0,
    warningCount: warnings.length,
    priorityCounts: Object.freeze({}),
    success: false
  };
  const telemetry: ActionPlanTelemetry = {
    durationMs: timing.durationMs,
    startedAt: timing.startedAt,
    endedAt: timing.endedAt,
    actionPlanCount: 0,
    stepCount: 0,
    priorityDistribution: Object.freeze({}),
    warningCount: warnings.length
  };
  return {
    records: Object.freeze([]),
    actionPlans: Object.freeze([]),
    actions: Object.freeze([]),
    summary,
    warnings: Object.freeze(warnings),
    telemetry
  };
}

/**
 * Action Plan Builder Runtime.
 */
export class ActionPlanBuilderRuntime {
  private readonly registry: ActionPlanRegistryRuntime;

  constructor(registry?: ActionPlanRegistryRuntime) {
    this.registry = registry ?? createActionPlanRegistryRuntime(true);
  }

  getRegistry(): ActionPlanRegistryRuntime {
    return this.registry;
  }

  /**
   * Detaylı runtime sonucu —
   * recommendation varsa plan; yoksa boş; skipped → opsiyonel bilgi.
   */
  compute(context: ActionPlanContext): ActionPlanResult {
    const timer = startDecisionStageTimer();
    const startMark = nowMs();
    const warnings: ActionPlanWarning[] = [];
    const records: ActionPlanRecord[] = [];

    const recommendationResult = context.recommendationResult;

    if (!recommendationResult) {
      const timing = endDecisionStageTimer(timer);
      warnings.push({
        code: 'RECOMMENDATION_RESULT_MISSING',
        message:
          'Action Plan üretimi için RecommendationResult gerekli.'
      });
      return emptyResult(warnings, {
        ...timing,
        durationMs:
          timing.durationMs || Math.max(0, Math.round(nowMs() - startMark))
      });
    }

    const actionable = recommendationResult.records.filter(
      (record) => !record.informational
    );
    const informationalRecs = recommendationResult.records.filter(
      (record) => record.informational === true
    );

    if (actionable.length === 0 && informationalRecs.length === 0) {
      const timing = endDecisionStageTimer(timer);
      return {
        records: Object.freeze([]),
        actionPlans: Object.freeze([]),
        actions: Object.freeze([]),
        summary: {
          actionPlanCount: 0,
          stepCount: 0,
          informationalCount: 0,
          warningCount: 0,
          priorityCounts: Object.freeze({}),
          success: true
        },
        warnings: Object.freeze([]),
        telemetry: {
          durationMs:
            timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
          startedAt: timing.startedAt,
          endedAt: timing.endedAt,
          actionPlanCount: 0,
          stepCount: 0,
          priorityDistribution: Object.freeze({}),
          warningCount: 0
        }
      };
    }

    let index = 0;
    for (const record of actionable) {
      const definition = resolveDefinition(this.registry, record);
      if (!definition.enabled) {
        warnings.push({
          code: 'ACTION_PLAN_DEFINITION_DISABLED',
          message: `Action Plan tanımı pasif: ${definition.id}`,
          actionPlanId: definition.id
        });
        continue;
      }
      records.push(buildRecordFromRecommendation(record, definition, index));
      index += 1;
    }

    if (context.includeSkippedInfo !== false) {
      for (const record of informationalRecs) {
        records.push(buildInformationalFromRecommendation(record, index));
        index += 1;
      }
    }

    const priorityCounts: Partial<Record<DecisionPriorityLevel, number>> = {};
    let informationalCount = 0;
    let stepCount = 0;
    const allActions: DecisionAction[] = [];

    for (const plan of records) {
      priorityCounts[plan.priority] = (priorityCounts[plan.priority] ?? 0) + 1;
      if (plan.informational) {
        informationalCount += 1;
      } else {
        stepCount += plan.steps.length;
        allActions.push(...plan.actions);
      }
    }

    const actionPlans = records.filter((record) => !record.informational);

    const timing = endDecisionStageTimer(timer);
    const summary: ActionPlanSummary = {
      actionPlanCount: actionPlans.length,
      stepCount,
      informationalCount,
      warningCount: warnings.length,
      priorityCounts: Object.freeze(priorityCounts),
      success:
        actionPlans.length > 0 ||
        informationalCount > 0 ||
        Boolean(recommendationResult)
    };

    const telemetry: ActionPlanTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      actionPlanCount: actionPlans.length,
      stepCount,
      priorityDistribution: Object.freeze({ ...priorityCounts }),
      warningCount: warnings.length
    };

    return {
      records: Object.freeze(records),
      actionPlans: Object.freeze(actionPlans),
      actions: Object.freeze(allActions),
      summary,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createActionPlanBuilderRuntime(
  registry?: ActionPlanRegistryRuntime
): ActionPlanBuilderRuntime {
  return new ActionPlanBuilderRuntime(registry);
}

export default ActionPlanBuilderRuntime;
