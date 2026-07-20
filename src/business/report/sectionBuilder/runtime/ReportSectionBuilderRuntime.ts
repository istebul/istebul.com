/**
 * İSTEBUL Business Report Engine — ReportSectionBuilderRuntime (PR-104D).
 *
 * ReportModel + NarrativeResult üzerinden standart Report Section nesneleri üretir.
 * PDF / HTML / DOCX / Export / AI üretmez.
 */

import type { ReportModel } from '../../modelBuilder/runtime/ReportModel';
import type { NarrativeRecord } from '../../narrative/runtime/NarrativeRecord';
import type { NarrativeResult } from '../../narrative/runtime/NarrativeResult';
import type { ReportSection } from '../../models/ReportSection';
import {
  endReportStageTimer,
  nowMs,
  startReportStageTimer
} from '../../pipeline/runtime/ReportTiming';
import type { ReportSectionContext } from './ReportSectionContext';
import type { ReportSectionDefinition } from './ReportSectionDefinition';
import type { ReportSectionId } from './ReportSectionId';
import type { ReportSectionRecord } from './ReportSectionRecord';
import type { ReportSectionRegistryRuntime } from './ReportSectionRegistryRuntime';
import { createReportSectionRegistryRuntime } from './ReportSectionRegistryRuntime';
import type {
  ReportSectionMetadata,
  ReportSectionResult,
  ReportSectionTelemetry,
  ReportSectionWarning
} from './ReportSectionResult';

function emptyReportModel(): ReportModel {
  return {
    metadata: {
      id: '',
      reportDnaId: '',
      locale: 'tr',
      decisionRequestId: '',
      datasetId: '',
      analysisRequestId: '',
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      tags: Object.freeze([])
    },
    dataset: {
      datasetId: '',
      analysisRequestId: '',
      present: false
    },
    decision: {
      requestId: '',
      analysisRequestId: '',
      datasetId: '',
      status: 'basarisiz',
      lastStage: 'karar-derleme',
      completedAt: null,
      riskCount: 0,
      opportunityCount: 0,
      priorityCount: 0,
      scoreCount: 0
    },
    policy: {
      riskCount: 0,
      opportunityCount: 0,
      priorityCount: 0,
      present: false
    },
    recommendation: {
      recommendationCount: 0,
      priorityCounts: Object.freeze({}),
      items: Object.freeze([]),
      present: false
    },
    actionPlan: {
      actionCount: 0,
      kindCounts: Object.freeze({}),
      items: Object.freeze([]),
      present: false
    },
    summary: {
      hasHeadline: false,
      headlineLength: 0,
      highlightCount: 0,
      cautionCount: 0,
      headline: '',
      highlights: Object.freeze([]),
      cautions: Object.freeze([]),
      present: false
    }
  };
}

function resolveReportModel(context: ReportSectionContext): ReportModel {
  return (
    context.reportModel ??
    context.reportModelResult?.model ??
    emptyReportModel()
  );
}

function findNarrative(
  narrativeResult: NarrativeResult | undefined,
  kind: string | undefined
): NarrativeRecord | undefined {
  if (!narrativeResult || !kind) {
    return undefined;
  }
  return narrativeResult.narratives.find((item) => item.kind === kind);
}

function buildContentForSection(
  definition: ReportSectionDefinition,
  model: ReportModel,
  narrative: NarrativeRecord | undefined
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    sectionId: definition.id,
    hasNarrative: Boolean(narrative),
    narrativeBody: narrative?.body ?? null,
    narrativeHighlights: narrative?.highlights ?? Object.freeze([])
  };

  switch (definition.id as ReportSectionId) {
    case 'executive-summary':
      return {
        ...base,
        summaryHeadline: model.summary.headline,
        summaryHighlights: model.summary.highlights,
        recommendationCount: model.recommendation.recommendationCount,
        actionCount: model.actionPlan.actionCount,
        decisionStatus: model.decision.status
      };
    case 'dataset-overview':
      return {
        ...base,
        datasetId: model.dataset.datasetId,
        analysisRequestId: model.dataset.analysisRequestId,
        present: model.dataset.present
      };
    case 'policy-analysis':
      return {
        ...base,
        riskCount: model.policy.riskCount,
        opportunityCount: model.policy.opportunityCount,
        priorityCount: model.policy.priorityCount,
        present: model.policy.present
      };
    case 'recommendations':
      return {
        ...base,
        recommendationCount: model.recommendation.recommendationCount,
        priorityCounts: model.recommendation.priorityCounts,
        items: model.recommendation.items,
        present: model.recommendation.present
      };
    case 'action-plan':
      return {
        ...base,
        actionCount: model.actionPlan.actionCount,
        kindCounts: model.actionPlan.kindCounts,
        items: model.actionPlan.items,
        present: model.actionPlan.present
      };
    case 'decision-summary':
      return {
        ...base,
        requestId: model.decision.requestId,
        status: model.decision.status,
        lastStage: model.decision.lastStage,
        completedAt: model.decision.completedAt,
        riskCount: model.decision.riskCount,
        opportunityCount: model.decision.opportunityCount,
        priorityCount: model.decision.priorityCount,
        scoreCount: model.decision.scoreCount,
        summaryHeadline: model.summary.headline,
        highlightCount: model.summary.highlightCount,
        cautionCount: model.summary.cautionCount
      };
    case 'appendix':
      return {
        ...base,
        reportModelId: model.metadata.id,
        reportDnaId: model.metadata.reportDnaId,
        decisionRequestId: model.metadata.decisionRequestId,
        datasetId: model.metadata.datasetId,
        analysisRequestId: model.metadata.analysisRequestId,
        version: model.metadata.version,
        locale: model.metadata.locale,
        tags: model.metadata.tags
      };
    default:
      return base;
  }
}

