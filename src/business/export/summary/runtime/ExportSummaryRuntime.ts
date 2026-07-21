/**
 * İSTEBUL Business Export Engine — ExportSummaryRuntime (PR-106E).
 *
 * Validation / ExportModel / RenderDocument / FormatDocument[] üzerinden
 * deterministik Export Summary üretir. Projection only; yeni veri / dosya / AI yok.
 */

import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { FormatResult } from '../../format/runtime/FormatResult';
import type { ExportModel } from '../../modelBuilder/runtime/ExportModel';
import type { ExportModelResult } from '../../modelBuilder/runtime/ExportModelResult';
import type { ExportSummary as FoundationExportSummary } from '../../models/ExportSummary';
import {
  endExportStageTimer,
  nowMs,
  startExportStageTimer
} from '../../pipeline/runtime/ExportTiming';
import type { RenderDocument } from '../../renderer/runtime/RenderDocument';
import type { RendererResult } from '../../renderer/runtime/RendererResult';
import type { ExportSummary } from './ExportSummary';
import type { ExportSummaryContext } from './ExportSummaryContext';
import type {
  ExportSummaryMetadata,
  ExportSummaryRecord
} from './ExportSummaryRecord';
import type { ExportSummaryRegistryRuntime } from './ExportSummaryRegistryRuntime';
import { createExportSummaryRegistryRuntime } from './ExportSummaryRegistryRuntime';
import type {
  ExportSummaryResult,
  ExportSummaryTelemetry,
  ExportSummaryWarning
} from './ExportSummaryResult';
import type {
  ExportSummarySection,
  ExportSummarySectionId
} from './ExportSummarySection';
import { EXPORT_SUMMARY_SECTION_LABELS } from './ExportSummarySection';

function section(
  id: ExportSummarySectionId,
  order: number,
  items: string[],
  metrics: Record<string, string | number | boolean | null>
): ExportSummarySection {
  return {
    id,
    title: EXPORT_SUMMARY_SECTION_LABELS[id],
    items: Object.freeze(items),
    metrics: Object.freeze(metrics),
    order
  };
}

function resolveExportModel(
  context: ExportSummaryContext
): ExportModel | undefined {
  return context.exportModel ?? context.exportModelResult?.model;
}

function resolveRenderDocument(
  context: ExportSummaryContext
): RenderDocument | undefined {
  return context.renderDocument ?? context.rendererResult?.document;
}

function resolveValidation(
  context: ExportSummaryContext
): BusinessValidationResult | undefined {
  return context.validation;
}

function resolveFormatResult(
  context: ExportSummaryContext
): FormatResult | undefined {
  return context.formatResult;
}

function resolveRendererResult(
  context: ExportSummaryContext
): RendererResult | undefined {
  return context.rendererResult;
}

function resolveModelResult(
  context: ExportSummaryContext
): ExportModelResult | undefined {
  return context.exportModelResult;
}

function buildMetadataSection(
  context: ExportSummaryContext,
  model: ExportModel | undefined,
  renderDocument: RenderDocument | undefined,
  order: number
): ExportSummarySection {
  const requestId =
    model?.metadata.requestId ??
    context.request?.id ??
    renderDocument?.metadata.requestId ??
    '';
  const exportModelId = model?.metadata.id ?? '';
  const renderDocumentId = renderDocument?.metadata.id ?? '';
  const reportDnaId =
    model?.metadata.reportDnaId ??
    context.request?.reportDnaId ??
    renderDocument?.metadata.reportDnaId ??
    '';
  const locale =
    model?.metadata.locale ??
    renderDocument?.metadata.locale ??
    context.locale;
  const formatIds = model?.metadata.formatIds ?? context.request?.formatIds ?? [];

  const items = [
    `Request ID: ${requestId || 'n/a'}`,
    `Export Model ID: ${exportModelId || 'n/a'}`,
    `Render Document ID: ${renderDocumentId || 'n/a'}`,
    `Report DNA ID: ${reportDnaId || 'n/a'}`,
    `Locale: ${locale}`,
    `Format IDs: ${formatIds.length > 0 ? formatIds.join(', ') : 'n/a'}`
  ];

  return section('metadata', order, items, {
    requestId: requestId || null,
    exportModelId: exportModelId || null,
    renderDocumentId: renderDocumentId || null,
    reportDnaId: reportDnaId || null,
    locale,
    formatIdCount: formatIds.length
  });
}

