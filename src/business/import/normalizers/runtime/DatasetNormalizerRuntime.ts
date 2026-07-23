/**
 * İSTEBUL Business Import Engine — DatasetNormalizerRuntime (PR-101H).
 *
 * Semantic Mapping çıktısını normalize edilmiş kayıt modeline dönüştürür.
 * BusinessDataset üretmez; CSV/Excel/AI yoktur.
 */

import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../pipeline/runtime/timing';
import type { NormalizedField } from './NormalizedField';
import type { NormalizedRecord } from './NormalizedRecord';
import type { NormalizationContext } from './NormalizationContext';
import { createNormalizationContext } from './NormalizationContext';
import type {
  AppliedNormalizationRule,
  NormalizationResult,
  NormalizationTelemetry,
  NormalizationWarning
} from './NormalizationResult';
import type { FieldNormalizationState } from './NormalizationRule';
import {
  createNormalizationRegistryRuntime,
  NormalizationRegistryRuntime
} from './NormalizationRegistryRuntime';
import { inferPrimitiveType } from './helpers';

function initialState(
  sourceKey: string,
  rawValue: unknown,
  fieldName: string
): FieldNormalizationState {
  return {
    sourceKey,
    fieldName,
    rawValue,
    value: rawValue,
    primitiveType: inferPrimitiveType(rawValue),
    warnings: [],
    appliedRuleIds: [],
    typeTransformed: false
  };
}

function stateToField(state: FieldNormalizationState): NormalizedField {
  let value: NormalizedField['value'];
  if (state.value === null || state.value === undefined) {
    value = null;
  } else if (
    typeof state.value === 'string' ||
    typeof state.value === 'number' ||
    typeof state.value === 'boolean'
  ) {
    value = state.value;
  } else if (Array.isArray(state.value)) {
    value = Object.freeze([...state.value]);
  } else {
    value = String(state.value);
  }
  return {
    fieldName: state.fieldName,
    sourceKey: state.sourceKey,
    entityType: state.entityType,
    primitiveType: state.primitiveType,
    rawValue: state.rawValue,
    value,
    dateIso: state.dateIso,
    appliedRules: Object.freeze([...state.appliedRuleIds]),
    warningCodes: Object.freeze(state.warnings.map((w) => w.code))
  };
}

/**
 * Dataset Normalizer Runtime orchestrator.
 */
export class DatasetNormalizerRuntime {
  private readonly registry: NormalizationRegistryRuntime;

  constructor(registry?: NormalizationRegistryRuntime) {
    this.registry = registry ?? createNormalizationRegistryRuntime(true);
  }

  getRegistry(): NormalizationRegistryRuntime {
    return this.registry;
  }

  /**
   * Semantic mapping + ham satırları normalize eder.
   */
  normalize(context: NormalizationContext): NormalizationResult {
    const ctx = createNormalizationContext(context);
    const timer = startStageTimer();
    const startMark = nowMs();
    const rules = this.registry.getAll();

    const mappings =
      ctx.mappings ?? ctx.semanticResult?.mappings ?? [];
    const mappingBySource = new Map(
      mappings.map((m) => [m.sourceKey, m])
    );

    const records: NormalizedRecord[] = [];
    const allWarnings: NormalizationWarning[] = [];
    const appliedCounts = new Map<string, number>();
    let rulesExecuted = 0;
    let fieldsNormalized = 0;
    let typesTransformed = 0;

    const sourceKeys = new Set<string>();
    for (const m of mappings) {
      sourceKeys.add(m.sourceKey);
    }
    for (const row of ctx.rows) {
      for (const key of Object.keys(row)) {
        sourceKeys.add(key);
      }
    }

    for (let rowIndex = 0; rowIndex < ctx.rows.length; rowIndex += 1) {
      const row = ctx.rows[rowIndex]!;
      const fields: NormalizedField[] = [];

      for (const sourceKey of sourceKeys) {
        if (!(sourceKey in row) && !mappingBySource.has(sourceKey)) {
          continue;
        }
        const rawValue = row[sourceKey];
        const map = mappingBySource.get(sourceKey);
        const fieldName = map?.targetColumnId ?? sourceKey;

        let state = initialState(sourceKey, rawValue, fieldName);
        if (map) {
          state.entityType = map.entityType;
        }

        for (const rule of rules) {
          rulesExecuted += 1;
          const before = state.appliedRuleIds.length;
          state = rule.apply(state, ctx);
          if (state.appliedRuleIds.length > before) {
            const lastId = state.appliedRuleIds[state.appliedRuleIds.length - 1]!;
            appliedCounts.set(lastId, (appliedCounts.get(lastId) ?? 0) + 1);
          }
        }

        if (state.typeTransformed) {
          typesTransformed += 1;
        }
        for (const w of state.warnings) {
          allWarnings.push({
            ...w,
            path: `records[${rowIndex}].${state.fieldName}`
          });
        }

        fields.push(stateToField(state));
        fieldsNormalized += 1;
      }

      records.push({
        index: rowIndex,
        fields: Object.freeze(fields)
      });
    }

    const fieldSummary = new Map<string, NormalizedField>();
    for (const record of records) {
      for (const field of record.fields) {
        if (!fieldSummary.has(field.fieldName)) {
          fieldSummary.set(field.fieldName, field);
        }
      }
    }

    const appliedRules: AppliedNormalizationRule[] = [...appliedCounts.entries()]
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count);

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: NormalizationTelemetry = {
      rulesExecuted,
      fieldsNormalized,
      typesTransformed,
      warningCount: allWarnings.length,
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      recordCount: records.length
    };

    return {
      records: Object.freeze(records),
      fields: Object.freeze([...fieldSummary.values()]),
      warnings: Object.freeze(allWarnings),
      appliedRules: Object.freeze(appliedRules),
      telemetry
    };
  }
}

export function createDatasetNormalizerRuntime(
  registry?: NormalizationRegistryRuntime
): DatasetNormalizerRuntime {
  return new DatasetNormalizerRuntime(registry);
}

export default DatasetNormalizerRuntime;
