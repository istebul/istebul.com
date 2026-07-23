/**
 * İSTEBUL Business Analysis Engine — KpiEngineRuntime (PR-102B).
 *
 * BusinessDataset üzerinden temel KPI metriklerini hesaplar.
 * Foundation `IKPIEngine` sözleşmesini uygular; PR-102A dosyalarına dokunmaz.
 */

import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { AnalysisContext } from '../../models/AnalysisContext';
import type { KPIResult as FoundationKPIResult } from '../../models/KPIResult';
import type { IKPIEngine } from '../../ports/IKPIEngine';
import {
  endAnalysisStageTimer,
  nowMs,
  startAnalysisStageTimer
} from '../../pipeline/runtime/AnalysisTiming';
import type { KpiCalculation } from './KpiCalculation';
import type { KpiContext } from './KpiContext';
import { createKpiContext } from './KpiContext';
import type { KpiDefinition } from './KpiDefinition';
import type { KpiRegistryRuntime } from './KpiRegistryRuntime';
import { createKpiRegistryRuntime } from './KpiRegistryRuntime';
import type {
  KpiResult,
  KpiTelemetry,
  KpiWarning
} from './KpiResult';
import type { KpiValue } from './KpiValue';
import {
  computeDatasetFieldStats,
  roundAverage,
  roundRatio,
  type DatasetFieldStats
} from './datasetMetrics';

function toFoundationResult(
  definition: KpiDefinition,
  value: KpiValue,
  unavailableReason?: string
): FoundationKPIResult {
  return {
    kpiId: definition.id,
    name: definition.name,
    unit: definition.unit,
    value: value.raw,
    unavailableReason,
    confidence: value.confidence
  };
}

function computeValueForDefinition(
  definition: KpiDefinition,
  stats: DatasetFieldStats
): { value: KpiValue; unavailableReason?: string; warning?: KpiWarning } {
  switch (definition.id) {
    case 'entity-count':
      return {
        value: { raw: stats.entityCount, confidence: 1 }
      };
    case 'record-count':
      return {
        value: { raw: stats.recordCount, confidence: 1 }
      };
    case 'column-count':
      return {
        value: { raw: stats.columnCount, confidence: 1 }
      };
    case 'total-field-count':
      return {
        value: { raw: stats.totalFieldCount, confidence: 1 }
      };
    case 'empty-value-count':
      return {
        value: { raw: stats.emptyValueCount, confidence: 1 }
      };
    case 'null-value-count':
      return {
        value: { raw: stats.nullValueCount, confidence: 1 }
      };
    case 'empty-value-ratio': {
      if (stats.totalFieldCount === 0) {
        return {
          value: { raw: 0, confidence: 0.5 },
          warning: {
            code: 'RATIO_NO_FIELDS',
            message: 'Toplam alan sayısı 0; empty-value-ratio 0 kabul edildi.',
            kpiId: definition.id
          }
        };
      }
      return {
        value: {
          raw: roundRatio(stats.emptyValueCount / stats.totalFieldCount),
          confidence: 1
        }
      };
    }
    case 'filled-value-ratio': {
      if (stats.totalFieldCount === 0) {
        return {
          value: { raw: 0, confidence: 0.5 },
          warning: {
            code: 'RATIO_NO_FIELDS',
            message: 'Toplam alan sayısı 0; filled-value-ratio 0 kabul edildi.',
            kpiId: definition.id
          }
        };
      }
      return {
        value: {
          raw: roundRatio(stats.filledValueCount / stats.totalFieldCount),
          confidence: 1
        }
      };
    }
    case 'average-column-count': {
      if (stats.entityCount === 0) {
        return {
          value: { raw: 0, confidence: 0.5 },
          warning: {
            code: 'AVERAGE_NO_ENTITIES',
            message: 'Entity yok; average-column-count 0 kabul edildi.',
            kpiId: definition.id
          }
        };
      }
      return {
        value: {
          raw: roundAverage(stats.averageColumnCount),
          confidence: 1
        }
      };
    }
    case 'average-record-width': {
      if (stats.recordCount === 0) {
        return {
          value: { raw: 0, confidence: 0.5 },
          warning: {
            code: 'AVERAGE_NO_RECORDS',
            message: 'Kayıt yok; average-record-width 0 kabul edildi.',
            kpiId: definition.id
          }
        };
      }
      return {
        value: {
          raw: roundAverage(stats.averageRecordWidth),
          confidence: 1
        }
      };
    }
    case 'dataset-version': {
      if (!stats.datasetVersion) {
        return {
          value: { raw: null, confidence: 0 },
          unavailableReason: 'Dataset version bilgisi yok.',
          warning: {
            code: 'METADATA_VERSION_MISSING',
            message: 'Dataset version bilgisi bulunamadı.',
            kpiId: definition.id
          }
        };
      }
      return {
        value: { raw: stats.datasetVersion, confidence: 1 }
      };
    }
    case 'entity-names': {
      if (stats.entityNames.length === 0) {
        return {
          value: { raw: '', confidence: 0.5 },
          warning: {
            code: 'METADATA_NO_ENTITIES',
            message: 'Entity adı listesi boş.',
            kpiId: definition.id
          }
        };
      }
      return {
        value: {
          raw: stats.entityNames.join(', '),
          confidence: 1
        }
      };
    }
    default:
      return {
        value: { raw: null, confidence: 0 },
        unavailableReason: `KPI hesaplayıcısı yok: ${definition.id}`,
        warning: {
          code: 'KPI_HANDLER_MISSING',
          message: `KPI için hesaplayıcı bulunamadı: ${definition.id}`,
          kpiId: definition.id
        }
      };
  }
}

