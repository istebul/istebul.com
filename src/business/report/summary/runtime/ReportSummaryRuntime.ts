/**
 * İSTEBUL Business Report Engine — ReportSummaryRuntime (PR-104E).
 *
 * ReportModel, NarrativeResult ve ReportSectionResult üzerinden nesnel
 * Report Summary üretir. AI, PDF, HTML, DOCX veya Export yok.
 */

import type { NarrativeKind } from '../../narrative/runtime/NarrativeKind';
import type { NarrativeResult } from '../../narrative/runtime/NarrativeResult';
import type { ReportModel } from '../../modelBuilder/runtime/ReportModel';
import type { ReportSectionResult } from '../../sectionBuilder/runtime/ReportSectionResult';
import {
  endReportStageTimer,
  nowMs,
  startReportStageTimer
} from '../../pipeline/runtime/ReportTiming';
import type { ReportSummary } from './ReportSummary';
import type { ReportSummaryContext } from './ReportSummaryContext';
import type {
  ReportSummaryMetadata,
  ReportSummaryRecord
} from './ReportSummaryRecord';
import type { ReportSummaryRegistryRuntime } from './ReportSummaryRegistryRuntime';
import { createReportSummaryRegistryRuntime } from './ReportSummaryRegistryRuntime';
import type {
  ReportSummaryResult,
  ReportSummaryTelemetry,
  ReportSummaryWarning
} from './ReportSummaryResult';
import type {
  ReportSummarySection,
  ReportSummarySectionId
} from './ReportSummarySection';
import { REPORT_SUMMARY_SECTION_LABELS } from './ReportSummarySection';

function section(
  id: ReportSummarySectionId,
  order: number,
  items: string[],
  metrics: Record<string, string | number | boolean | null>
): ReportSummarySection {
  return {
    id,
    title: REPORT_SUMMARY_SECTION_LABELS[id],
    items: Object.freeze(items),
    metrics: Object.freeze(metrics),
    order
  };
}

function resolveReportModel(
  context: ReportSummaryContext
): ReportModel | undefined {
  return context.reportModel ?? context.reportModelResult?.model;
}

function buildReportMetadataSection(
  context: ReportSummaryContext,
  model: ReportModel | undefined,
  order: number
): ReportSummarySection {
  const reportModelId = model?.metadata.id ?? null;
  const reportDnaId = model?.metadata.reportDnaId ?? null;
  const decisionRequestId =
    model?.metadata.decisionRequestId ?? context.request?.decisionRequestId ?? null;
  const datasetId =
    model?.metadata.datasetId ?? context.request?.datasetId ?? null;
  const analysisRequestId = model?.metadata.analysisRequestId ?? null;
  const locale = model?.metadata.locale ?? context.locale;
  const version = model?.metadata.version ?? null;
  const items = [
    `Report Model ID: ${reportModelId ?? 'n/a'}`,
    `Report DNA ID: ${reportDnaId ?? 'n/a'}`,
    `Decision Request ID: ${decisionRequestId ?? 'n/a'}`,
    `Dataset ID: ${datasetId ?? 'n/a'}`,
    `Analysis Request ID: ${analysisRequestId ?? 'n/a'}`,
    `Locale: ${locale}`,
    `Version: ${version ?? 'n/a'}`
  ];
  return section('report-metadata', order, items, {
    reportModelId,
    reportDnaId,
    decisionRequestId,
    datasetId,
    analysisRequestId,
    locale,
    version,
    present: model !== undefined
  });
}

function buildSectionSummarySection(
  reportSectionResult: ReportSectionResult | undefined,
  order: number
): ReportSummarySection {
  const sectionCount = reportSectionResult?.sections.length ?? 0;
  const recordCount = reportSectionResult?.records.length ?? 0;
  const warningCount = reportSectionResult?.warnings.length ?? 0;
  const mappedNarrativeKinds =
    reportSectionResult?.metadata.mappedNarrativeKinds.length ?? 0;
  const templateMappingCount =
    reportSectionResult?.telemetry.templateMappingCount ?? 0;
  const items = [
    `Sections: ${sectionCount}`,
    `Section records: ${recordCount}`,
    `Mapped narrative kinds: ${mappedNarrativeKinds}`,
    `Template mappings: ${templateMappingCount}`,
    `Section warnings: ${warningCount}`
  ];
  return section('section-summary', order, items, {
    sectionCount,
    recordCount,
    mappedNarrativeKinds,
    templateMappingCount,
    warningCount,
    present: reportSectionResult !== undefined
  });
}