function buildValidationSection(
  validation: BusinessValidationResult | undefined,
  order: number
): ExportSummarySection {
  const present = validation !== undefined;
  const isValid = validation?.isValid ?? null;
  const errorCount = validation?.counts.error ?? 0;
  const warningCount = validation?.counts.warning ?? 0;
  const infoCount = validation?.counts.info ?? 0;
  const resultCount = validation?.results.length ?? 0;

  const items = [
    `Present: ${present ? 'yes' : 'no'}`,
    `Valid: ${isValid === null ? 'n/a' : isValid ? 'yes' : 'no'}`,
    `Errors: ${errorCount}`,
    `Warnings: ${warningCount}`,
    `Info: ${infoCount}`,
    `Results: ${resultCount}`
  ];

  return section('validation', order, items, {
    present,
    isValid,
    errorCount,
    warningCount,
    infoCount,
    resultCount
  });
}

function buildExportModelSection(
  model: ExportModel | undefined,
  modelResult: ExportModelResult | undefined,
  order: number
): ExportSummarySection {
  const present = model !== undefined;
  const sectionRefCount = model?.sectionReferences.referenceCount ?? 0;
  const widgetRefCount = model?.widgetReferences.referenceCount ?? 0;
  const kpiRefCount = model?.kpiReferences.referenceCount ?? 0;
  const documentPresent = model?.documentReferences.present ?? false;
  const dashboardPresent = model?.dashboardReferences.present ?? false;
  const warningCount = modelResult?.warnings.length ?? 0;
  const referenceCount = modelResult?.telemetry.referenceCount ?? 0;

  const items = [
    `Present: ${present ? 'yes' : 'no'}`,
    `Document refs: ${documentPresent ? 'yes' : 'no'}`,
    `Dashboard refs: ${dashboardPresent ? 'yes' : 'no'}`,
    `Section refs: ${sectionRefCount}`,
    `Widget refs: ${widgetRefCount}`,
    `KPI refs: ${kpiRefCount}`,
    `Reference count: ${referenceCount}`,
    `Model warnings: ${warningCount}`
  ];

  return section('export-model', order, items, {
    present,
    documentPresent,
    dashboardPresent,
    sectionRefCount,
    widgetRefCount,
    kpiRefCount,
    referenceCount,
    warningCount
  });
}

function buildRendererSection(
  renderDocument: RenderDocument | undefined,
  rendererResult: RendererResult | undefined,
  order: number
): ExportSummarySection {
  const present = renderDocument !== undefined;
  const sectionCount =
    renderDocument?.sections.length ??
    rendererResult?.telemetry.renderedSectionCount ??
    0;
  const blockCount =
    renderDocument?.footer.totalBlockCount ??
    rendererResult?.telemetry.renderedBlockCount ??
    0;
  const documentPresent = Boolean(renderDocument?.present);
  const warningCount = rendererResult?.warnings.length ?? 0;

  const items = [
    `Present: ${present ? 'yes' : 'no'}`,
    `Document present flag: ${documentPresent ? 'yes' : 'no'}`,
    `Rendered sections: ${sectionCount}`,
    `Rendered blocks: ${blockCount}`,
    `Renderer warnings: ${warningCount}`
  ];

  return section('renderer', order, items, {
    present,
    documentPresent,
    sectionCount,
    blockCount,
    warningCount
  });
}

function buildFormatSection(
  formatResult: FormatResult | undefined,
  order: number
): ExportSummarySection {
  const present = formatResult !== undefined;
  const formatCount =
    formatResult?.documents.length ?? formatResult?.telemetry.formatCount ?? 0;
  const representationCount =
    formatResult?.telemetry.representationCount ?? formatCount;
  const formatIds = formatResult?.documents.map((doc) => doc.formatId) ?? [];
  const warningCount = formatResult?.warnings.length ?? 0;

  const items = [
    `Present: ${present ? 'yes' : 'no'}`,
    `Format count: ${formatCount}`,
    `Representation count: ${representationCount}`,
    `Format IDs: ${formatIds.length > 0 ? formatIds.join(', ') : 'n/a'}`,
    `Format warnings: ${warningCount}`
  ];

  return section('format', order, items, {
    present,
    formatCount,
    representationCount,
    warningCount
  });
}

