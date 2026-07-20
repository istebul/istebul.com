/**
 * İSTEBUL Business Dashboard Engine — DashboardSummaryRuntime (PR-105E).
 *
 * DashboardModel, WidgetResult ve KpiBoardResult üzerinden nesnel
 * Dashboard Summary üretir. React / Charts / UI / Export / AI yok.
 */

import type { DashboardModel } from '../../modelBuilder/runtime/DashboardModel';
import type { KpiBoardResult } from '../../kpiBoard/runtime/KpiBoardResult';
import type { WidgetResult } from '../../widgetBuilder/runtime/WidgetResult';
import {
  endDashboardStageTimer,
  nowMs,
  startDashboardStageTimer
} from '../../pipeline/runtime/DashboardTiming';
import type { DashboardSummary } from './DashboardSummary';
import type { DashboardSummaryContext } from './DashboardSummaryContext';
import type {
  DashboardSummaryMetadata,
  DashboardSummaryRecord
} from './DashboardSummaryRecord';
import type { DashboardSummaryRegistryRuntime } from './DashboardSummaryRegistryRuntime';
import { createDashboardSummaryRegistryRuntime } from './DashboardSummaryRegistryRuntime';
import type {
  DashboardSummaryResult,
  DashboardSummaryTelemetry,
  DashboardSummaryWarning
} from './DashboardSummaryResult';
import type {
  DashboardSummarySection,
  DashboardSummarySectionId
} from './DashboardSummarySection';
import { DASHBOARD_SUMMARY_SECTION_LABELS } from './DashboardSummarySection';

function section(
  id: DashboardSummarySectionId,
  order: number,
  items: string[],
  metrics: Record<string, string | number | boolean | null>
): DashboardSummarySection {
  return {
    id,
    title: DASHBOARD_SUMMARY_SECTION_LABELS[id],
    items: Object.freeze(items),
    metrics: Object.freeze(metrics),
    order
  };
}

function resolveDashboardModel(
  context: DashboardSummaryContext
): DashboardModel | undefined {
  return context.dashboardModel ?? context.dashboardModelResult?.model;
}

function buildDashboardMetadataSection(
  context: DashboardSummaryContext,
  model: DashboardModel | undefined,
  order: number
): DashboardSummarySection {
  const dashboardModelId = model?.metadata.id ?? null;
  const reportDnaId =
    model?.metadata.reportDnaId ?? context.request?.reportDnaId ?? null;
  const datasetId =
    model?.metadata.datasetId ?? context.request?.datasetId ?? null;
  const reportModelId = model?.metadata.reportModelId ?? null;
  const layoutId = model?.metadata.layoutId ?? context.request?.layoutId ?? null;
  const themeId = model?.metadata.themeId ?? context.request?.themeId ?? null;
  const locale = model?.metadata.locale ?? context.locale;
  const version = model?.metadata.version ?? null;
  const items = [
    `Dashboard Model ID: ${dashboardModelId ?? 'n/a'}`,
    `Report DNA ID: ${reportDnaId ?? 'n/a'}`,
    `Dataset ID: ${datasetId ?? 'n/a'}`,
    `Report Model ID: ${reportModelId ?? 'n/a'}`,
    `Layout ID: ${layoutId ?? 'n/a'}`,
    `Theme ID: ${themeId ?? 'n/a'}`,
    `Locale: ${locale}`,
    `Version: ${version ?? 'n/a'}`
  ];
  return section('dashboard-metadata', order, items, {
    dashboardModelId,
    reportDnaId,
    datasetId,
    reportModelId,
    layoutId,
    themeId,
    locale,
    version,
    present: model !== undefined
  });
}

function buildWidgetSummarySection(
  widgetResult: WidgetResult | undefined,
  order: number
): DashboardSummarySection {
  const widgetCount = widgetResult?.widgets.length ?? 0;
  const recordCount = widgetResult?.records.length ?? 0;
  const mappedSourceParts =
    widgetResult?.metadata.mappedSourceParts.length ?? 0;
  const registryMappingCount =
    widgetResult?.telemetry.registryMappingCount ?? 0;
  const warningCount = widgetResult?.warnings.length ?? 0;
  const items = [
    `Widgets: ${widgetCount}`,
    `Widget records: ${recordCount}`,
    `Mapped source parts: ${mappedSourceParts}`,
    `Registry mappings: ${registryMappingCount}`,
    `Widget warnings: ${warningCount}`
  ];
  return section('widget-summary', order, items, {
    widgetCount,
    recordCount,
    mappedSourceParts,
    registryMappingCount,
    warningCount,
    present: widgetResult !== undefined
  });
}

