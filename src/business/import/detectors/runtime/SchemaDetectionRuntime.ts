/**
 * İSTEBUL Business Import Engine — SchemaDetectionRuntime (PR-101D).
 *
 * Yalnızca şema tespiti. CSV/Excel/AI/BusinessDataset dönüşümü yok.
 */

import type { ImportDetectionResult } from '../../ports/IImportDetector';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../pipeline/runtime/timing';
import type { DetectedColumn } from './DetectedColumn';
import type { DetectedEntity } from './DetectedEntity';
import {
  confidenceBand,
  roundConfidence,
  type DetectionConfidence
} from './DetectionConfidence';
import type { SchemaCandidate } from './SchemaCandidate';
import type { SchemaContext } from './SchemaContext';
import type {
  ConfidenceDistribution,
  SchemaDetectionTelemetry,
  SchemaResult
} from './SchemaResult';
import {
  createSchemaRegistryRuntime,
  SchemaRegistryRuntime
} from './SchemaRegistryRuntime';
import type { TabularSlice } from './detectors/types';

function emptyDistribution(): ConfidenceDistribution {
  return { high: 0, medium: 0, low: 0 };
}

function averageConfidence(values: readonly number[]): DetectionConfidence {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((acc, v) => acc + v, 0);
  return roundConfidence(sum / values.length);
}

/**
 * Schema Detection Runtime orchestrator.
 */
export class SchemaDetectionRuntime {
  private readonly registry: SchemaRegistryRuntime;

  constructor(registry?: SchemaRegistryRuntime) {
    this.registry = registry ?? createSchemaRegistryRuntime(true);
  }

  getRegistry(): SchemaRegistryRuntime {
    return this.registry;
  }

  /**
   * Ham girdiden şema tespiti üretir — dönüştürmez.
   */
  detect(context: SchemaContext): SchemaResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    const slice = this.resolveSlice(context);
    const columns = slice
      ? this.detectColumns(slice, context)
      : ([] as DetectedColumn[]);
    const entities = this.detectEntities(columns, context);
    const candidates = this.buildCandidates(slice, columns, entities);
    const overallConfidence = this.computeOverall(
      columns,
      entities,
      candidates
    );

    const distribution = emptyDistribution();
    for (const col of columns) {
      distribution[confidenceBand(col.confidence)] += 1;
    }

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: SchemaDetectionTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      columnsInspected: columns.length,
      candidatesProduced: candidates.length,
      confidenceDistribution: distribution
    };

    return {
      columns: Object.freeze(columns),
      entities: Object.freeze(entities),
      candidates: Object.freeze(candidates),
      columnKeys: Object.freeze(columns.map((c) => c.name)),
      rowCountEstimate: slice?.rowCount ?? 0,
      overallConfidence,
      telemetry
    };
  }

  /**
   * Foundation `ImportDetectionResult` şekline projeksiyon (port değişmez).
   */
  toImportDetectionResult(result: SchemaResult): ImportDetectionResult {
    return {
      columnKeys: result.columnKeys,
      rowCountEstimate: result.rowCountEstimate,
      entitySuggestions: result.entities.map((e) => ({
        entityType: e.entityType,
        confidence: e.confidence,
        label: e.label
      })),
      confidence: result.overallConfidence
    };
  }

  private resolveSlice(context: SchemaContext): TabularSlice | null {
    for (const detector of this.registry.schemaDetectors.getAll()) {
      const slice = detector.detect(context);
      if (slice) {
        return slice;
      }
    }
    return null;
  }

  private detectColumns(
    slice: TabularSlice,
    context: SchemaContext
  ): DetectedColumn[] {
    const columnDetectors = this.registry.columnDetectors.getAll();
    const primary = columnDetectors[0];
    const columns: DetectedColumn[] = [];
    for (let i = 0; i < slice.columnNames.length; i += 1) {
      const name = slice.columnNames[i] ?? `col_${i}`;
      const values = slice.columnValues[i] ?? [];
      let detected: DetectedColumn | null = null;
      if (primary) {
        detected = primary.detect(name, i, values, context);
      }
      for (const detector of columnDetectors.slice(1)) {
        const alt = detector.detect(name, i, values, context);
        if (alt && (!detected || alt.confidence > detected.confidence)) {
          detected = alt;
        }
      }
      if (detected) {
        columns.push(detected);
      }
    }
    return columns;
  }

  private detectEntities(
    columns: readonly DetectedColumn[],
    context: SchemaContext
  ): DetectedEntity[] {
    const merged = new Map<string, DetectedEntity>();
    for (const detector of this.registry.entityDetectors.getAll()) {
      for (const entity of detector.detect(columns, context)) {
        const prev = merged.get(entity.entityType);
        if (!prev || entity.confidence > prev.confidence) {
          merged.set(entity.entityType, entity);
        }
      }
    }
    return [...merged.values()].sort((a, b) => b.confidence - a.confidence);
  }

  private buildCandidates(
    slice: TabularSlice | null,
    columns: readonly DetectedColumn[],
    entities: readonly DetectedEntity[]
  ): SchemaCandidate[] {
    if (!slice || columns.length === 0) {
      return [];
    }
    const confidence = averageConfidence([
      ...columns.map((c) => c.confidence),
      ...entities.slice(0, 3).map((e) => e.confidence)
    ]);
    const candidate: SchemaCandidate = {
      id: `candidate-${slice.sourceShape}`,
      label: `Şema adayı (${slice.sourceShape})`,
      sourceShape: slice.sourceShape,
      columns,
      entities,
      confidence,
      rowCountEstimate: slice.rowCount
    };
    return [candidate];
  }

  private computeOverall(
    columns: readonly DetectedColumn[],
    entities: readonly DetectedEntity[],
    candidates: readonly SchemaCandidate[]
  ): DetectionConfidence {
    if (candidates.length > 0) {
      return candidates[0]!.confidence;
    }
    if (columns.length === 0) {
      return 0;
    }
    return averageConfidence([
      ...columns.map((c) => c.confidence),
      ...entities.slice(0, 2).map((e) => e.confidence)
    ]);
  }
}

export function createSchemaDetectionRuntime(
  registry?: SchemaRegistryRuntime
): SchemaDetectionRuntime {
  return new SchemaDetectionRuntime(registry);
}

export default SchemaDetectionRuntime;