function buildExecutionSection(
  context: ExportSummaryContext,
  sectionsBuilt: number,
  order: number
): ExportSummarySection {
  const modelDuration = context.exportModelResult?.telemetry.durationMs ?? 0;
  const rendererDuration = context.rendererResult?.telemetry.durationMs ?? 0;
  const formatDuration = context.formatResult?.telemetry.durationMs ?? 0;
  const pipelineDuration = context.pipelineTelemetry?.totalDurationMs ?? 0;
  const stagesSucceeded =
    context.pipelineTelemetry?.summary.stagesSucceeded ?? null;
  const stagesFailed = context.pipelineTelemetry?.summary.stagesFailed ?? null;

  const items = [
    `Summary sections built: ${sectionsBuilt}`,
    `Model builder durationMs: ${modelDuration}`,
    `Renderer durationMs: ${rendererDuration}`,
    `Format durationMs: ${formatDuration}`,
    `Pipeline durationMs: ${pipelineDuration}`,
    `Stages succeeded: ${stagesSucceeded ?? 'n/a'}`,
    `Stages failed: ${stagesFailed ?? 'n/a'}`
  ];

  return section('execution', order, items, {
    sectionsBuilt,
    modelDurationMs: modelDuration,
    rendererDurationMs: rendererDuration,
    formatDurationMs: formatDuration,
    pipelineDurationMs: pipelineDuration,
    stagesSucceeded,
    stagesFailed
  });
}

function collectWarningCodes(context: ExportSummaryContext): string[] {
  const codes: string[] = [];
  const push = (code: string) => {
    if (!codes.includes(code)) {
      codes.push(code);
    }
  };

  for (const warning of context.exportModelResult?.warnings ?? []) {
    push(warning.code);
  }
  for (const warning of context.rendererResult?.warnings ?? []) {
    push(warning.code);
  }
  for (const warning of context.formatResult?.warnings ?? []) {
    push(warning.code);
  }

  const validation = context.validation;
  if (validation && validation.isValid === false) {
    push('VALIDATION_FAILED');
  }

  return codes;
}

function buildWarningsSection(
  context: ExportSummaryContext,
  order: number
): ExportSummarySection {
  const codes = collectWarningCodes(context);
  const modelWarningCount = context.exportModelResult?.warnings.length ?? 0;
  const rendererWarningCount = context.rendererResult?.warnings.length ?? 0;
  const formatWarningCount = context.formatResult?.warnings.length ?? 0;
  const total =
    modelWarningCount + rendererWarningCount + formatWarningCount;

  const items =
    codes.length > 0
      ? [
          `Total stage warnings: ${total}`,
          ...codes.map((code) => `Code: ${code}`)
        ]
      : ['No stage warnings'];

  return section('warnings', order, items, {
    total,
    modelWarningCount,
    rendererWarningCount,
    formatWarningCount,
    uniqueCodeCount: codes.length
  });
}

function countSummaryItems(sections: readonly ExportSummarySection[]): number {
  return sections.reduce((sum, item) => sum + item.items.length, 0);
}

function buildHeadline(counts: ExportSummary['counts']): string {
  const validationLabel =
    counts.validationPassed === null
      ? 'n/a'
      : counts.validationPassed
        ? 'geçti'
        : 'başarısız';
  return `Export özeti: validation ${validationLabel}, ${counts.renderSectionCount} render bölümü, ${counts.formatCount} format, ${counts.summarySectionCount} özet bölümü.`;
}

function buildHighlights(
  sections: readonly ExportSummarySection[]
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
  validation: BusinessValidationResult | undefined,
  model: ExportModel | undefined,
  formatCount: number
): readonly string[] | undefined {
  const cautions: string[] = [];
  if (!hasAnyInput) {
    cautions.push('EMPTY_EXPORT_INPUTS');
  }
  if (validation && validation.isValid === false) {
    cautions.push('VALIDATION_FAILED');
  }
  if (hasAnyInput && !model) {
    cautions.push('NO_EXPORT_MODEL');
  }
  if (hasAnyInput && formatCount === 0) {
    cautions.push('NO_FORMATS');
  }
  return cautions.length > 0 ? Object.freeze(cautions) : undefined;
}

function toFoundationSummary(
  summary: ExportSummary,
  formatResult: FormatResult | undefined,
  warningCodes: readonly string[]
): FoundationExportSummary {
  const formatLabels =
    formatResult?.documents.map((document) => document.name) ??
    Object.freeze([]);

  return {
    headline: summary.headline,
    artifactCount: 0,
    formatLabels: Object.freeze([...formatLabels]),
    warnings:
      warningCodes.length > 0
        ? Object.freeze([...warningCodes])
        : summary.cautions
  };
}

/**
 * Export Summary Runtime.
 */
export class ExportSummaryRuntime {
  private readonly registry: ExportSummaryRegistryRuntime;

  constructor(registry?: ExportSummaryRegistryRuntime) {
    this.registry = registry ?? createExportSummaryRegistryRuntime(true);
  }

  getRegistry(): ExportSummaryRegistryRuntime {
    return this.registry;
  }

