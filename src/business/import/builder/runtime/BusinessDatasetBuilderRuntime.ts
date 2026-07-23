/**
 * İSTEBUL Business Import Engine — BusinessDatasetBuilderRuntime (PR-101I).
 *
 * NormalizationResult → BusinessDataset dönüşümü.
 * CSV/Excel/Normalizer/AI yoktur; mevcut çıktıları tüketir.
 */

import { BUSINESS_DATASET_SCHEMA_VERSION } from '../../../dataset/schemas/DatasetSchemaConstants';
import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';
import type { BusinessRow } from '../../../dataset/models/BusinessRow';
import {
  endStageTimer,
  startStageTimer
} from '../../pipeline/runtime/timing';
import type { ImportError } from '../../types/ImportError';
import type { ImportResult } from '../../types/ImportResult';
import type { NormalizationWarning } from '../../normalizers/runtime/NormalizationResult';
import type { NormalizedField } from '../../normalizers/runtime/NormalizedField';
import type { NormalizedRecord } from '../../normalizers/runtime/NormalizedRecord';
import type { ValidationIssue } from '../../validators/runtime/ValidationIssue';
import type { BuilderContext } from './BuilderContext';
import type {
  BuilderResult,
  BuilderTelemetry
} from './BuilderResult';
import type { DatasetAssembly } from './DatasetAssembly';
import type { EntityAssembly } from './EntityAssembly';
import type { FieldAssembly } from './FieldAssembly';
import type { RecordAssembly } from './RecordAssembly';
import {
  toNormalizationSummary
} from './NormalizationSummary';
import {
  toValidationSummary,
  toBusinessValidationResult,
  type ValidationSummary
} from './ValidationSummary';
import {
  cellValueFromField,
  columnFromNormalizedField,
  entityDisplayName,
  groupFieldDefinitionsByEntity,
  mapImportSourceToBusinessSource,
  resolveEntityTypeId
} from './helpers';

function resolveDatasetId(context: BuilderContext): string {
  return context.datasetId ?? `ds-${context.request.id}`;
}

function resolveLocale(context: BuilderContext): 'tr' | 'en' {
  return (
    context.locale ??
    context.importContext?.locale ??
    context.request.locale ??
    'tr'
  );
}

function resolveTitle(context: BuilderContext): string {
  return (
    context.title ??
    context.request.source?.label ??
    'İçe Aktarılan Dataset'
  );
}

function assembleField(field: NormalizedField, order: number): FieldAssembly {
  return {
    sourceField: field,
    column: columnFromNormalizedField(field, order),
    cellValue: cellValueFromField(field),
    warningCodes: Object.freeze([...field.warningCodes])
  };
}

function fieldsForEntityInRecord(
  record: NormalizedRecord,
  entityType: BusinessEntityTypeId,
  defaultEntityType: BusinessEntityTypeId
): NormalizedField[] {
  return record.fields.filter(
    (f) =>
      resolveEntityTypeId(f.entityType, defaultEntityType) === entityType
  );
}

function buildRecordAssembly(
  record: NormalizedRecord,
  entityType: BusinessEntityTypeId,
  columnOrder: readonly NormalizedField[],
  defaultEntityType: BusinessEntityTypeId
): RecordAssembly | undefined {
  const entityFields = fieldsForEntityInRecord(
    record,
    entityType,
    defaultEntityType
  );
  if (entityFields.length === 0) {
    return undefined;
  }

  const fieldAssemblies: FieldAssembly[] = [];
  const values: Record<string, BusinessRow['values'][string]> = {};

  for (const columnDef of columnOrder) {
    const field = entityFields.find((f) => f.fieldName === columnDef.fieldName);
    if (!field) {
      continue;
    }
    const order = columnOrder.findIndex((c) => c.fieldName === field.fieldName);
    const assembly = assembleField(field, order);
    fieldAssemblies.push(assembly);
    values[assembly.column.id] = assembly.cellValue;
  }

  if (fieldAssemblies.length === 0) {
    return undefined;
  }

  return {
    recordIndex: record.index,
    entityType,
    row: {
      id: `row-${entityType}-${record.index}`,
      values: Object.freeze({ ...values }),
      sourceRef: `kayit-${record.index}`
    },
    fields: Object.freeze(fieldAssemblies)
  };
}

