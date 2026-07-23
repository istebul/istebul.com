/**
 * İSTEBUL Business Report Engine — ReportModelBuilderRuntime (PR-104B).
 *
 * DecisionResult üzerinden sunumdan bağımsız ReportModel üretir.
 * Metin / section / narrative üretmez.
 */

import type { DecisionActionKind } from '../../../decision/models/DecisionAction';
import type { DecisionPriorityLevel } from '../../../decision/models/DecisionPriority';
import type { DecisionResult } from '../../../decision/models/DecisionResult';
import type { ReportModel as FoundationReportModel } from '../../models/ReportModel';
import type { ReportMetadata as FoundationReportMetadata } from '../../models/ReportMetadata';
import type { ReportRecommendation } from '../../models/ReportRecommendation';
import { REPORT_ENGINE_SCHEMA_VERSION } from '../../constants/ReportEngineConstants';
import {
  endReportStageTimer,
  nowMs,
  startReportStageTimer
} from '../../pipeline/runtime/ReportTiming';
import type { ReportActionPlanInformation } from './ReportActionPlanInformation';
import type { ReportDataset } from './ReportDataset';
import type { ReportDecision } from './ReportDecision';
import type { ReportMetadata } from './ReportMetadata';
import type { ReportModel } from './ReportModel';
import type { ReportModelContext } from './ReportModelContext';
import type {
  ReportModelResult,
  ReportModelTelemetry,
  ReportModelWarning
} from './ReportModelResult';
import type { ReportPolicyInformation } from './ReportPolicyInformation';
import type {
  ReportMappedRecommendation,
  ReportRecommendationInformation
} from './ReportRecommendationInformation';
import type { ReportRegistryRuntime } from './ReportRegistryRuntime';
import { createReportRegistryRuntime } from './ReportRegistryRuntime';
import type { ReportSummaryInformation } from './ReportSummaryInformation';
import { REPORT_PART_ORDER } from './ReportPart';

function emptyDecisionResult(): DecisionResult {
  return {
    requestId: '',
    analysisRequestId: '',
    datasetId: '',
    status: 'basarisiz',
    lastStage: 'karar-derleme',
    summary: {
      headline: '',
      highlights: Object.freeze([])
    },
    recommendations: Object.freeze([]),
    actions: Object.freeze([]),
    risks: Object.freeze([]),
    opportunities: Object.freeze([]),
    priorities: Object.freeze([]),
    scores: Object.freeze([])
  };
}

function resolveDecisionResult(context: ReportModelContext): DecisionResult {
  return (
    context.decisionResult ??
    context.reportContext?.decisionResult ??
    emptyDecisionResult()
  );
}

function buildMetadata(
  context: ReportModelContext,
  decision: DecisionResult,
  createdAt: string
): ReportMetadata {
  const request = context.request;
  const reportContext = context.reportContext;
  return {
    id: request?.id ?? reportContext?.reportJobId ?? `report-model:${decision.requestId || 'unknown'}`,
    reportDnaId: request?.reportId ?? reportContext?.reportDnaId ?? '',
    locale: context.locale,
    decisionRequestId: decision.requestId || request?.decisionRequestId || '',
    datasetId: decision.datasetId || request?.datasetId || '',
    analysisRequestId: decision.analysisRequestId || '',
    createdAt,
    version: REPORT_ENGINE_SCHEMA_VERSION,
    tags: Object.freeze([])
  };
}

function buildDataset(decision: DecisionResult): ReportDataset {
  return {
    datasetId: decision.datasetId,
    analysisRequestId: decision.analysisRequestId,
    present: Boolean(decision.datasetId)
  };
}

function buildDecision(decision: DecisionResult): ReportDecision {
  return {
    requestId: decision.requestId,
    analysisRequestId: decision.analysisRequestId,
    datasetId: decision.datasetId,
    status: decision.status,
    lastStage: decision.lastStage,
    completedAt: decision.completedAt ?? null,
    riskCount: decision.risks.length,
    opportunityCount: decision.opportunities.length,
    priorityCount: decision.priorities.length,
    scoreCount: decision.scores.length
  };
}

function buildPolicy(decision: DecisionResult): ReportPolicyInformation {
  const riskCount = decision.risks.length;
  const opportunityCount = decision.opportunities.length;
  const priorityCount = decision.priorities.length;
  return {
    riskCount,
    opportunityCount,
    priorityCount,
    present: riskCount + opportunityCount + priorityCount > 0
  };
}

function buildRecommendation(
  decision: DecisionResult
): ReportRecommendationInformation {
  const priorityCounts: Partial<Record<DecisionPriorityLevel, number>> = {};
  const items: ReportMappedRecommendation[] = [];

  for (const rec of decision.recommendations) {
    priorityCounts[rec.priorityLevel] =
      (priorityCounts[rec.priorityLevel] ?? 0) + 1;
    items.push({
      id: rec.id,
      code: rec.code,
      title: rec.title,
      description: rec.description,
      priorityLevel: rec.priorityLevel,
      relatedRiskIds: Object.freeze([...(rec.relatedRiskIds ?? [])]),
      relatedOpportunityIds: Object.freeze([
        ...(rec.relatedOpportunityIds ?? [])
      ])
    });
  }

  return {
    recommendationCount: items.length,
    priorityCounts: Object.freeze(priorityCounts),
    items: Object.freeze(items),
    present: items.length > 0
  };
}

