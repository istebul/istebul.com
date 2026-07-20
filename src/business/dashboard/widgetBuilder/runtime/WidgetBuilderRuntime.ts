/**
 * İSTEBUL Business Dashboard Engine — WidgetBuilderRuntime (PR-105C).
 *
 * DashboardModel üzerinden WidgetDefinition koleksiyonu üretir.
 * React / Charts / CSS / Layout / Export / AI üretmez.
 */

import type { DashboardModel } from '../../modelBuilder/runtime/DashboardModel';
import type { DashboardWidget } from '../../models/DashboardWidget';
import {
  endDashboardStageTimer,
  nowMs,
  startDashboardStageTimer
} from '../../pipeline/runtime/DashboardTiming';
import type { WidgetContext } from './WidgetContext';
import type { WidgetDefinition } from './WidgetDefinition';
import type { WidgetId } from './WidgetId';
import type { WidgetRecord } from './WidgetRecord';
import type { WidgetRegistryRuntime } from './WidgetRegistryRuntime';
import { createWidgetRegistryRuntime } from './WidgetRegistryRuntime';
import type {
  WidgetMetadata,
  WidgetResult,
  WidgetTelemetry,
  WidgetWarning
} from './WidgetResult';

function emptyDashboardModel(): DashboardModel {
  return {
    metadata: {
      id: '',
      reportDnaId: '',
      locale: 'tr',
      datasetId: '',
      reportModelId: '',
      decisionRequestId: '',
      analysisRequestId: '',
      layoutId: '',
      themeId: '',
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      tags: Object.freeze([])
    },
    dataset: {
      datasetId: '',
      reportModelId: '',
      analysisRequestId: '',
      present: false
    },
    reportSummary: {
      hasHeadline: false,
      headlineLength: 0,
      bodyLength: 0,
      highlightCount: 0,
      headline: '',
      body: '',
      highlights: Object.freeze([]),
      present: false
    },
    sectionReferences: {
      referenceCount: 0,
      items: Object.freeze([]),
      present: false
    },
    narrativeReferences: {
      referenceCount: 0,
      kindCounts: Object.freeze({}),
      items: Object.freeze([]),
      present: false
    },
    recommendationReferences: {
      referenceCount: 0,
      priorityCounts: Object.freeze({}),
      items: Object.freeze([]),
      present: false
    },
    actionPlanReferences: {
      referenceCount: 0,
      kindCounts: Object.freeze({}),
      items: Object.freeze([]),
      present: false
    }
  };
}

function resolveDashboardModel(context: WidgetContext): DashboardModel {
  return (
    context.dashboardModel ??
    context.dashboardModelResult?.model ??
    emptyDashboardModel()
  );
}

function isSourcePresent(definition: WidgetDefinition, model: DashboardModel): boolean {
  switch (definition.id as WidgetId) {
    case 'overview':
      return model.reportSummary.present || Boolean(model.metadata.id);
    case 'dataset':
      return model.dataset.present;
    case 'recommendations':
      return model.recommendationReferences.present;
    case 'action-plans':
      return model.actionPlanReferences.present;
    case 'narratives':
      return model.narrativeReferences.present;
    case 'sections':
      return model.sectionReferences.present;
    default:
      return false;
  }
}

function buildPayload(
  definition: WidgetDefinition,
  model: DashboardModel
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    widgetId: definition.id,
    sourcePartId: definition.sourcePartId,
    sourcePresent: isSourcePresent(definition, model)
  };

  switch (definition.id as WidgetId) {
    case 'overview':
      return {
        ...base,
        dashboardModelId: model.metadata.id,
        reportDnaId: model.metadata.reportDnaId,
        datasetId: model.metadata.datasetId,
        headline: model.reportSummary.headline,
        highlightCount: model.reportSummary.highlightCount,
        hasHeadline: model.reportSummary.hasHeadline,
        recommendationCount: model.recommendationReferences.referenceCount,
        actionPlanCount: model.actionPlanReferences.referenceCount,
        sectionCount: model.sectionReferences.referenceCount
      };
    case 'dataset':
      return {
        ...base,
        datasetId: model.dataset.datasetId,
        reportModelId: model.dataset.reportModelId,
        analysisRequestId: model.dataset.analysisRequestId,
        present: model.dataset.present
      };
    case 'recommendations':
      return {
        ...base,
        referenceCount: model.recommendationReferences.referenceCount,
        priorityCounts: model.recommendationReferences.priorityCounts,
        items: model.recommendationReferences.items,
        present: model.recommendationReferences.present
      };
    case 'action-plans':
      return {
        ...base,
        referenceCount: model.actionPlanReferences.referenceCount,
        kindCounts: model.actionPlanReferences.kindCounts,
        items: model.actionPlanReferences.items,
        present: model.actionPlanReferences.present
      };
    case 'narratives':
      return {
        ...base,
        referenceCount: model.narrativeReferences.referenceCount,
        kindCounts: model.narrativeReferences.kindCounts,
        items: model.narrativeReferences.items,
        present: model.narrativeReferences.present
      };
    case 'sections':
      return {
        ...base,
        referenceCount: model.sectionReferences.referenceCount,
        items: model.sectionReferences.items,
        present: model.sectionReferences.present
      };
    default:
      return base;
  }
}