function buildEntityAssembly(
  entityType: BusinessEntityTypeId,
  columnDefs: readonly NormalizedField[],
  records: readonly NormalizedRecord[],
  defaultEntityType: BusinessEntityTypeId
): EntityAssembly {
  const recordAssemblies: RecordAssembly[] = [];
  for (const record of records) {
    const assembly = buildRecordAssembly(
      record,
      entityType,
      columnDefs,
      defaultEntityType
    );
    if (assembly) {
      recordAssemblies.push(assembly);
    }
  }

  const columns = columnDefs.map((field, index) =>
    columnFromNormalizedField(field, index)
  );

  return {
    entity: {
      id: `ent-${entityType}`,
      entityType,
      name: entityDisplayName(entityType),
      layout: 'tablo',
      columns: Object.freeze(columns),
      rows: Object.freeze(recordAssemblies.map((r) => r.row))
    },
    records: Object.freeze(recordAssemblies),
    fieldCount: columnDefs.length
  };
}

function collectEntityTypes(
  context: BuilderContext
): BusinessEntityTypeId[] {
  const defaultEntityType = context.defaultEntityType ?? 'urun';
  const types = new Set<BusinessEntityTypeId>();

  for (const field of context.normalizationResult.fields) {
    types.add(resolveEntityTypeId(field.entityType, defaultEntityType));
  }
  for (const record of context.normalizationResult.records) {
    for (const field of record.fields) {
      types.add(resolveEntityTypeId(field.entityType, defaultEntityType));
    }
  }

  return [...types].sort();
}

function deriveColumnDefsFromRecords(
  records: readonly NormalizedRecord[],
  entityType: BusinessEntityTypeId,
  defaultEntityType: BusinessEntityTypeId
): NormalizedField[] {
  const seen = new Map<string, NormalizedField>();
  for (const record of records) {
    for (const field of fieldsForEntityInRecord(
      record,
      entityType,
      defaultEntityType
    )) {
      if (!seen.has(field.fieldName)) {
        seen.set(field.fieldName, field);
      }
    }
  }
  return [...seen.values()];
}

function assembleDataset(context: BuilderContext): DatasetAssembly {
  const defaultEntityType = context.defaultEntityType ?? 'urun';
  const now = new Date().toISOString();
  const datasetId = resolveDatasetId(context);
  const locale = resolveLocale(context);

  const fieldGroups = groupFieldDefinitionsByEntity(
    context.normalizationResult.fields,
    defaultEntityType
  );

  const entityTypes = collectEntityTypes(context);
  const entityAssemblies: EntityAssembly[] = [];

  for (const entityType of entityTypes) {
    const columnDefs =
      fieldGroups.get(entityType) ??
      deriveColumnDefsFromRecords(
        context.normalizationResult.records,
        entityType,
        defaultEntityType
      );
    if (columnDefs.length === 0) {
      continue;
    }
    entityAssemblies.push(
      buildEntityAssembly(
        entityType,
        columnDefs,
        context.normalizationResult.records,
        defaultEntityType
      )
    );
  }

  const validation = context.validationResult
    ? toBusinessValidationResult(context.validationResult, now)
    : undefined;

  return {
    metadata: {
      id: datasetId,
      title: resolveTitle(context),
      description: context.description,
      locale,
      createdAt: now,
      updatedAt: now,
      tags: context.tags
    },
    version: {
      schemaVersion: BUSINESS_DATASET_SCHEMA_VERSION,
      revision: context.revision ?? '1',
      effectiveAt: now,
      changeSummary: 'İçe aktarma ile oluşturuldu'
    },
    source: mapImportSourceToBusinessSource(context.request.source, now),
    entities: Object.freeze(entityAssemblies),
    relations: Object.freeze([]),
    validation
  };
}

