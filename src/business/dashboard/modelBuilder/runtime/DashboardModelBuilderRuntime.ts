/**
 * İSTEBUL Business Dashboard Engine — DashboardModelBuilderRuntime (PR-105B).
 *
 * ReportResult üzerinden sunumdan bağımsız DashboardModel üretir.
 * Widget / KPI / chart üretmez; yalnızca projection yapar.
 */

import type { DecisionActionKind } from '../../../decision/models/DecisionAction';
import type { DecisionPriorityLevel } from '../../../decision/models/DecisionPriority';
import type { DecisionResult } from '../../../decision/models/DecisionResult';
import type { ReportModel as FoundationReportModel } from '../../../report/models/ReportModel';
import {
  DASHBOARD_ENGINE_DEFAULT_LOCALE,
  DASHBOARD_ENGINE_SCHEMA_VERSION
} from '../../constants/DashboardEngineConstants';
import type { DashboardLayout } from '../../models/DashboardLayout';
import type { DashboardModel as FoundationDashboardModel } from '../../models/DashboardModel';
import type { DashboardMetadata as FoundationDashboardMetadata } from '../../models/DashboardMetadata';
import type { DashboardTheme } from '../../models/DashboardTheme';
import {
  endDashboardStageTimer,
  nowMs,
  startDashboardStageTimer
} from '../../pipeline/runtime/DashboardTiming';
import type { DashboardActionPlanReferences } from './DashboardActionPlanReferences';
import type { DashboardDataset } from './DashboardDataset';
import type { DashboardMetadata } from './DashboardMetadata';
import type { DashboardModel } from './DashboardModel';
import type { DashboardModelContext } from './DashboardModelContext';
import type {
  DashboardModelResult,
  DashboardModelTelemetry,
  DashboardModelWarning
} from './DashboardModelResult';
import type {
  DashboardNarrativeReferenceKind,
  DashboardNarrativeReferences
} from './DashboardNarrativeReferences';
import type { DashboardRecommendationReferences } from './DashboardRecommendationReferences';
import type { DashboardRegistryRuntime } from './DashboardRegistryRuntime';
import { createDashboardRegistryRuntime } from './DashboardRegistryRuntime';
import type { DashboardReportSummaryInformation } from './DashboardReportSummaryInformation';
import type { DashboardSectionReferences } from './DashboardSectionReferences';
import { DASHBOARD_PART_ORDER } from './DashboardPart';

const DEFAULT_LAYOUT_ID = 'dashboard-layout-default';
const DEFAULT_THEME_ID = 'dashboard-theme-default';

function emptyReportModel(): FoundationReportModel {
  return {
    id: '',
    metadata: {
      id: '',
      title: '',
      reportDnaId: '',
      locale: DASHBOARD_ENGINE_DEFAULT_LOCALE,
      createdAt: new Date().toISOString(),
      version: '0.0.0'
    },
    status: 'basarisiz',
    lastStage: 'rapor-derleme',
    executiveSummary: {
      headline: '',
      body: '',
      highlights: Object.freeze([])
    },
    sections: Object.freeze([]),
    findings: Object.freeze([]),
    recommendations: Object.freeze([]),
    appendices: Object.freeze([]),
    references: Object.freeze([])
  };
}

function resolveReportModel(context: DashboardModelContext): FoundationReportModel {
  return (
    context.reportModel ??
    context.dashboardContext?.reportModel ??
    emptyReportModel()
  );
}

function resolveDecisionResult(
  context: DashboardModelContext
): DecisionResult | undefined {
  return context.decisionResult ?? context.dashboardContext?.decisionResult;
}

function buildMetadata(
  context: DashboardModelContext,
  report: FoundationReportModel,
  createdAt: string
): DashboardMetadata {
  const request = context.request;
  const dashboardContext = context.dashboardContext;
  const decision = resolveDecisionResult(context);

  return {
    id:
      request?.id ??
      dashboardContext?.dashboardJobId ??
      `dashboard-model:${report.id || 'unknown'}`,
    reportDnaId:
      request?.reportDnaId ?? report.metadata?.reportDnaId ?? '',
    locale: context.locale,
    datasetId: request?.datasetId ?? decision?.datasetId ?? '',
    reportModelId: report.id || request?.reportModelId || '',
    decisionRequestId:
      request?.decisionRequestId ?? decision?.requestId ?? '',
    analysisRequestId:
      request?.analysisRequestId ?? decision?.analysisRequestId ?? '',
    layoutId:
      request?.layoutId ?? dashboardContext?.layoutId ?? DEFAULT_LAYOUT_ID,
    themeId: request?.themeId ?? dashboardContext?.themeId ?? DEFAULT_THEME_ID,
    createdAt,
    version: DASHBOARD_ENGINE_SCHEMA_VERSION,
    tags: Object.freeze([])
  };
}