function buildKpiSummarySection(
  kpiBoardResult: KpiBoardResult | undefined,
  order: number
): DashboardSummarySection {
  const kpiCount = kpiBoardResult?.kpis.length ?? 0;
  const recordCount = kpiBoardResult?.records.length ?? 0;
  const mappedSourceParts =
    kpiBoardResult?.metadata.mappedSourceParts.length ?? 0;
  const registryMappingCount =
    kpiBoardResult?.telemetry.registryMappingCount ?? 0;
  const warningCount = kpiBoardResult?.warnings.length ?? 0;
  const items = [
    `KPIs: ${kpiCount}`,
    `KPI records: ${recordCount}`,
    `Mapped source parts: ${mappedSourceParts}`,
    `Registry mappings: ${registryMappingCount}`,
    `KPI warnings: ${warningCount}`
  ];
  return section('kpi-summary', order, items, {
    kpiCount,
    recordCount,
    mappedSourceParts,
    registryMappingCount,
    warningCount,
    present: kpiBoardResult !== undefined
  });
}

function buildDatasetSummarySection(
  model: DashboardModel | undefined,
  order: number
): DashboardSummarySection {
  const datasetId = model?.dataset.datasetId ?? null;
  const reportModelId = model?.dataset.reportModelId ?? null;
  const analysisRequestId = model?.dataset.analysisRequestId ?? null;
  const present = model?.dataset.present ?? false;
  const items = [
    `Dataset ID: ${datasetId ?? 'n/a'}`,
    `Report Model ID: ${reportModelId ?? 'n/a'}`,
    `Analysis Request ID: ${analysisRequestId ?? 'n/a'}`,
    `Present: ${present ? 'yes' : 'no'}`
  ];
  return section('dataset-summary', order, items, {
    datasetId,
    reportModelId,
    analysisRequestId,
    present
  });
}

function buildReportSummarySection(
  model: DashboardModel | undefined,
  order: number
): DashboardSummarySection {
  const hasHeadline = model?.reportSummary.hasHeadline ?? false;
  const headlineLength = model?.reportSummary.headlineLength ?? 0;
  const bodyLength = model?.reportSummary.bodyLength ?? 0;
  const highlightCount = model?.reportSummary.highlightCount ?? 0;
  const present = model?.reportSummary.present ?? false;
  const sectionRefCount = model?.sectionReferences.referenceCount ?? 0;
  const narrativeRefCount = model?.narrativeReferences.referenceCount ?? 0;
  const recommendationRefCount =
    model?.recommendationReferences.referenceCount ?? 0;
  const items = [
    `Has headline: ${hasHeadline ? 'yes' : 'no'}`,
    `Headline length: ${headlineLength}`,
    `Body length: ${bodyLength}`,
    `Highlights: ${highlightCount}`,
    `Section references: ${sectionRefCount}`,
    `Narrative references: ${narrativeRefCount}`,
    `Recommendation references: ${recommendationRefCount}`,
    `Present: ${present ? 'yes' : 'no'}`
  ];
  return section('report-summary', order, items, {
    hasHeadline,
    headlineLength,
    bodyLength,
    highlightCount,
    sectionRefCount,
    narrativeRefCount,
    recommendationRefCount,
    present
  });
}

function buildExecutionSummarySection(
  context: DashboardSummaryContext,
  sectionsBuilt: number,
  order: number
): DashboardSummarySection {
  const modelDuration =
    context.dashboardModelResult?.telemetry.durationMs ?? 0;
  const widgetDuration = context.widgetResult?.telemetry.durationMs ?? 0;
  const kpiDuration = context.kpiBoardResult?.telemetry.durationMs ?? 0;
  const items = [
    `Summary sections built: ${sectionsBuilt}`,
    `Model builder durationMs: ${modelDuration}`,
    `Widget builder durationMs: ${widgetDuration}`,
    `KPI board durationMs: ${kpiDuration}`
  ];
  return section('execution-summary', order, items, {
    sectionsBuilt,
    modelDurationMs: modelDuration,
    widgetDurationMs: widgetDuration,
    kpiDurationMs: kpiDuration
  });
}

function buildHeadline(counts: DashboardSummary['counts']): string {
  return `Dashboard özeti: ${counts.widgetCount} widget, ${counts.kpiCount} KPI, ${counts.summarySectionCount} özet bölümü.`;
}

