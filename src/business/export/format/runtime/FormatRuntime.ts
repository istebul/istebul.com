/**
 * İSTEBUL Business Export Engine — FormatRuntime (PR-106D).
 *
 * RenderDocument üzerinden formata özgü FormatDocument temsilleri üretir.
 * Fiziksel dosya / disk / streaming üretmez; yalnızca projection yapar.
 */

import type { OutputFormatId } from '../../../knowledge/outputs/OutputDefinition';
import { EXPORT_ENGINE_SCHEMA_VERSION } from '../../constants/ExportEngineConstants';
import type { ExportFormat } from '../../models/ExportFormat';
import type { RenderDocument } from '../../renderer/runtime/RenderDocument';
import type { RenderSection } from '../../renderer/runtime/RenderSection';
import {
  endExportStageTimer,
  nowMs,
  startExportStageTimer
} from '../../pipeline/runtime/ExportTiming';
import type { FormatDefinition } from './FormatDefinition';
import type { FormatContext } from './FormatContext';
import type {
  FormatDocument,
  FormatDocumentMetadata,
  FormatOutlineNode,
  FormatRepresentationModel
} from './FormatDocument';
import type { FormatRegistryRuntime } from './FormatRegistryRuntime';
import { createFormatRegistryRuntime } from './FormatRegistryRuntime';
import type {
  FormatResult,
  FormatTelemetry,
  FormatWarning
} from './FormatResult';
import type { FormatRepresentationKind } from './FormatRepresentation';
import { FORMAT_REPRESENTATION_ORDER } from './FormatRepresentation';

function emptyRenderDocument(locale: 'tr' | 'en'): RenderDocument {
  return {
    metadata: {
      id: '',
      exportModelId: '',
      requestId: '',
      title: '',
      locale,
      formatIds: Object.freeze([]),
      documentModelId: '',
      dashboardModelId: '',
      reportDnaId: '',
      templateId: '',
      targetId: '',
      createdAt: new Date().toISOString(),
      version: ''
    },
    header: {
      title: '',
      locale,
      reportDnaId: ''
    },
    sections: Object.freeze([]),
    footer: {
      documentModelId: '',
      dashboardModelId: '',
      totalSectionCount: 0,
      totalBlockCount: 0,
      content: {
        hasDocument: false,
        hasDashboard: false,
        documentSectionCount: 0,
        dashboardSectionCount: 0,
        widgetCount: 0,
        kpiCount: 0,
        totalReferenceCount: 0,
        present: false
      }
    },
    present: false
  };
}

function resolveRenderDocument(context: FormatContext): RenderDocument {
  return (
    context.renderDocument ??
    context.rendererResult?.document ??
    emptyRenderDocument(context.locale)
  );
}

/**
 * Request / Render metadata formatIds → representation kinds.
 * word → docx; pdf/json doğrudan; html/markdown yalnızca açıkça istenirse
 * veya hiç eşleşme yoksa tüm enabled registry kullanılır.
 */
function mapOutputFormatToRepresentation(
  formatId: string
): FormatRepresentationKind | undefined {
  switch (formatId) {
    case 'pdf':
      return 'pdf';
    case 'word':
      return 'docx';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'markdown':
    case 'md':
      return 'markdown';
    default:
      return undefined;
  }
}

function resolveRequestedKinds(
  context: FormatContext,
  renderDocument: RenderDocument,
  enabled: readonly FormatDefinition[]
): readonly FormatRepresentationKind[] {
  if (context.formatIds && context.formatIds.length > 0) {
    const enabledSet = new Set(enabled.map((item) => item.id));
    return Object.freeze(
      context.formatIds.filter((kind) => enabledSet.has(kind))
    );
  }

  const fromRequest = context.request?.formatIds ?? [];
  const fromRender = renderDocument.metadata.formatIds ?? [];
  const mapped = new Set<FormatRepresentationKind>();

  for (const formatId of [...fromRequest, ...fromRender]) {
    const kind = mapOutputFormatToRepresentation(formatId);
    if (kind) {
      mapped.add(kind);
    }
  }

  if (mapped.size === 0) {
    return Object.freeze(enabled.map((item) => item.id));
  }

  const enabledSet = new Set(enabled.map((item) => item.id));
  return Object.freeze(
    FORMAT_REPRESENTATION_ORDER.filter(
      (kind) => mapped.has(kind) && enabledSet.has(kind)
    )
  );
}

