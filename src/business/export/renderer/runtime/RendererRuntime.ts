/**
 * İSTEBUL Business Export Engine — RendererRuntime (PR-106C).
 *
 * ExportModel üzerinden format-bağımsız RenderDocument üretir.
 * Dosya / PDF / HTML / DOCX üretmez; yalnızca projection yapar.
 */

import type { ExportContent } from '../../modelBuilder/runtime/ExportContent';
import type { ExportKpiReference } from '../../modelBuilder/runtime/ExportKpiReferences';
import type { ExportMetadata } from '../../modelBuilder/runtime/ExportMetadata';
import type { ExportModel } from '../../modelBuilder/runtime/ExportModel';
import type { ExportSectionReference } from '../../modelBuilder/runtime/ExportSectionReferences';
import type { ExportWidgetReference } from '../../modelBuilder/runtime/ExportWidgetReferences';
import {
  endExportStageTimer,
  nowMs,
  startExportStageTimer
} from '../../pipeline/runtime/ExportTiming';
import type { RenderBlock } from './RenderBlock';
import type {
  RenderDocument,
  RenderFooter,
  RenderHeader,
  RenderMetadata
} from './RenderDocument';
import type { RendererContext } from './RendererContext';
import type { RendererRegistryRuntime } from './RendererRegistryRuntime';
import { createRendererRegistryRuntime } from './RendererRegistryRuntime';
import type {
  RendererResult,
  RendererTelemetry,
  RendererWarning
} from './RendererResult';
import type { RenderSection } from './RenderSection';

function emptyContent(): ExportContent {
  return {
    hasDocument: false,
    hasDashboard: false,
    documentSectionCount: 0,
    dashboardSectionCount: 0,
    widgetCount: 0,
    kpiCount: 0,
    totalReferenceCount: 0,
    present: false
  };
}

function emptyMetadata(locale: 'tr' | 'en', createdAt: string): ExportMetadata {
  return {
    id: '',
    requestId: '',
    title: '',
    locale,
    formatIds: Object.freeze([]),
    documentModelId: '',
    dashboardModelId: '',
    reportDnaId: '',
    templateId: '',
    targetId: '',
    createdAt,
    version: '',
    tags: Object.freeze([])
  };
}

function emptyExportModel(locale: 'tr' | 'en', createdAt: string): ExportModel {
  return {
    metadata: emptyMetadata(locale, createdAt),
    content: emptyContent(),
    documentReferences: {
      referenceCount: 0,
      items: Object.freeze([]),
      present: false
    },
    dashboardReferences: {
      referenceCount: 0,
      items: Object.freeze([]),
      present: false
    },
    reportReferences: {
      referenceCount: 0,
      items: Object.freeze([]),
      present: false
    },
    sectionReferences: {
      referenceCount: 0,
      items: Object.freeze([]),
      present: false
    },
    widgetReferences: {
      referenceCount: 0,
      items: Object.freeze([]),
      present: false
    },
    kpiReferences: {
      referenceCount: 0,
      items: Object.freeze([]),
      present: false
    }
  };
}

function resolveExportModel(
  context: RendererContext,
  createdAt: string
): ExportModel {
  return (
    context.exportModel ??
    context.exportModelResult?.model ??
    emptyExportModel(context.locale, createdAt)
  );
}

function compareSections(
  a: ExportSectionReference,
  b: ExportSectionReference
): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  return a.id.localeCompare(b.id);
}

function buildRenderMetadata(
  exportModel: ExportModel,
  createdAt: string
): RenderMetadata {
  const metadata = exportModel.metadata;
  return {
    id: `render:${metadata.id || 'unknown'}`,
    exportModelId: metadata.id,
    requestId: metadata.requestId,
    title: metadata.title || 'Export render',
    locale: metadata.locale,
    formatIds: Object.freeze([...metadata.formatIds]),
    documentModelId: metadata.documentModelId,
    dashboardModelId: metadata.dashboardModelId,
    reportDnaId: metadata.reportDnaId,
    templateId: metadata.templateId,
    targetId: metadata.targetId,
    createdAt,
    version: metadata.version
  };
}

function buildHeader(exportModel: ExportModel): RenderHeader {
  const metadata = exportModel.metadata;
  const documentTitle = exportModel.documentReferences.items[0]?.title;
  const dashboardTitle = exportModel.dashboardReferences.items[0]?.title;
  return {
    title: metadata.title || 'Export render',
    documentTitle: documentTitle || undefined,
    dashboardTitle: dashboardTitle || undefined,
    locale: metadata.locale,
    reportDnaId: metadata.reportDnaId
  };
}

function buildDocumentBlock(
  section: ExportSectionReference,
  documentId: string,
  order: number
): RenderBlock {
  return {
    id: `block:document:${section.id}`,
    kind: 'document-block',
    order,
    title: section.title,
    source: {
      type: 'section',
      sectionId: section.id,
      source: 'document'
    },
    payload: Object.freeze({
      sourceSectionId: section.sourceSectionId ?? null,
      documentId
    })
  };
}

function buildWidgetBlock(
  widget: ExportWidgetReference,
  sectionId: string,
  order: number
): RenderBlock {
  return {
    id: `block:widget:${widget.id}`,
    kind: 'widget',
    order,
    title: widget.title,
    source: { type: 'widget', widgetId: widget.id },
    payload: Object.freeze({
      widgetCode: widget.widgetCode,
      kind: widget.kind,
      kpiIds: Object.freeze([...widget.kpiIds]),
      sectionId
    })
  };
}

