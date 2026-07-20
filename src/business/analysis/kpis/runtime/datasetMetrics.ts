/**
 * İSTEBUL Business Analysis Engine — dataset metrik yardımcıları (PR-102B).
 */

import type { BusinessCellValue } from '../../../dataset/models/BusinessRow';
import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { KpiDatasetSize } from './KpiResult';

export interface DatasetFieldStats extends KpiDatasetSize {
  emptyValueCount: number;
  nullValueCount: number;
  filledValueCount: number;
  averageColumnCount: number;
  averageRecordWidth: number;
  entityNames: readonly string[];
  datasetVersion: string;
}

function isEmptyString(value: BusinessCellValue): boolean {
  return typeof value === 'string' && value.trim() === '';
}

/**
 * Dataset üzerinden temel alan istatistiklerini hesaplar.
 */
export function computeDatasetFieldStats(
  dataset: BusinessDataset
): DatasetFieldStats {
  const entities = Array.isArray(dataset?.entities) ? dataset.entities : [];
  let recordCount = 0;
  let columnCount = 0;
  let totalFieldCount = 0;
  let emptyValueCount = 0;
  let nullValueCount = 0;
  let filledValueCount = 0;
  let recordWidthSum = 0;
  let recordWidthSamples = 0;

  const entityNames: string[] = [];

  for (const entity of entities) {
    entityNames.push(
      typeof entity?.name === 'string' && entity.name.trim()
        ? entity.name
        : entity?.id ?? ''
    );

    const columns = Array.isArray(entity?.columns) ? entity.columns : [];
    const rows = Array.isArray(entity?.rows) ? entity.rows : [];
    columnCount += columns.length;
    recordCount += rows.length;

    for (const row of rows) {
      const values =
        row?.values && typeof row.values === 'object' && !Array.isArray(row.values)
          ? row.values
          : {};
      const width = Object.keys(values).length;
      recordWidthSum += width;
      recordWidthSamples += 1;

      for (const column of columns) {
        totalFieldCount += 1;
        const cell = values[column.id];
        if (cell === null || cell === undefined) {
          nullValueCount += 1;
        } else if (isEmptyString(cell)) {
          emptyValueCount += 1;
        } else {
          filledValueCount += 1;
        }
      }
    }
  }

  const entityCount = entities.length;
  const averageColumnCount =
    entityCount > 0 ? columnCount / entityCount : 0;
  const averageRecordWidth =
    recordWidthSamples > 0 ? recordWidthSum / recordWidthSamples : 0;

  const schemaVersion = dataset?.version?.schemaVersion;
  const revision = dataset?.version?.revision;
  const datasetVersion =
    typeof schemaVersion === 'string' && schemaVersion
      ? revision
        ? `${schemaVersion}:${revision}`
        : schemaVersion
      : typeof revision === 'string'
        ? revision
        : '';

  return {
    entityCount,
    recordCount,
    columnCount,
    totalFieldCount,
    emptyValueCount,
    nullValueCount,
    filledValueCount,
    averageColumnCount,
    averageRecordWidth,
    entityNames: Object.freeze(entityNames),
    datasetVersion
  };
}

export function roundRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 10000) / 10000;
}

export function roundAverage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}