function buildHighlights(
  sections: readonly DashboardSummarySection[]
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
  widgetCount: number,
  kpiCount: number
): readonly string[] | undefined {
  const cautions: string[] = [];
  if (!hasAnyInput) {
    cautions.push('EMPTY_DASHBOARD_INPUTS');
  }
  if (hasAnyInput && widgetCount === 0) {
    cautions.push('NO_WIDGETS');
  }
  if (hasAnyInput && kpiCount === 0) {
    cautions.push('NO_KPIS');
  }
  return cautions.length > 0 ? Object.freeze(cautions) : undefined;
}

/**
 * Dashboard Summary Runtime.
 */
export class DashboardSummaryRuntime {
  private readonly registry: DashboardSummaryRegistryRuntime;

  constructor(registry?: DashboardSummaryRegistryRuntime) {
    this.registry = registry ?? createDashboardSummaryRegistryRuntime(true);
  }

  getRegistry(): DashboardSummaryRegistryRuntime {
    return this.registry;
  }

  /**
   * Detaylı runtime sonucu — bölümler + metadata + telemetri.
   */
  compute(context: DashboardSummaryContext): DashboardSummaryResult {
    const timer = startDashboardStageTimer();
    const startMark = nowMs();
    const warnings: DashboardSummaryWarning[] = [];

    const enabled = this.registry.getEnabled();
    if (enabled.length === 0) {
      warnings.push({
        code: 'NO_SECTIONS_ENABLED',
        message: 'Aktif Dashboard Summary bölümü yok.'
      });
    }

    const model = resolveDashboardModel(context);
    const hasAnyInput = Boolean(
      model || context.widgetResult || context.kpiBoardResult
    );

    if (!hasAnyInput) {
      warnings.push({
        code: 'EMPTY_DASHBOARD_INPUTS',
        message:
          'DashboardModel/Widget/KPI runtime sonuçları yok; boş dashboard özeti üretildi.'
      });
    }

    const widgetCount = context.widgetResult?.widgets.length ?? 0;
    const kpiCount = context.kpiBoardResult?.kpis.length ?? 0;
    const datasetPresent = model?.dataset.present ?? false;

    const sections: DashboardSummarySection[] = [];
    let order = 1;

    for (const definition of enabled) {
      switch (definition.id) {
        case 'dashboard-metadata':
          sections.push(buildDashboardMetadataSection(context, model, order));
          break;
        case 'widget-summary':
          sections.push(
            buildWidgetSummarySection(context.widgetResult, order)
          );
          break;
        case 'kpi-summary':
          sections.push(buildKpiSummarySection(context.kpiBoardResult, order));
          break;
        case 'dataset-summary':
          sections.push(buildDatasetSummarySection(model, order));
          break;
        case 'report-summary':
          sections.push(buildReportSummarySection(model, order));
          break;
        case 'execution-summary':
          sections.push(
            buildExecutionSummarySection(context, sections.length + 1, order)
          );
          break;
        default:
          warnings.push({
            code: 'UNKNOWN_SECTION',
            message: `Bilinmeyen Dashboard Summary bölümü: ${definition.id}`
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
      widgetCount,
      kpiCount,
      summarySectionCount: frozenSections.length,
      datasetPresent
    });

    const summary: DashboardSummary = {
      headline: buildHeadline(counts),
      highlights: Object.freeze(buildHighlights(frozenSections)),
      cautions: buildCautions(hasAnyInput, widgetCount, kpiCount),
      counts
    };

    const sourceStages: string[] = [];
    if (model) {
      sourceStages.push('dashboard-model');
    }
    if (context.widgetResult) {
      sourceStages.push('widget-builder');
    }
    if (context.kpiBoardResult) {
      sourceStages.push('kpi-board');
    }

    const metadata: DashboardSummaryMetadata = {
      dashboardModelId: model?.metadata.id ?? '',
      reportDnaId:
        model?.metadata.reportDnaId ?? context.request?.reportDnaId,
      datasetId: model?.metadata.datasetId ?? context.request?.datasetId,
      locale: context.locale,
      generatedAt: new Date().toISOString(),
      sourceStages: Object.freeze(sourceStages)
    };

    const record: DashboardSummaryRecord = {
      dashboardSummary: summary,
      sections: frozenSections,
      metadata
    };

    const timing = endDashboardStageTimer(timer);
    const telemetry: DashboardSummaryTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      widgetCount,
      kpiCount,
      summarySectionCount: frozenSections.length,
      warningCount: warnings.length
    };

    return {
      record,
      summary,
      sections: frozenSections,
      metadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createDashboardSummaryRuntime(
  registry?: DashboardSummaryRegistryRuntime
): DashboardSummaryRuntime {
  return new DashboardSummaryRuntime(registry);
}

export default DashboardSummaryRuntime;