function buildNarrativeSummarySection(
  narrativeResult: NarrativeResult | undefined,
  order: number
): ReportSummarySection {
  const narrativeCount = narrativeResult?.narratives.length ?? 0;
  const templateCount = narrativeResult?.metadata.templateIds.length ?? 0;
  const warningCount = narrativeResult?.warnings.length ?? 0;
  const kindDistribution = narrativeResult?.telemetry.kindDistribution ?? {};
  const kindEntries = Object.entries(kindDistribution) as [
    NarrativeKind,
    number
  ][];
  const kindItems = kindEntries.map(([kind, count]) => `${kind}: ${count}`);
  const items = [
    `Narratives: ${narrativeCount}`,
    `Templates used: ${templateCount}`,
    `Narrative warnings: ${warningCount}`,
    ...kindItems
  ];
  return section('narrative-summary', order, items, {
    narrativeCount,
    templateCount,
    warningCount,
    present: narrativeResult !== undefined
  });
}

function buildRecommendationSummarySection(
  model: ReportModel | undefined,
  order: number
): ReportSummarySection {
  const recommendationCount = model?.recommendation.recommendationCount ?? 0;
  const present = model?.recommendation.present ?? false;
  const priorityCounts = model?.recommendation.priorityCounts ?? {};
  const priorityItems = Object.entries(priorityCounts).map(
    ([level, count]) => `${level}: ${count ?? 0}`
  );
  const items = [
    `Recommendations: ${recommendationCount}`,
    `Present: ${present ? 'yes' : 'no'}`,
    ...priorityItems
  ];
  return section('recommendation-summary', order, items, {
    recommendationCount,
    present,
    dusuk: priorityCounts.dusuk ?? 0,
    orta: priorityCounts.orta ?? 0,
    yuksek: priorityCounts.yuksek ?? 0,
    kritik: priorityCounts.kritik ?? 0
  });
}

function buildActionPlanSummarySection(
  model: ReportModel | undefined,
  order: number
): ReportSummarySection {
  const actionCount = model?.actionPlan.actionCount ?? 0;
  const present = model?.actionPlan.present ?? false;
  const kindCounts = model?.actionPlan.kindCounts ?? {};
  const kindItems = Object.entries(kindCounts).map(
    ([kind, count]) => `${kind}: ${count ?? 0}`
  );
  const items = [
    `Actions: ${actionCount}`,
    `Present: ${present ? 'yes' : 'no'}`,
    ...kindItems
  ];
  return section('action-plan-summary', order, items, {
    actionCount,
    present,
    ...Object.fromEntries(
      Object.entries(kindCounts).map(([k, v]) => [k, v ?? 0])
    )
  });
}

function buildExecutionSummarySection(
  context: ReportSummaryContext,
  sectionsBuilt: number,
  order: number
): ReportSummarySection {
  const modelDuration = context.reportModelResult?.telemetry.durationMs ?? 0;
  const narrativeDuration = context.narrativeResult?.telemetry.durationMs ?? 0;
  const sectionDuration =
    context.reportSectionResult?.telemetry.durationMs ?? 0;
  const items = [
    `Summary sections built: ${sectionsBuilt}`,
    `Model builder durationMs: ${modelDuration}`,
    `Narrative durationMs: ${narrativeDuration}`,
    `Section builder durationMs: ${sectionDuration}`
  ];
  return section('execution-summary', order, items, {
    sectionsBuilt,
    modelDurationMs: modelDuration,
    narrativeDurationMs: narrativeDuration,
    sectionDurationMs: sectionDuration
  });
}

function buildHeadline(counts: ReportSummary['counts']): string {
  return `Rapor özeti: ${counts.sectionCount} bölüm, ${counts.narrativeCount} narrative, ${counts.recommendationCount} öneri, ${counts.actionCount} aksiyon.`;
}

function buildHighlights(
  sections: readonly ReportSummarySection[]
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
  hasAnyInput: boolean,
  recommendationCount: number,
  actionCount: number
): readonly string[] | undefined {
  const cautions: string[] = [];
  if (!hasAnyInput) {
    cautions.push('EMPTY_REPORT_INPUTS');
  }
  if (hasAnyInput && recommendationCount === 0) {
    cautions.push('NO_RECOMMENDATIONS');
  }
  if (hasAnyInput && actionCount === 0) {
    cautions.push('NO_ACTIONS');
  }
  return cautions.length > 0 ? Object.freeze(cautions) : undefined;
}