function buildOutline(
  sections: readonly RenderSection[]
): readonly FormatOutlineNode[] {
  return Object.freeze(
    sections.map((section) => ({
      id: section.id,
      title: section.title,
      order: section.order,
      kind: 'section' as const,
      children: Object.freeze(
        section.blocks.map((block) => ({
          id: block.id,
          title: block.title,
          order: block.order,
          kind: 'block' as const,
          blockKind: block.kind
        }))
      )
    }))
  );
}

function buildBodySummary(
  kind: FormatRepresentationKind,
  title: string,
  sectionCount: number,
  blockCount: number
): string {
  switch (kind) {
    case 'pdf':
      return `PDF model: "${title}" — ${sectionCount} bölüm, ${blockCount} blok`;
    case 'html':
      return `HTML model: <article>${title}</article> — ${sectionCount} section(s)`;
    case 'docx':
      return `DOCX model: "${title}" — ${sectionCount} heading(s), ${blockCount} run(s)`;
    case 'markdown':
      return `Markdown model: # ${title} — ${sectionCount} section(s)`;
    case 'json':
      return `JSON model: { title: "${title}", sections: ${sectionCount}, blocks: ${blockCount} }`;
    default:
      return title;
  }
}

function buildHints(
  kind: FormatRepresentationKind,
  renderDocument: RenderDocument
): Readonly<Record<string, string | number | boolean | null>> {
  const base = {
    locale: renderDocument.metadata.locale,
    reportDnaId: renderDocument.metadata.reportDnaId || null,
    present: renderDocument.present
  };

  switch (kind) {
    case 'pdf':
      return Object.freeze({
        ...base,
        pageSize: 'A4',
        orientation: 'portrait'
      });
    case 'html':
      return Object.freeze({
        ...base,
        rootElement: 'article',
        charset: 'utf-8'
      });
    case 'docx':
      return Object.freeze({
        ...base,
        documentType: 'office-document',
        stylePreset: 'default'
      });
    case 'markdown':
      return Object.freeze({
        ...base,
        flavor: 'gfm',
        headingOffset: 1
      });
    case 'json':
      return Object.freeze({
        ...base,
        schemaHint: 'export-format-document-v1',
        pretty: true
      });
    default:
      return Object.freeze(base);
  }
}

function buildRepresentation(
  kind: FormatRepresentationKind,
  renderDocument: RenderDocument
): FormatRepresentationModel {
  const sections = renderDocument.sections;
  const blockCount = renderDocument.footer.totalBlockCount;
  const headings = Object.freeze(sections.map((section) => section.title));
  const outline = buildOutline(sections);

  return {
    kind,
    bodySummary: buildBodySummary(
      kind,
      renderDocument.header.title || renderDocument.metadata.title,
      sections.length,
      blockCount
    ),
    headings,
    blockCount,
    outline,
    hints: buildHints(kind, renderDocument)
  };
}

function buildSharedMetadata(
  renderDocument: RenderDocument,
  createdAt: string
): FormatDocumentMetadata {
  return {
    id: `format-meta:${renderDocument.metadata.id || 'unknown'}`,
    renderDocumentId: renderDocument.metadata.id,
    requestId: renderDocument.metadata.requestId,
    title: renderDocument.metadata.title || renderDocument.header.title,
    locale: renderDocument.metadata.locale,
    reportDnaId: renderDocument.metadata.reportDnaId,
    createdAt,
    version: renderDocument.metadata.version || EXPORT_ENGINE_SCHEMA_VERSION
  };
}

