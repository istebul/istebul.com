/**
 * İSTEBUL Business Dashboard Engine — KpiBoardRuntime (PR-105D).
 *
 * DashboardModel üzerinden KPI Board kayıtları üretir.
 * Yeni analiz / hesaplama / React / Charts üretmez; yalnızca projection.
 */

import type { DashboardModel } from '../../modelBuilder/runtime/DashboardModel';
import type { DashboardKPI } from '../../models/DashboardKPI';
import {
  endDashboardStageTimer,
  nowMs,
  startDashboardStageTimer
} from '../../pipeline/runtime/DashboardTiming';
import type { KpiBoardContext } from './KpiBoardContext';
import type { KpiDefinition } from './KpiDefinition';
import type { KpiId } from './KpiId';
import type { KpiRecord } from './KpiRecord';
import type { KpiRegistryRuntime } from './KpiRegistryRuntime';
import { createKpiRegistryRuntime } from './KpiRegistryRuntime';
import type {
  KpiBoardMetadata,
  KpiBoardResult,
  KpiBoardTelemetry,
  KpiBoardWarning
} from './KpiBoardResult';

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

function resolveDashboardModel(context: KpiBoardContext): DashboardModel {
  return (
    context.dashboardModel ??
    context.dashboardModelResult?.model ??
    emptyDashboardModel()
  );
}

function resolveReportStatus(context: KpiBoardContext): string | null {
  const status = context.dashboardContext?.reportModel?.status;
  return typeof status === 'string' && status.length > 0 ? status : null;
}

function isSourcePresent(
  definition: KpiDefinition,
  model: DashboardModel,
  context: KpiBoardContext
): boolean {
  switch (definition.id as KpiId) {
    case 'dataset-overview':
      return model.dataset.present;
    case 'section-count':
      return model.sectionReferences.present;
    case 'recommendation-count':
      return model.recommendationReferences.present;
    case 'action-plan-count':
      return model.actionPlanReferences.present;
    case 'narrative-count':
      return model.narrativeReferences.present;
    case 'report-status':
      return (
        resolveReportStatus(context) !== null || model.reportSummary.present
      );
    default:
      return false;
  }
}

function projectValue(
  definition: KpiDefinition,
  model: DashboardModel,
  context: KpiBoardContext
): string | number | null {
  switch (definition.id as KpiId) {
    case 'dataset-overview':
      return model.dataset.datasetId || null;
    case 'section-count':
      return model.sectionReferences.referenceCount;
    case 'recommendation-count':
      return model.recommendationReferences.referenceCount;
    case 'action-plan-count':
      return model.actionPlanReferences.referenceCount;
    case 'narrative-count':
      return model.narrativeReferences.referenceCount;
    case 'report-status': {
      const status = resolveReportStatus(context);
      if (status) {
        return status;
      }
      return model.reportSummary.present ? 'ozet-mevcut' : null;
    }
    default:
      return null;
  }
}

function toFoundationKpi(
  definition: KpiDefinition,
  value: string | number | null
): DashboardKPI {
  return {
    kpiId: `kpi:${definition.id}`,
    name: definition.name,
    unit: definition.unit,
    value
  };
}

function buildRecord(
  definition: KpiDefinition,
  model: DashboardModel,
  context: KpiBoardContext
): KpiRecord {
  const sourcePresent = isSourcePresent(definition, model, context);
  const value = projectValue(definition, model, context);
  const kpi = toFoundationKpi(definition, value);
  return {
    id: kpi.kpiId,
    kpiId: definition.id,
    kpiCode: definition.kpiCode,
    name: definition.name,
    unit: definition.unit,
    order: definition.order,
    sourcePartId: definition.sourcePartId,
    sourcePresent,
    value,
    kpi
  };
}

/**
 * KPI Board Runtime.
 */
export class KpiBoardRuntime {
  private readonly registry: KpiRegistryRuntime;

  constructor(registry?: KpiRegistryRuntime) {
    this.registry = registry ?? createKpiRegistryRuntime(true);
  }

  getRegistry(): KpiRegistryRuntime {
    return this.registry;
  }

  /**
   * DashboardModel → KPI Records.
   */
  compute(context: KpiBoardContext): KpiBoardResult {
    const timer = startDashboardStageTimer();
    const startMark = nowMs();
    const warnings: KpiBoardWarning[] = [];
    const generatedAt = new Date().toISOString();

    const model = resolveDashboardModel(context);
    const hasModelInput = Boolean(
      context.dashboardModel || context.dashboardModelResult
    );

    if (!hasModelInput) {
      warnings.push({
        code: 'EMPTY_DASHBOARD_MODEL',
        message: 'DashboardModel yok; boş KPI seti üretildi.'
      });
    }

    let definitions = this.registry.getEnabled();
    if (context.kpiIds && context.kpiIds.length > 0) {
      const allowed = new Set(context.kpiIds);
      definitions = Object.freeze(
        definitions.filter((item) => allowed.has(item.id))
      );
    }

    if (definitions.length === 0) {
      warnings.push({
        code: 'NO_KPIS_ENABLED',
        message: 'Aktif KPI tanımı yok.'
      });
    }

    const records: KpiRecord[] = [];
    let registryMappingCount = 0;
    const mappedSourceParts: string[] = [];

    for (const definition of definitions) {
      const record = buildRecord(definition, model, context);
      if (record.sourcePresent) {
        registryMappingCount += 1;
        if (!mappedSourceParts.includes(definition.sourcePartId)) {
          mappedSourceParts.push(definition.sourcePartId);
        }
      } else if (hasModelInput) {
        warnings.push({
          code: 'SOURCE_PART_EMPTY',
          message: `KPI “${definition.id}” için kaynak parça boş.`,
          kpiId: definition.id
        });
      }
      records.push(record);
    }

    // Deterministic order by definition.order
    records.sort((a, b) => a.order - b.order);

    const kpis = Object.freeze(records.map((item) => item.kpi));
    const metadata: KpiBoardMetadata = {
      dashboardModelId: model.metadata.id || 'unknown-dashboard-model',
      locale: context.locale,
      generatedAt,
      kpiIds: Object.freeze(records.map((item) => item.kpiId)),
      mappedSourceParts: Object.freeze(mappedSourceParts)
    };

    const timing = endDashboardStageTimer(timer);
    const telemetry: KpiBoardTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      kpiCount: records.length,
      registryMappingCount,
      warningCount: warnings.length
    };

    return {
      records: Object.freeze(records),
      kpis,
      metadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createKpiBoardRuntime(
  registry?: KpiRegistryRuntime
): KpiBoardRuntime {
  return new KpiBoardRuntime(registry);
}

export default KpiBoardRuntime;