/**
 * KPI Engine Runtime.
 */
export class KpiEngineRuntime implements IKPIEngine {
  private readonly registry: KpiRegistryRuntime;

  constructor(registry?: KpiRegistryRuntime) {
    this.registry = registry ?? createKpiRegistryRuntime(true);
  }

  getRegistry(): KpiRegistryRuntime {
    return this.registry;
  }

  /**
   * Foundation `IKPIEngine.calculate` — tekil KPIResult listesi döner.
   */
  async calculate(
    context: AnalysisContext,
    dataset: BusinessDataset,
    kpiIds: readonly string[]
  ): Promise<readonly FoundationKPIResult[]> {
    const result = this.compute(
      createKpiContext({
        dataset,
        analysisContext: context,
        locale: context.locale,
        kpiIds
      })
    );
    return result.kpiResults;
  }

  /**
   * Detaylı runtime sonucu — hesaplamalar, özet, uyarı ve telemetri.
   */
  compute(context: KpiContext): KpiResult {
    const timer = startAnalysisStageTimer();
    const startMark = nowMs();
    const warnings: KpiWarning[] = [];
    const calculations: KpiCalculation[] = [];
    const kpiResults: FoundationKPIResult[] = [];

    if (!context?.dataset || typeof context.dataset !== 'object') {
      const timing = endAnalysisStageTimer(timer);
      warnings.push({
        code: 'DATASET_MISSING',
        message: 'KPI hesaplaması için dataset zorunludur.'
      });
      const telemetry: KpiTelemetry = {
        durationMs: timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
        startedAt: timing.startedAt,
        endedAt: timing.endedAt,
        calculatedKpiCount: 0,
        warningCount: warnings.length,
        datasetSize: {
          entityCount: 0,
          recordCount: 0,
          columnCount: 0,
          totalFieldCount: 0
        }
      };
      return {
        calculations: Object.freeze([]),
        kpiResults: Object.freeze([]),
        summary: {
          calculatedCount: 0,
          requestedCount: 0,
          unavailableCount: 0,
          success: false
        },
        warnings: Object.freeze(warnings),
        telemetry
      };
    }

    const stats = computeDatasetFieldStats(context.dataset);

    if (stats.entityCount === 0) {
      warnings.push({
        code: 'EMPTY_DATASET',
        message: 'Dataset entity içermiyor.'
      });
    }

    const requestedIds =
      context.kpiIds && context.kpiIds.length > 0
        ? [...context.kpiIds]
        : this.registry.getAll().map((item) => item.id);

    let unavailableCount = 0;

    for (const kpiId of requestedIds) {
      const definition = this.registry.getById(kpiId);
      const kpiTimer = startAnalysisStageTimer();

      if (!definition) {
        unavailableCount += 1;
        const timing = endAnalysisStageTimer(kpiTimer);
        warnings.push({
          code: 'KPI_NOT_REGISTERED',
          message: `KPI kayıtlı değil: ${kpiId}`,
          kpiId
        });
        calculations.push({
          definition: {
            id: kpiId,
            name: kpiId,
            description: 'Kayıtlı olmayan KPI',
            category: 'dataset-metrics',
            unit: '',
            calculationType: 'adet',
            order: Number.MAX_SAFE_INTEGER
          },
          value: { raw: null, confidence: 0 },
          durationMs: timing.durationMs,
          unavailableReason: 'KPI registry içinde bulunamadı.'
        });
        kpiResults.push({
          kpiId,
          name: kpiId,
          unit: '',
          value: null,
          unavailableReason: 'KPI registry içinde bulunamadı.',
          confidence: 0
        });
        continue;
      }

      const outcome = computeValueForDefinition(definition, stats);
      const timing = endAnalysisStageTimer(kpiTimer);
      if (outcome.warning) {
        warnings.push(outcome.warning);
      }
      if (outcome.unavailableReason) {
        unavailableCount += 1;
      }

      calculations.push({
        definition,
        value: outcome.value,
        durationMs: timing.durationMs,
        unavailableReason: outcome.unavailableReason
      });
      kpiResults.push(
        toFoundationResult(definition, outcome.value, outcome.unavailableReason)
      );
    }

    const timing = endAnalysisStageTimer(timer);
    const calculatedCount = kpiResults.filter(
      (item) => item.unavailableReason === undefined
    ).length;

    const telemetry: KpiTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      calculatedKpiCount: calculatedCount,
      warningCount: warnings.length,
      datasetSize: {
        entityCount: stats.entityCount,
        recordCount: stats.recordCount,
        columnCount: stats.columnCount,
        totalFieldCount: stats.totalFieldCount
      }
    };

    return {
      calculations: Object.freeze(calculations),
      kpiResults: Object.freeze(kpiResults),
      summary: {
        calculatedCount,
        requestedCount: requestedIds.length,
        unavailableCount,
        success: calculatedCount > 0
      },
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createKpiEngineRuntime(
  registry?: KpiRegistryRuntime
): KpiEngineRuntime {
  return new KpiEngineRuntime(registry);
}

export default KpiEngineRuntime;