function assemblyToDataset(
  assembly: DatasetAssembly,
  datasetId: string
): BusinessDataset {
  return {
    id: datasetId,
    metadata: assembly.metadata,
    version: assembly.version,
    source: assembly.source,
    entities: Object.freeze(assembly.entities.map((e) => e.entity)),
    relations: assembly.relations,
    validation: assembly.validation
  };
}

function countUniqueFields(assembly: DatasetAssembly): number {
  const names = new Set<string>();
  for (const entity of assembly.entities) {
    for (const column of entity.entity.columns) {
      names.add(`${entity.entity.entityType}:${column.id}`);
    }
  }
  return names.size;
}

function countRecords(assembly: DatasetAssembly): number {
  return assembly.entities.reduce(
    (sum, entity) => sum + entity.entity.rows.length,
    0
  );
}

function normalizationWarningToImportError(
  warning: NormalizationWarning
): ImportError {
  return {
    code: warning.code,
    message: warning.message,
    stage: 'normalizasyon',
    detail: warning.path ?? warning.sourceKey,
    recoverable: true
  };
}

function validationIssueToImportError(issue: ValidationIssue): ImportError {
  return {
    code: issue.code,
    message: issue.message,
    stage: 'dogrulama',
    detail: issue.path ?? issue.detail,
    recoverable: issue.severity === 'INFO' || issue.severity === 'WARNING'
  };
}

function buildImportWarnings(context: BuilderContext): ImportError[] {
  const warnings: ImportError[] = [];
  for (const w of context.normalizationResult.warnings) {
    warnings.push(normalizationWarningToImportError(w));
  }
  if (context.validationResult) {
    for (const issue of context.validationResult.issues) {
      if (issue.severity === 'INFO' || issue.severity === 'WARNING') {
        warnings.push(validationIssueToImportError(issue));
      }
    }
  }
  return warnings;
}

function buildImportResult(
  context: BuilderContext,
  dataset: BusinessDataset,
  completedAt: string
): ImportResult {
  return {
    requestId: context.request.id,
    status: 'basarili',
    lastStage: 'dataset-olusturma',
    dataset,
    errors: [],
    warnings: Object.freeze(buildImportWarnings(context)),
    completedAt
  };
}

/**
 * BusinessDataset builder orchestrator.
 */
export class BusinessDatasetBuilderRuntime {
  /**
   * NormalizationResult → BusinessDataset derler.
   */
  build(context: BuilderContext): BuilderResult {
    const timer = startStageTimer();
    const assembly = assembleDataset(context);
    const datasetId = resolveDatasetId(context);
    const dataset = assemblyToDataset(assembly, datasetId);
    const { endedAt, durationMs } = endStageTimer(timer);

    const telemetry: BuilderTelemetry = {
      entityCount: assembly.entities.length,
      recordCount: countRecords(assembly),
      fieldCount: countUniqueFields(assembly),
      durationMs,
      startedAt: timer.startedAt,
      endedAt
    };

    const normalizationSummary = toNormalizationSummary(
      context.normalizationResult
    );
    const validationSummary: ValidationSummary | undefined =
      context.validationResult
        ? toValidationSummary(context.validationResult)
        : undefined;

    const importResult = buildImportResult(context, dataset, endedAt);

    return {
      dataset,
      importResult,
      assembly,
      telemetry,
      normalizationSummary,
      validationSummary
    };
  }

  /**
   * Yalnızca ara derleme modeli üretir (ImportResult yok).
   */
  assemble(context: BuilderContext): DatasetAssembly {
    return assembleDataset(context);
  }
}

/**
 * Fabrika.
 */
export function createBusinessDatasetBuilderRuntime(): BusinessDatasetBuilderRuntime {
  return new BusinessDatasetBuilderRuntime();
}