function buildDataset(
  report: FoundationReportModel,
  metadata: DashboardMetadata
): DashboardDataset {
  return {
    datasetId: metadata.datasetId,
    reportModelId: report.id || metadata.reportModelId,
    analysisRequestId: metadata.analysisRequestId,
    present: Boolean(metadata.datasetId)
  };
}

function buildReportSummary(
  report: FoundationReportModel
): DashboardReportSummaryInformation {
  const summary = report.executiveSummary;
  const headline = summary?.headline ?? '';
  const body = summary?.body ?? '';
  const highlights = summary?.highlights ?? [];
  return {
    hasHeadline: headline.length > 0,
    headlineLength: headline.length,
    bodyLength: body.length,
    highlightCount: highlights.length,
    headline,
    body,
    highlights: Object.freeze([...highlights]),
    present: Boolean(summary)
  };
}

function buildSectionReferences(
  report: FoundationReportModel
): DashboardSectionReferences {
  const sections = Array.isArray(report.sections) ? report.sections : [];
  const items = sections.map((section) => ({
    id: section.id,
    sectionCode: section.sectionCode,
    kind: section.kind,
    title: section.title,
    order: section.order
  }));

  return {
    referenceCount: items.length,
    items: Object.freeze(items),
    present: items.length > 0
  };
}

function buildNarrativeReferences(
  report: FoundationReportModel
): DashboardNarrativeReferences {
  const kindCounts: Partial<Record<DashboardNarrativeReferenceKind, number>> =
    {};
  const items: Array<{
    id: string;
    kind: DashboardNarrativeReferenceKind;
    title: string;
    sourceId: string;
  }> = [];

  const push = (
    kind: DashboardNarrativeReferenceKind,
    id: string,
    title: string,
    sourceId: string
  ) => {
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
    items.push({ id, kind, title, sourceId });
  };

  if (report.executiveSummary?.headline || report.executiveSummary?.body) {
    push(
      'executive-summary',
      `exec:${report.id || 'report'}`,
      report.executiveSummary.headline || 'Executive Summary',
      report.id || 'report'
    );
  }

  const findings = Array.isArray(report.findings) ? report.findings : [];
  for (const finding of findings) {
    push('finding', finding.id, finding.title, finding.id);
  }
  const appendices = Array.isArray(report.appendices) ? report.appendices : [];
  for (const appendix of appendices) {
    push('appendix', appendix.id, appendix.title, appendix.id);
  }
  const references = Array.isArray(report.references) ? report.references : [];
  for (const reference of references) {
    push('reference', reference.id, reference.label, reference.id);
  }

  return {
    referenceCount: items.length,
    kindCounts: Object.freeze(kindCounts),
    items: Object.freeze(items),
    present: items.length > 0
  };
}

function buildRecommendationReferences(
  report: FoundationReportModel
): DashboardRecommendationReferences {
  const priorityCounts: Partial<Record<DecisionPriorityLevel, number>> = {};
  const recommendations = Array.isArray(report.recommendations)
    ? report.recommendations
    : [];
  const items = recommendations.map((rec) => {
    const priorityLevel = rec.priorityLevel as DecisionPriorityLevel;
    priorityCounts[priorityLevel] = (priorityCounts[priorityLevel] ?? 0) + 1;
    return {
      id: rec.id,
      code: rec.code,
      title: rec.title,
      description: rec.description,
      priorityLevel,
      sourceRecommendationId: rec.sourceRecommendationId ?? null
    };
  });

  return {
    referenceCount: items.length,
    priorityCounts: Object.freeze(priorityCounts),
    items: Object.freeze(items),
    present: items.length > 0
  };
}

function buildActionPlanReferences(
  decision: DecisionResult | undefined
): DashboardActionPlanReferences {
  if (!decision || !Array.isArray(decision.actions)) {
    return {
      referenceCount: 0,
      kindCounts: Object.freeze({}),
      items: Object.freeze([]),
      present: false
    };
  }

  const kindCounts: Partial<Record<DecisionActionKind, number>> = {};
  const items = decision.actions.map((action) => {
    const kind = action.kind as DecisionActionKind;
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
    return {
      id: action.id,
      kind,
      title: action.title,
      description: action.description,
      recommendationId: action.recommendationId ?? null
    };
  });

  return {
    referenceCount: items.length,
    kindCounts: Object.freeze(kindCounts),
    items: Object.freeze(items),
    present: items.length > 0
  };
}

function createSkeletonLayout(layoutId: string): DashboardLayout {
  return {
    id: layoutId,
    name: 'Varsayılan yerleşim',
    columnCount: 12,
    rowHeightToken: 'dashboard.row.height.default',
    density: 'standart',
    gapToken: 'dashboard.gap.default'
  };
}

function createSkeletonTheme(themeId: string, layoutId: string): DashboardTheme {
  return {
    id: themeId,
    name: 'Varsayılan tema',
    description: 'Dashboard Model Builder Runtime (PR-105B) iskelet teması.',
    defaultLayoutId: layoutId,
    surfaceColorToken: 'dashboard.color.surface',
    accentColorToken: 'dashboard.color.accent',
    typographyToken: 'dashboard.typography.default',
    version: DASHBOARD_ENGINE_SCHEMA_VERSION
  };
}