function buildActionPlan(decision: DecisionResult): ReportActionPlanInformation {
  const kindCounts: Partial<Record<DecisionActionKind, number>> = {};
  const items = decision.actions.map((action) => {
    kindCounts[action.kind] = (kindCounts[action.kind] ?? 0) + 1;
    return {
      id: action.id,
      kind: action.kind,
      title: action.title,
      description: action.description,
      recommendationId: action.recommendationId ?? null
    };
  });

  return {
    actionCount: items.length,
    kindCounts: Object.freeze(kindCounts),
    items: Object.freeze(items),
    present: items.length > 0
  };
}

function buildSummary(decision: DecisionResult): ReportSummaryInformation {
  const summary = decision.summary;
  const headline = summary?.headline ?? '';
  const highlights = summary?.highlights ?? [];
  const cautions = summary?.cautions ?? [];
  return {
    hasHeadline: headline.length > 0,
    headlineLength: headline.length,
    highlightCount: highlights.length,
    cautionCount: cautions.length,
    headline,
    highlights: Object.freeze([...highlights]),
    cautions: Object.freeze([...cautions]),
    present: Boolean(summary)
  };
}

function toFoundationRecommendations(
  recommendation: ReportRecommendationInformation
): readonly ReportRecommendation[] {
  return Object.freeze(
    recommendation.items.map((item) => ({
      id: item.id,
      code: item.code,
      title: item.title,
      description: item.description,
      priorityLevel: item.priorityLevel,
      sourceRecommendationId: item.id
    }))
  );
}

function toFoundationMetadata(
  metadata: ReportMetadata
): FoundationReportMetadata {
  return {
    id: metadata.id,
    title: 'Rapor veri modeli',
    description: 'Report Model Builder Runtime (PR-104B) yapısal çıktı.',
    reportDnaId: metadata.reportDnaId || 'unknown-report-dna',
    locale: metadata.locale,
    createdAt: metadata.createdAt,
    version: metadata.version,
    tags: metadata.tags
  };
}

function toFoundationModel(
  metadata: ReportMetadata,
  recommendation: ReportRecommendationInformation
): FoundationReportModel {
  return {
    id: metadata.id,
    metadata: toFoundationMetadata(metadata),
    status: 'suruyor',
    lastStage: 'bolum-derleme',
    executiveSummary: {
      headline: '',
      body: '',
      highlights: Object.freeze([])
    },
    sections: Object.freeze([]),
    findings: Object.freeze([]),
    recommendations: toFoundationRecommendations(recommendation),
    appendices: Object.freeze([]),
    references: Object.freeze([])
  };
}

function countMappedEntities(model: ReportModel): number {
  return (
    REPORT_PART_ORDER.length +
    model.recommendation.recommendationCount +
    model.actionPlan.actionCount +
    model.decision.riskCount +
    model.decision.opportunityCount +
    model.decision.priorityCount +
    model.decision.scoreCount
  );
}

/**
 * Report Model Builder Runtime.
 */
export class ReportModelBuilderRuntime {
  private readonly registry: ReportRegistryRuntime;

  constructor(registry?: ReportRegistryRuntime) {
    this.registry = registry ?? createReportRegistryRuntime(true);
  }

  getRegistry(): ReportRegistryRuntime {
    return this.registry;
  }

  /**
   * DecisionResult → sunumdan bağımsız ReportModel.
   */
  compute(context: ReportModelContext): ReportModelResult {
    const timer = startReportStageTimer();
    const startMark = nowMs();
    const warnings: ReportModelWarning[] = [];
    const createdAt = new Date().toISOString();

    const enabled = this.registry.getEnabled();
    if (enabled.length === 0) {
      warnings.push({
        code: 'NO_PARTS_ENABLED',
        message: 'Aktif Report Model parçası yok.'
      });
    }

    const decision = resolveDecisionResult(context);
    const hasDecisionInput = Boolean(
      context.decisionResult || context.reportContext?.decisionResult
    );

    if (!hasDecisionInput) {
      warnings.push({
        code: 'EMPTY_DECISION_RESULT',
        message: 'DecisionResult yok; boş Report Model üretildi.'
      });
    } else if (
      decision.recommendations.length === 0 &&
      decision.actions.length === 0
    ) {
      warnings.push({
        code: 'EMPTY_DECISION_CONTENT',
        message: 'DecisionResult öneri ve aksiyon içermiyor.'
      });
    }

    const metadata = buildMetadata(context, decision, createdAt);
    const model: ReportModel = {
      metadata,
      dataset: buildDataset(decision),
      decision: buildDecision(decision),
      policy: buildPolicy(decision),
      recommendation: buildRecommendation(decision),
      actionPlan: buildActionPlan(decision),
      summary: buildSummary(decision)
    };

    const timing = endReportStageTimer(timer);
    const telemetry: ReportModelTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      mappedEntityCount: countMappedEntities(model),
      recommendationCount: model.recommendation.recommendationCount,
      actionCount: model.actionPlan.actionCount,
      warningCount: warnings.length
    };

    return {
      model,
      foundationModel: toFoundationModel(metadata, model.recommendation),
      metadata,
      foundationMetadata: toFoundationMetadata(metadata),
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createReportModelBuilderRuntime(
  registry?: ReportRegistryRuntime
): ReportModelBuilderRuntime {
  return new ReportModelBuilderRuntime(registry);
}

export default ReportModelBuilderRuntime;