/**
 * Report Summary Runtime.
 */
export class ReportSummaryRuntime {
  private readonly registry: ReportSummaryRegistryRuntime;

  constructor(registry?: ReportSummaryRegistryRuntime) {
    this.registry = registry ?? createReportSummaryRegistryRuntime(true);
  }

  getRegistry(): ReportSummaryRegistryRuntime {
    return this.registry;
  }

  /**
   * Detaylı runtime sonucu — bölümler + metadata + telemetri.
   */
  compute(context: ReportSummaryContext): ReportSummaryResult {
    const timer = startReportStageTimer();
    const startMark = nowMs();
    const warnings: ReportSummaryWarning[] = [];

    const enabled = this.registry.getEnabled();
    if (enabled.length === 0) {
      warnings.push({
        code: 'NO_SECTIONS_ENABLED',
        message: 'Aktif Report Summary bölümü yok.'
      });
    }

    const model = resolveReportModel(context);
    const hasAnyInput = Boolean(
      model || context.narrativeResult || context.reportSectionResult
    );

    if (!hasAnyInput) {
      warnings.push({
        code: 'EMPTY_REPORT_INPUTS',
        message:
          'ReportModel/Narrative/Section runtime sonuçları yok; boş rapor özeti üretildi.'
      });
    }

    const sectionCount = context.reportSectionResult?.sections.length ?? 0;
    const narrativeCount = context.narrativeResult?.narratives.length ?? 0;
    const recommendationCount = model?.recommendation.recommendationCount ?? 0;
    const actionCount = model?.actionPlan.actionCount ?? 0;

    const sections: ReportSummarySection[] = [];
    let order = 1;

    for (const definition of enabled) {
      switch (definition.id) {
        case 'report-metadata':
          sections.push(buildReportMetadataSection(context, model, order));
          break;
        case 'section-summary':
          sections.push(
            buildSectionSummarySection(context.reportSectionResult, order)
          );
          break;
        case 'narrative-summary':
          sections.push(
            buildNarrativeSummarySection(context.narrativeResult, order)
          );
          break;
        case 'recommendation-summary':
          sections.push(buildRecommendationSummarySection(model, order));
          break;
        case 'action-plan-summary':
          sections.push(buildActionPlanSummarySection(model, order));
          break;
        case 'execution-summary':
          sections.push(
            buildExecutionSummarySection(context, sections.length + 1, order)
          );
          break;
        default:
          warnings.push({
            code: 'UNKNOWN_SECTION',
            message: `Bilinmeyen Report Summary bölümü: ${definition.id}`
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
    const counts = Object.freeze({
      sectionCount,
      narrativeCount,
      recommendationCount,
      actionCount
    });

    const reportSummary: ReportSummary = {
      headline: buildHeadline(counts),
      highlights: Object.freeze(buildHighlights(frozenSections)),
      cautions: buildCautions(hasAnyInput, recommendationCount, actionCount),
      counts
    };

    const sourceStages: string[] = [];
    if (model) {
      sourceStages.push('rapor-model');
    }
    if (context.narrativeResult) {
      sourceStages.push('narrative');
    }
    if (context.reportSectionResult) {
      sourceStages.push('bolum-derleme');
    }

    const metadata: ReportSummaryMetadata = {
      reportModelId: model?.metadata.id ?? '',
      decisionRequestId:
        model?.metadata.decisionRequestId ?? context.request?.decisionRequestId,
      datasetId: model?.metadata.datasetId ?? context.request?.datasetId,
      locale: context.locale,
      generatedAt: new Date().toISOString(),
      sourceStages: Object.freeze(sourceStages)
    };

    const record: ReportSummaryRecord = {
      reportSummary,
      sections: frozenSections,
      metadata
    };

    const timing = endReportStageTimer(timer);
    const telemetry: ReportSummaryTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      sectionCount,
      narrativeCount,
      recommendationTotals: recommendationCount,
      actionTotals: actionCount,
      warningCount: warnings.length
    };

    return {
      record,
      reportSummary,
      sections: frozenSections,
      metadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createReportSummaryRuntime(
  registry?: ReportSummaryRegistryRuntime
): ReportSummaryRuntime {
  return new ReportSummaryRuntime(registry);
}

export default ReportSummaryRuntime;