function buildKpiBlock(
  kpi: ExportKpiReference,
  widgetId: string,
  order: number
): RenderBlock {
  return {
    id: `block:kpi:${kpi.kpiId}:${widgetId}:${order}`,
    kind: 'kpi',
    order,
    title: kpi.name,
    source: { type: 'kpi', kpiId: kpi.kpiId },
    payload: Object.freeze({
      unit: kpi.unit,
      value: kpi.value,
      trendLabel: kpi.trendLabel ?? null,
      widgetId
    })
  };
}

function buildSectionBlocks(
  section: ExportSectionReference,
  exportModel: ExportModel,
  widgetById: Map<string, ExportWidgetReference>,
  kpiById: Map<string, ExportKpiReference>
): readonly RenderBlock[] {
  const blocks: RenderBlock[] = [];
  let order = 1;

  if (section.source === 'document') {
    const documentId = exportModel.documentReferences.items[0]?.id ?? '';
    blocks.push(buildDocumentBlock(section, documentId, order));
    order += 1;
  }

  const widgetIds = section.widgetIds ?? [];
  for (const widgetId of widgetIds) {
    const widget = widgetById.get(widgetId);
    if (!widget) {
      continue;
    }
    blocks.push(buildWidgetBlock(widget, section.id, order));
    order += 1;
    for (const kpiId of widget.kpiIds) {
      const kpi = kpiById.get(kpiId);
      if (!kpi) {
        continue;
      }
      blocks.push(buildKpiBlock(kpi, widget.id, order));
      order += 1;
    }
  }

  return Object.freeze(blocks);
}

function buildSections(exportModel: ExportModel): readonly RenderSection[] {
  const sections = [...exportModel.sectionReferences.items].sort(
    compareSections
  );
  const widgetById = new Map(
    exportModel.widgetReferences.items.map((widget) => [widget.id, widget])
  );
  const kpiById = new Map(
    exportModel.kpiReferences.items.map((kpi) => [kpi.kpiId, kpi])
  );

  return Object.freeze(
    sections.map((section) => ({
      id: section.id,
      title: section.title,
      order: section.order,
      source: section.source,
      sourceSectionId: section.sourceSectionId,
      widgetIds: section.widgetIds
        ? Object.freeze([...section.widgetIds])
        : undefined,
      blocks: buildSectionBlocks(section, exportModel, widgetById, kpiById)
    }))
  );
}

function buildFooter(
  exportModel: ExportModel,
  sections: readonly RenderSection[]
): RenderFooter {
  const totalBlockCount = sections.reduce(
    (sum, section) => sum + section.blocks.length,
    0
  );
  return {
    documentModelId: exportModel.metadata.documentModelId,
    dashboardModelId: exportModel.metadata.dashboardModelId,
    totalSectionCount: sections.length,
    totalBlockCount,
    content: exportModel.content
  };
}

/**
 * Renderer Runtime.
 */
export class RendererRuntime {
  private readonly registry: RendererRegistryRuntime;

  constructor(registry?: RendererRegistryRuntime) {
    this.registry = registry ?? createRendererRegistryRuntime(true);
  }

  getRegistry(): RendererRegistryRuntime {
    return this.registry;
  }

  /**
   * ExportModel → format-bağımsız RenderDocument.
   */
  compute(context: RendererContext): RendererResult {
    const timer = startExportStageTimer();
    const startMark = nowMs();
    const warnings: RendererWarning[] = [];
    const createdAt = new Date().toISOString();

    const enabled = this.registry.getEnabled();
    if (enabled.length === 0) {
      warnings.push({
        code: 'NO_PARTS_ENABLED',
        message: 'Aktif Renderer parçası yok.'
      });
    }

    const hasDirectModel = Boolean(
      context.exportModel || context.exportModelResult?.model
    );
    const exportModel = resolveExportModel(context, createdAt);

    if (!hasDirectModel) {
      warnings.push({
        code: 'EMPTY_EXPORT_MODEL',
        message: 'ExportModel yok; boş RenderDocument üretildi.'
      });
    } else if (
      exportModel.sectionReferences.referenceCount === 0 &&
      exportModel.widgetReferences.referenceCount === 0 &&
      exportModel.kpiReferences.referenceCount === 0
    ) {
      warnings.push({
        code: 'EMPTY_EXPORT_CONTENT',
        message: 'ExportModel bölüm/widget/KPI referansı içermiyor.'
      });
    }

    const metadata = buildRenderMetadata(exportModel, createdAt);
    const header = buildHeader(exportModel);
    const sections = buildSections(exportModel);
    const footer = buildFooter(exportModel, sections);
    const document: RenderDocument = {
      metadata,
      header,
      sections,
      footer,
      present: sections.length > 0 || footer.totalBlockCount > 0
    };

    const timing = endExportStageTimer(timer);
    const telemetry: RendererTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      renderedSectionCount: sections.length,
      renderedBlockCount: footer.totalBlockCount,
      warningCount: warnings.length
    };

    return {
      document,
      metadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createRendererRuntime(
  registry?: RendererRegistryRuntime
): RendererRuntime {
  return new RendererRuntime(registry);
}

export default RendererRuntime;