function toFoundationSection(
  definition: ReportSectionDefinition,
  content: Readonly<Record<string, unknown>>
): ReportSection {
  return {
    id: `section:${definition.id}`,
    sectionCode: definition.sectionCode,
    kind: definition.kind,
    title: definition.title,
    order: definition.order,
    content: Object.freeze({ ...content })
  };
}

function buildRecord(
  definition: ReportSectionDefinition,
  model: ReportModel,
  narrative: NarrativeRecord | undefined
): ReportSectionRecord {
  const content = Object.freeze(
    buildContentForSection(definition, model, narrative)
  );
  const section = toFoundationSection(definition, content);
  return {
    id: section.id,
    sectionId: definition.id,
    sectionCode: definition.sectionCode,
    title: definition.title,
    order: definition.order,
    sourceNarrativeKind: definition.sourceNarrativeKind,
    sourceNarrativeId: narrative?.id,
    sourceTemplateId: narrative?.templateId,
    content,
    section
  };
}

/**
 * Report Section Builder Runtime.
 */
export class ReportSectionBuilderRuntime {
  private readonly registry: ReportSectionRegistryRuntime;

  constructor(registry?: ReportSectionRegistryRuntime) {
    this.registry = registry ?? createReportSectionRegistryRuntime(true);
  }

  getRegistry(): ReportSectionRegistryRuntime {
    return this.registry;
  }

  /**
   * ReportModel + NarrativeResult → standart Sections.
   */
  compute(context: ReportSectionContext): ReportSectionResult {
    const timer = startReportStageTimer();
    const startMark = nowMs();
    const warnings: ReportSectionWarning[] = [];
    const generatedAt = new Date().toISOString();

    const model = resolveReportModel(context);
    const hasModelInput = Boolean(
      context.reportModel || context.reportModelResult
    );
    const hasNarrativeInput = Boolean(context.narrativeResult);

    if (!hasModelInput) {
      warnings.push({
        code: 'EMPTY_REPORT_MODEL',
        message: 'ReportModel yok; boş section seti üretildi.'
      });
    }
    if (!hasNarrativeInput) {
      warnings.push({
        code: 'EMPTY_NARRATIVE_RESULT',
        message: 'NarrativeResult yok; section’lar yalnızca ReportModel ile dolduruldu.'
      });
    }

    let definitions = this.registry.getEnabled();
    if (context.sectionIds && context.sectionIds.length > 0) {
      const allowed = new Set(context.sectionIds);
      definitions = Object.freeze(
        definitions.filter((item) => allowed.has(item.id))
      );
    }

    if (definitions.length === 0) {
      warnings.push({
        code: 'NO_SECTIONS_ENABLED',
        message: 'Aktif Report Section tanımı yok.'
      });
    }

    const records: ReportSectionRecord[] = [];
    let templateMappingCount = 0;
    const mappedNarrativeKinds: string[] = [];

    for (const definition of definitions) {
      const narrative = findNarrative(
        context.narrativeResult,
        definition.sourceNarrativeKind
      );
      if (narrative) {
        templateMappingCount += 1;
        if (
          definition.sourceNarrativeKind &&
          !mappedNarrativeKinds.includes(definition.sourceNarrativeKind)
        ) {
          mappedNarrativeKinds.push(definition.sourceNarrativeKind);
        }
      } else if (definition.sourceNarrativeKind) {
        warnings.push({
          code: 'NARRATIVE_MAPPING_MISSING',
          message: `Section “${definition.id}” için narrative bulunamadı.`,
          sectionId: definition.id
        });
      }

      records.push(buildRecord(definition, model, narrative));
    }

    // Deterministic order by definition.order
    records.sort((a, b) => a.order - b.order);

    const sections = Object.freeze(records.map((item) => item.section));
    const metadata: ReportSectionMetadata = {
      reportModelId: model.metadata.id || 'unknown-report-model',
      locale: context.locale,
      generatedAt,
      sectionIds: Object.freeze(records.map((item) => item.sectionId)),
      mappedNarrativeKinds: Object.freeze(mappedNarrativeKinds)
    };

    const timing = endReportStageTimer(timer);
    const telemetry: ReportSectionTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      sectionCount: records.length,
      templateMappingCount,
      warningCount: warnings.length
    };

    return {
      records: Object.freeze(records),
      sections,
      metadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createReportSectionBuilderRuntime(
  registry?: ReportSectionRegistryRuntime
): ReportSectionBuilderRuntime {
  return new ReportSectionBuilderRuntime(registry);
}

export default ReportSectionBuilderRuntime;