function toFoundationMetadata(
  metadata: DashboardMetadata
): FoundationDashboardMetadata {
  return {
    id: metadata.id,
    title: 'Dashboard veri modeli',
    description: 'Dashboard Model Builder Runtime (PR-105B) yapısal çıktı.',
    reportDnaId: metadata.reportDnaId || 'unknown-report-dna',
    datasetId: metadata.datasetId || 'unknown-dataset',
    locale: metadata.locale,
    createdAt: metadata.createdAt,
    version: metadata.version,
    layoutId: metadata.layoutId,
    themeId: metadata.themeId
  };
}

function toFoundationModel(
  metadata: DashboardMetadata,
  sectionReferences: DashboardSectionReferences
): FoundationDashboardModel {
  const layout = createSkeletonLayout(metadata.layoutId);
  const theme = createSkeletonTheme(metadata.themeId, metadata.layoutId);

  return {
    id: metadata.id,
    metadata: toFoundationMetadata(metadata),
    status: 'suruyor',
    lastStage: 'dashboard-birlestirme',
    layout,
    theme,
    sections: Object.freeze(
      sectionReferences.items.map((section) => ({
        id: section.id,
        title: section.title,
        order: section.order,
        widgetIds: Object.freeze([] as string[]),
        description: section.sectionCode
      }))
    ),
    widgets: Object.freeze([]),
    kpis: Object.freeze([]),
    filters: Object.freeze([]),
    navigation: {
      items: Object.freeze(
        sectionReferences.items.map((section) => ({
          id: `nav:${section.id}`,
          label: section.title,
          sectionId: section.id,
          order: section.order
        }))
      )
    }
  };
}

function countReferences(model: DashboardModel): number {
  return (
    model.sectionReferences.referenceCount +
    model.narrativeReferences.referenceCount +
    model.recommendationReferences.referenceCount +
    model.actionPlanReferences.referenceCount
  );
}

function countProjections(model: DashboardModel): number {
  return DASHBOARD_PART_ORDER.length + countReferences(model);
}

/**
 * Dashboard Model Builder Runtime.
 */
export class DashboardModelBuilderRuntime {
  private readonly registry: DashboardRegistryRuntime;

  constructor(registry?: DashboardRegistryRuntime) {
    this.registry = registry ?? createDashboardRegistryRuntime(true);
  }

  getRegistry(): DashboardRegistryRuntime {
    return this.registry;
  }

  /**
   * ReportResult → sunumdan bağımsız DashboardModel.
   */
  compute(context: DashboardModelContext): DashboardModelResult {
    const timer = startDashboardStageTimer();
    const startMark = nowMs();
    const warnings: DashboardModelWarning[] = [];
    const createdAt = new Date().toISOString();

    const enabled = this.registry.getEnabled();
    if (enabled.length === 0) {
      warnings.push({
        code: 'NO_PARTS_ENABLED',
        message: 'Aktif Dashboard Model parçası yok.'
      });
    }

    const report = resolveReportModel(context);
    const hasReportInput = Boolean(
      context.reportModel || context.dashboardContext?.reportModel
    );
    const decision = resolveDecisionResult(context);

    if (!hasReportInput) {
      warnings.push({
        code: 'EMPTY_REPORT_RESULT',
        message: 'ReportResult yok; boş Dashboard Model üretildi.'
      });
    } else if (
      (!Array.isArray(report.sections) || report.sections.length === 0) &&
      (!Array.isArray(report.findings) || report.findings.length === 0) &&
      (!Array.isArray(report.recommendations) ||
        report.recommendations.length === 0)
    ) {
      warnings.push({
        code: 'EMPTY_REPORT_CONTENT',
        message: 'ReportResult bölüm/bulgu/öneri içermiyor.'
      });
    }

    const metadata = buildMetadata(context, report, createdAt);
    const model: DashboardModel = {
      metadata,
      dataset: buildDataset(report, metadata),
      reportSummary: buildReportSummary(report),
      sectionReferences: buildSectionReferences(report),
      narrativeReferences: buildNarrativeReferences(report),
      recommendationReferences: buildRecommendationReferences(report),
      actionPlanReferences: buildActionPlanReferences(decision)
    };

    const timing = endDashboardStageTimer(timer);
    const referenceCount = countReferences(model);
    const telemetry: DashboardModelTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      projectionCount: countProjections(model),
      referenceCount,
      warningCount: warnings.length
    };

    return {
      model,
      foundationModel: toFoundationModel(metadata, model.sectionReferences),
      metadata,
      foundationMetadata: toFoundationMetadata(metadata),
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createDashboardModelBuilderRuntime(
  registry?: DashboardRegistryRuntime
): DashboardModelBuilderRuntime {
  return new DashboardModelBuilderRuntime(registry);
}

export default DashboardModelBuilderRuntime;