function buildFormatDocument(
  definition: FormatDefinition,
  renderDocument: RenderDocument,
  sharedMetadata: FormatDocumentMetadata
): FormatDocument {
  const representation = buildRepresentation(definition.id, renderDocument);
  return {
    id: `format:${definition.id}:${renderDocument.metadata.id || 'unknown'}`,
    formatId: definition.id,
    name: definition.name,
    mimeType: definition.mimeType,
    fileExtension: definition.fileExtension,
    order: definition.order,
    metadata: {
      ...sharedMetadata,
      id: `format-meta:${definition.id}:${renderDocument.metadata.id || 'unknown'}`
    },
    representation,
    present: renderDocument.present || representation.blockCount > 0
  };
}

/**
 * FormatDocument listesini foundation bag.format (ExportFormat[]) şekline projekte eder.
 * html/markdown Knowledge OutputFormatId dışında olduğu için bag'e yazılmaz;
 * tam liste `exportFormatRuntimeResult.documents` içindedir.
 */
export function toExportFormats(
  documents: readonly FormatDocument[]
): readonly ExportFormat[] {
  const mapped: ExportFormat[] = [];

  for (const document of documents) {
    let outputId: OutputFormatId | undefined;
    if (document.formatId === 'pdf') {
      outputId = 'pdf';
    } else if (document.formatId === 'docx') {
      outputId = 'word';
    } else if (document.formatId === 'json') {
      outputId = 'json';
    }

    if (!outputId) {
      continue;
    }

    mapped.push({
      id: outputId,
      name: document.name,
      mimeType: document.mimeType,
      fileExtension: document.fileExtension,
      order: document.order
    });
  }

  return Object.freeze(mapped);
}

/**
 * Format Runtime.
 */
export class FormatRuntime {
  private readonly registry: FormatRegistryRuntime;

  constructor(registry?: FormatRegistryRuntime) {
    this.registry = registry ?? createFormatRegistryRuntime(true);
  }

  getRegistry(): FormatRegistryRuntime {
    return this.registry;
  }

  /**
   * RenderDocument → FormatDocument[] (projection only).
   */
  compute(context: FormatContext): FormatResult {
    const timer = startExportStageTimer();
    const startMark = nowMs();
    const warnings: FormatWarning[] = [];
    const createdAt = new Date().toISOString();

    const enabled = this.registry.getEnabled();
    if (enabled.length === 0) {
      warnings.push({
        code: 'NO_FORMATS_ENABLED',
        message: 'Aktif format temsili yok.'
      });
    }

    const hasDirectDocument = Boolean(
      context.renderDocument || context.rendererResult?.document
    );
    const renderDocument = resolveRenderDocument(context);

    if (!hasDirectDocument) {
      warnings.push({
        code: 'EMPTY_RENDER_DOCUMENT',
        message: 'RenderDocument yok; boş format temsilleri üretildi.'
      });
    } else if (!renderDocument.present || renderDocument.sections.length === 0) {
      warnings.push({
        code: 'EMPTY_RENDER_CONTENT',
        message: 'RenderDocument bölüm içermiyor.'
      });
    }

    const requestedKinds = resolveRequestedKinds(
      context,
      renderDocument,
      enabled
    );
    const definitionById = new Map(enabled.map((item) => [item.id, item]));
    const documents: FormatDocument[] = [];
    const sharedMetadata = buildSharedMetadata(renderDocument, createdAt);

    for (const kind of FORMAT_REPRESENTATION_ORDER) {
      if (!requestedKinds.includes(kind)) {
        continue;
      }
      const definition = definitionById.get(kind);
      if (!definition) {
        continue;
      }
      documents.push(
        buildFormatDocument(definition, renderDocument, sharedMetadata)
      );
    }

    if (documents.length === 0 && enabled.length > 0 && hasDirectDocument) {
      warnings.push({
        code: 'NO_FORMAT_MATCH',
        message:
          'İstenen format kimlikleri etkin temsillerle eşleşmedi; çıktı boş.'
      });
    }

    const timing = endExportStageTimer(timer);
    const telemetry: FormatTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      formatCount: documents.length,
      representationCount: documents.length,
      warningCount: warnings.length
    };

    return {
      documents: Object.freeze(documents),
      metadata: sharedMetadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createFormatRuntime(
  registry?: FormatRegistryRuntime
): FormatRuntime {
  return new FormatRuntime(registry);
}

export default FormatRuntime;