  /**
   * Detaylı runtime sonucu — bölümler + metadata + telemetri.
   */
  compute(context: ExportSummaryContext): ExportSummaryResult {
    const timer = startExportStageTimer();
    const startMark = nowMs();
    const warnings: ExportSummaryWarning[] = [];

    const enabled = this.registry.getEnabled();
    if (enabled.length === 0) {
      warnings.push({
        code: 'NO_SECTIONS_ENABLED',
        message: 'Aktif Export Summary bölümü yok.'
      });
    }

    const validation = resolveValidation(context);
    const model = resolveExportModel(context);
    const modelResult = resolveModelResult(context);
    const renderDocument = resolveRenderDocument(context);
    const rendererResult = resolveRendererResult(context);
    const formatResult = resolveFormatResult(context);

    const hasAnyInput = Boolean(
      validation || model || renderDocument || formatResult
    );

    if (!hasAnyInput) {
      warnings.push({
        code: 'EMPTY_EXPORT_INPUTS',
        message:
          'Validation/ExportModel/Render/Format runtime sonuçları yok; boş export özeti üretildi.'
      });
    }

    const sections: ExportSummarySection[] = [];
    let order = 1;

    for (const definition of enabled) {
      switch (definition.id) {
        case 'metadata':
          sections.push(
            buildMetadataSection(context, model, renderDocument, order)
          );
          break;
        case 'validation':
          sections.push(buildValidationSection(validation, order));
          break;
        case 'export-model':
          sections.push(
            buildExportModelSection(model, modelResult, order)
          );
          break;
        case 'renderer':
          sections.push(
            buildRendererSection(renderDocument, rendererResult, order)
          );
          break;
        case 'format':
          sections.push(buildFormatSection(formatResult, order));
          break;
        case 'execution':
          sections.push(
            buildExecutionSection(context, sections.length + 1, order)
          );
          break;
        case 'warnings':
          sections.push(buildWarningsSection(context, order));
          break;
        default:
          warnings.push({
            code: 'UNKNOWN_SECTION',
            message: `Bilinmeyen Export Summary bölümü: ${definition.id}`
          });
          break;
      }
      order += 1;
    }

    const executionIndex = sections.findIndex(
      (item) => item.id === 'execution'
    );
    if (executionIndex >= 0) {
      sections[executionIndex] = buildExecutionSection(
        context,
        sections.length,
        sections[executionIndex].order
      );
    }

    const frozenSections = Object.freeze(sections);
    const summaryItemCount = countSummaryItems(frozenSections);
    const formatCount = formatResult?.documents.length ?? 0;
    const renderSectionCount = renderDocument?.sections.length ?? 0;
    const warningCodes = collectWarningCodes(context);

    const counts = Object.freeze({
      validationPassed: validation ? validation.isValid : null,
      exportModelPresent: Boolean(model),
      renderSectionCount,
      formatCount,
      summarySectionCount: frozenSections.length,
      summaryItemCount,
      warningCount: warningCodes.length
    });

    const summary: ExportSummary = {
      headline: buildHeadline(counts),
      highlights: Object.freeze(buildHighlights(frozenSections)),
      cautions: buildCautions(hasAnyInput, validation, model, formatCount),
      counts
    };

    const sourceStages: string[] = [];
    if (validation) {
      sourceStages.push('validation');
    }
    if (model) {
      sourceStages.push('export-model');
    }
    if (renderDocument) {
      sourceStages.push('renderer');
    }
    if (formatResult) {
      sourceStages.push('format');
    }

    const metadata: ExportSummaryMetadata = {
      requestId:
        model?.metadata.requestId ??
        context.request?.id ??
        renderDocument?.metadata.requestId ??
        '',
      exportModelId: model?.metadata.id ?? '',
      renderDocumentId: renderDocument?.metadata.id ?? '',
      reportDnaId:
        model?.metadata.reportDnaId ??
        context.request?.reportDnaId ??
        renderDocument?.metadata.reportDnaId,
      locale: context.locale,
      generatedAt: new Date().toISOString(),
      sourceStages: Object.freeze(sourceStages)
    };

    const record: ExportSummaryRecord = {
      exportSummary: summary,
      sections: frozenSections,
      metadata
    };

    const foundationSummary = toFoundationSummary(
      summary,
      formatResult,
      warningCodes
    );

    const timing = endExportStageTimer(timer);
    const telemetry: ExportSummaryTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      summaryItemCount,
      summarySectionCount: frozenSections.length,
      warningCount: warnings.length
    };

    return {
      record,
      summary,
      foundationSummary,
      sections: frozenSections,
      metadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createExportSummaryRuntime(
  registry?: ExportSummaryRegistryRuntime
): ExportSummaryRuntime {
  return new ExportSummaryRuntime(registry);
}

export default ExportSummaryRuntime;