function toFoundationWidget(
  definition: WidgetDefinition,
  payload: Readonly<Record<string, unknown>>,
  orderIndex: number
): DashboardWidget {
  return {
    id: `widget:${definition.id}`,
    widgetCode: definition.widgetCode,
    kind: definition.kind,
    title: definition.title,
    placement: {
      col: 0,
      row: orderIndex,
      colSpan: definition.defaultColSpan,
      rowSpan: definition.defaultRowSpan
    },
    kpiIds: Object.freeze([]),
    payload: Object.freeze({ ...payload })
  };
}

function buildRecord(
  definition: WidgetDefinition,
  model: DashboardModel,
  orderIndex: number
): WidgetRecord {
  const sourcePresent = isSourcePresent(definition, model);
  const payload = Object.freeze(buildPayload(definition, model));
  const widget = toFoundationWidget(definition, payload, orderIndex);
  return {
    id: widget.id,
    widgetId: definition.id,
    widgetCode: definition.widgetCode,
    title: definition.title,
    order: definition.order,
    sourcePartId: definition.sourcePartId,
    sourcePresent,
    payload,
    widget
  };
}

/**
 * Widget Builder Runtime.
 */
export class WidgetBuilderRuntime {
  private readonly registry: WidgetRegistryRuntime;

  constructor(registry?: WidgetRegistryRuntime) {
    this.registry = registry ?? createWidgetRegistryRuntime(true);
  }

  getRegistry(): WidgetRegistryRuntime {
    return this.registry;
  }

  /**
   * DashboardModel → Widget Definitions / DashboardWidget[].
   */
  compute(context: WidgetContext): WidgetResult {
    const timer = startDashboardStageTimer();
    const startMark = nowMs();
    const warnings: WidgetWarning[] = [];
    const generatedAt = new Date().toISOString();

    const model = resolveDashboardModel(context);
    const hasModelInput = Boolean(
      context.dashboardModel || context.dashboardModelResult
    );

    if (!hasModelInput) {
      warnings.push({
        code: 'EMPTY_DASHBOARD_MODEL',
        message: 'DashboardModel yok; boş widget seti üretildi.'
      });
    }

    let definitions = this.registry.getEnabled();
    if (context.widgetIds && context.widgetIds.length > 0) {
      const allowed = new Set(context.widgetIds);
      definitions = Object.freeze(
        definitions.filter((item) => allowed.has(item.id))
      );
    }

    if (definitions.length === 0) {
      warnings.push({
        code: 'NO_WIDGETS_ENABLED',
        message: 'Aktif Widget tanımı yok.'
      });
    }

    const records: WidgetRecord[] = [];
    let registryMappingCount = 0;
    const mappedSourceParts: string[] = [];

    for (const definition of definitions) {
      const record = buildRecord(definition, model, definition.order - 1);
      if (record.sourcePresent) {
        registryMappingCount += 1;
        if (!mappedSourceParts.includes(definition.sourcePartId)) {
          mappedSourceParts.push(definition.sourcePartId);
        }
      } else if (hasModelInput) {
        warnings.push({
          code: 'SOURCE_PART_EMPTY',
          message: `Widget “${definition.id}” için kaynak parça boş.`,
          widgetId: definition.id
        });
      }
      records.push(record);
    }

    // Deterministic order by definition.order
    records.sort((a, b) => a.order - b.order);

    const widgets = Object.freeze(records.map((item) => item.widget));
    const metadata: WidgetMetadata = {
      dashboardModelId: model.metadata.id || 'unknown-dashboard-model',
      locale: context.locale,
      generatedAt,
      widgetIds: Object.freeze(records.map((item) => item.widgetId)),
      mappedSourceParts: Object.freeze(mappedSourceParts)
    };

    const timing = endDashboardStageTimer(timer);
    const telemetry: WidgetTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      widgetCount: records.length,
      registryMappingCount,
      warningCount: warnings.length
    };

    return {
      records: Object.freeze(records),
      widgets,
      metadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createWidgetBuilderRuntime(
  registry?: WidgetRegistryRuntime
): WidgetBuilderRuntime {
  return new WidgetBuilderRuntime(registry);
}

export default WidgetBuilderRuntime;
