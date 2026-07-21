/**
 * İSTEBUL Business Export Engine — ExportModelBuilderRuntime (PR-106B).
 *
 * DashboardResult / DocumentModel üzerinden formatlardan bağımsız ExportModel üretir.
 * Renderer / format / dosya üretmez; yalnızca projection yapar.
 */

import type { DashboardModel } from '../../../dashboard/models/DashboardModel';
import type { DocumentModel } from '../../../document/models/DocumentModel';
import type { OutputFormatId } from '../../../knowledge/outputs/OutputDefinition';
import {
  EXPORT_ENGINE_DEFAULT_LOCALE,
  EXPORT_ENGINE_SCHEMA_VERSION
} from '../../constants/ExportEngineConstants';
import type { ExportMetadata as FoundationExportMetadata } from '../../models/ExportMetadata';
import type { ExportModel as SkeletonExportModel } from '../../pipeline/runtime/ExportPipelineContext';
import {
  endExportStageTimer,
  nowMs,
  startExportStageTimer
} from '../../pipeline/runtime/ExportTiming';
import type { ExportContent } from './ExportContent';
import type { ExportDashboardReferences } from './ExportDashboardReferences';
import type { ExportDocumentReferences } from './ExportDocumentReferences';
import type { ExportKpiReferences } from './ExportKpiReferences';
import type { ExportMetadata } from './ExportMetadata';
import type { ExportModel } from './ExportModel';
import type { ExportModelContext } from './ExportModelContext';
import type {
  ExportModelResult,
  ExportModelTelemetry,
  ExportModelWarning
} from './ExportModelResult';
import { EXPORT_PART_ORDER } from './ExportPart';
import type { ExportRegistryRuntime } from './ExportRegistryRuntime';
import { createExportRegistryRuntime } from './ExportRegistryRuntime';
import type {
  ExportReportReference,
  ExportReportReferences
} from './ExportReportReferences';
import type { ExportSectionReferences } from './ExportSectionReferences';
import type { ExportWidgetReferences } from './ExportWidgetReferences';

function resolveDocumentModel(
  context: ExportModelContext
): DocumentModel | undefined {
  return context.documentModel ?? context.exportContext?.documentModel;
}

function resolveDashboardModel(
  context: ExportModelContext
): DashboardModel | undefined {
  return context.dashboardModel ?? context.exportContext?.dashboardModel;
}

function buildMetadata(
  context: ExportModelContext,
  document: DocumentModel | undefined,
  dashboard: DashboardModel | undefined,
  createdAt: string
): ExportMetadata {
  const request = context.request;
  const exportContext = context.exportContext;

  return {
    id:
      request?.id ??
      exportContext?.exportJobId ??
      `export-model:${dashboard?.id || document?.id || 'unknown'}`,
    requestId: request?.id ?? exportContext?.exportJobId ?? '',
    title: 'Export veri modeli',
    locale: context.locale,
    formatIds: Object.freeze([...(request?.formatIds ?? [])]) as readonly OutputFormatId[],
    documentModelId:
      request?.documentModelId ?? document?.id ?? '',
    dashboardModelId:
      request?.dashboardModelId ?? dashboard?.id ?? '',
    reportDnaId:
      request?.reportDnaId ??
      dashboard?.metadata?.reportDnaId ??
      document?.metadata?.reportDnaId ??
      '',
    templateId: request?.templateId ?? '',
    targetId: request?.targetId ?? '',
    createdAt,
    version: EXPORT_ENGINE_SCHEMA_VERSION,
    tags: Object.freeze([])
  };
}

function buildDocumentReferences(
  document: DocumentModel | undefined
): ExportDocumentReferences {
  if (!document || typeof document !== 'object' || !document.id) {
    return {
      referenceCount: 0,
      items: Object.freeze([]),
      present: false
    };
  }

  const sections = Array.isArray(document.sections) ? document.sections : [];
  const item = {
    id: document.id,
    title: document.metadata?.title ?? '',
    status: document.status ?? '',
    sectionCount: sections.length,
    reportModelId: document.metadata?.reportModelId ?? '',
    reportDnaId: document.metadata?.reportDnaId ?? ''
  };

  return {
    referenceCount: 1,
    items: Object.freeze([item]),
    present: true
  };
}

function buildDashboardReferences(
  dashboard: DashboardModel | undefined
): ExportDashboardReferences {
  if (!dashboard || typeof dashboard !== 'object' || !dashboard.id) {
    return {
      referenceCount: 0,
      items: Object.freeze([]),
      present: false
    };
  }

  const sections = Array.isArray(dashboard.sections) ? dashboard.sections : [];
  const widgets = Array.isArray(dashboard.widgets) ? dashboard.widgets : [];
  const kpis = Array.isArray(dashboard.kpis) ? dashboard.kpis : [];

  const item = {
    id: dashboard.id,
    title: dashboard.metadata?.title ?? '',
    status: dashboard.status ?? '',
    layoutId: dashboard.layout?.id ?? dashboard.metadata?.layoutId ?? '',
    themeId: dashboard.theme?.id ?? dashboard.metadata?.themeId ?? '',
    sectionCount: sections.length,
    widgetCount: widgets.length,
    kpiCount: kpis.length,
    reportDnaId: dashboard.metadata?.reportDnaId ?? '',
    datasetId: dashboard.metadata?.datasetId ?? ''
  };

  return {
    referenceCount: 1,
    items: Object.freeze([item]),
    present: true
  };
}

function buildReportReferences(
  context: ExportModelContext,
  document: DocumentModel | undefined,
  dashboard: DashboardModel | undefined
): ExportReportReferences {
  const items: ExportReportReference[] = [];
  const seen = new Set<string>();

  const push = (
    reportDnaId: string,
    reportModelId: string,
    source: ExportReportReference['source']
  ) => {
    if (!reportDnaId && !reportModelId) {
      return;
    }
    const key = `${source}:${reportDnaId}:${reportModelId}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    items.push({ reportDnaId, reportModelId, source });
  };

  if (document?.metadata) {
    push(
      document.metadata.reportDnaId ?? '',
      document.metadata.reportModelId ?? '',
      'document'
    );
  }
  if (dashboard?.metadata) {
    push(dashboard.metadata.reportDnaId ?? '', '', 'dashboard');
  }
  if (context.request?.reportDnaId) {
    push(context.request.reportDnaId, '', 'request');
  }

  return {
    referenceCount: items.length,
    items: Object.freeze(items),
    present: items.length > 0
  };
}

function buildSectionReferences(
  document: DocumentModel | undefined,
  dashboard: DashboardModel | undefined
): ExportSectionReferences {
  const items: ExportSectionReferences['items'][number][] = [];

  const documentSections = Array.isArray(document?.sections)
    ? document!.sections
    : [];
  for (const section of documentSections) {
    items.push({
      id: section.id,
      title: section.title,
      order: section.order,
      source: 'document',
      sourceSectionId: section.sourceSectionId
    });
  }

  const dashboardSections = Array.isArray(dashboard?.sections)
    ? dashboard!.sections
    : [];
  for (const section of dashboardSections) {
    items.push({
      id: section.id,
      title: section.title,
      order: section.order,
      source: 'dashboard',
      widgetIds: Object.freeze([...(section.widgetIds ?? [])])
    });
  }

  return {
    referenceCount: items.length,
    items: Object.freeze(items),
    present: items.length > 0
  };
}

function buildWidgetReferences(
  dashboard: DashboardModel | undefined
): ExportWidgetReferences {
  const widgets = Array.isArray(dashboard?.widgets) ? dashboard!.widgets : [];
  const items = widgets.map((widget) => ({
    id: widget.id,
    widgetCode: widget.widgetCode,
    kind: widget.kind,
    title: widget.title,
    kpiIds: Object.freeze([...(widget.kpiIds ?? [])]) as readonly string[]
  }));

  return {
    referenceCount: items.length,
    items: Object.freeze(items),
    present: items.length > 0
  };
}

function buildKpiReferences(
  dashboard: DashboardModel | undefined
): ExportKpiReferences {
  const kpis = Array.isArray(dashboard?.kpis) ? dashboard!.kpis : [];
  const items = kpis.map((kpi) => ({
    kpiId: kpi.kpiId,
    name: kpi.name,
    unit: kpi.unit,
    value: kpi.value,
    trendLabel: kpi.trendLabel
  }));

  return {
    referenceCount: items.length,
    items: Object.freeze(items),
    present: items.length > 0
  };
}

function buildContent(
  document: DocumentModel | undefined,
  dashboard: DashboardModel | undefined,
  referenceCount: number
): ExportContent {
  const documentSectionCount = Array.isArray(document?.sections)
    ? document!.sections.length
    : 0;
  const dashboardSectionCount = Array.isArray(dashboard?.sections)
    ? dashboard!.sections.length
    : 0;
  const widgetCount = Array.isArray(dashboard?.widgets)
    ? dashboard!.widgets.length
    : 0;
  const kpiCount = Array.isArray(dashboard?.kpis) ? dashboard!.kpis.length : 0;

  return {
    hasDocument: Boolean(document?.id),
    hasDashboard: Boolean(dashboard?.id),
    documentSectionCount,
    dashboardSectionCount,
    widgetCount,
    kpiCount,
    totalReferenceCount: referenceCount,
    present:
      Boolean(document?.id) ||
      Boolean(dashboard?.id) ||
      referenceCount > 0
  };
}

function toFoundationMetadata(
  metadata: ExportMetadata
): FoundationExportMetadata {
  return {
    id: metadata.id,
    title: metadata.title,
    locale: metadata.locale,
    createdAt: metadata.createdAt,
    version: metadata.version,
    formatIds: metadata.formatIds,
    documentModelId: metadata.documentModelId || undefined,
    dashboardModelId: metadata.dashboardModelId || undefined,
    reportDnaId: metadata.reportDnaId || undefined
  };
}

function toSkeletonModel(metadata: ExportMetadata): SkeletonExportModel {
  return {
    id: `export-model-${metadata.id || 'unknown'}`,
    requestId: metadata.requestId || metadata.id,
    locale: metadata.locale || EXPORT_ENGINE_DEFAULT_LOCALE,
    formatIds: metadata.formatIds,
    documentModelId: metadata.documentModelId || undefined,
    dashboardModelId: metadata.dashboardModelId || undefined,
    reportDnaId: metadata.reportDnaId || undefined,
    templateId: metadata.templateId || undefined,
    targetId: metadata.targetId || undefined,
    status: 'suruyor',
    createdAt: metadata.createdAt,
    version: metadata.version
  };
}

function countReferences(model: ExportModel): number {
  return (
    model.documentReferences.referenceCount +
    model.dashboardReferences.referenceCount +
    model.reportReferences.referenceCount +
    model.sectionReferences.referenceCount +
    model.widgetReferences.referenceCount +
    model.kpiReferences.referenceCount
  );
}

function countProjections(model: ExportModel): number {
  return EXPORT_PART_ORDER.length + countReferences(model);
}

/**
 * Export Model Builder Runtime.
 */
export class ExportModelBuilderRuntime {
  private readonly registry: ExportRegistryRuntime;

  constructor(registry?: ExportRegistryRuntime) {
    this.registry = registry ?? createExportRegistryRuntime(true);
  }

  getRegistry(): ExportRegistryRuntime {
    return this.registry;
  }

  /**
   * DashboardResult / DocumentModel → formatlardan bağımsız ExportModel.
   */
  compute(context: ExportModelContext): ExportModelResult {
    const timer = startExportStageTimer();
    const startMark = nowMs();
    const warnings: ExportModelWarning[] = [];
    const createdAt = new Date().toISOString();

    const enabled = this.registry.getEnabled();
    if (enabled.length === 0) {
      warnings.push({
        code: 'NO_PARTS_ENABLED',
        message: 'Aktif Export Model parçası yok.'
      });
    }

    const document = resolveDocumentModel(context);
    const dashboard = resolveDashboardModel(context);
    const hasDocumentInput = Boolean(document);
    const hasDashboardInput = Boolean(dashboard);

    if (!hasDocumentInput && !hasDashboardInput) {
      warnings.push({
        code: 'EMPTY_EXPORT_SOURCES',
        message:
          'DocumentModel ve DashboardResult yok; boş Export Model üretildi.'
      });
    } else {
      if (hasDocumentInput) {
        const sections = Array.isArray(document?.sections)
          ? document!.sections
          : [];
        if (sections.length === 0) {
          warnings.push({
            code: 'EMPTY_DOCUMENT_MODEL',
            message: 'DocumentModel bölüm içermiyor.'
          });
        }
      }
      if (hasDashboardInput) {
        const sections = Array.isArray(dashboard?.sections)
          ? dashboard!.sections
          : [];
        const widgets = Array.isArray(dashboard?.widgets)
          ? dashboard!.widgets
          : [];
        const kpis = Array.isArray(dashboard?.kpis) ? dashboard!.kpis : [];
        if (sections.length === 0 && widgets.length === 0 && kpis.length === 0) {
          warnings.push({
            code: 'EMPTY_DASHBOARD_RESULT',
            message: 'DashboardResult bölüm/widget/KPI içermiyor.'
          });
        }
      }
    }

    const metadata = buildMetadata(context, document, dashboard, createdAt);
    const documentReferences = buildDocumentReferences(document);
    const dashboardReferences = buildDashboardReferences(dashboard);
    const reportReferences = buildReportReferences(context, document, dashboard);
    const sectionReferences = buildSectionReferences(document, dashboard);
    const widgetReferences = buildWidgetReferences(dashboard);
    const kpiReferences = buildKpiReferences(dashboard);

    const interimReferenceCount =
      documentReferences.referenceCount +
      dashboardReferences.referenceCount +
      reportReferences.referenceCount +
      sectionReferences.referenceCount +
      widgetReferences.referenceCount +
      kpiReferences.referenceCount;

    const model: ExportModel = {
      metadata,
      content: buildContent(document, dashboard, interimReferenceCount),
      documentReferences,
      dashboardReferences,
      reportReferences,
      sectionReferences,
      widgetReferences,
      kpiReferences
    };

    const timing = endExportStageTimer(timer);
    const referenceCount = countReferences(model);
    const telemetry: ExportModelTelemetry = {
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
      skeletonModel: toSkeletonModel(metadata),
      metadata,
      foundationMetadata: toFoundationMetadata(metadata),
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createExportModelBuilderRuntime(
  registry?: ExportRegistryRuntime
): ExportModelBuilderRuntime {
  return new ExportModelBuilderRuntime(registry);
}

export default ExportModelBuilderRuntime;
