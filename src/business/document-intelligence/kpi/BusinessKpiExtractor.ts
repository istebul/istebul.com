import type { BusinessKpi } from '../models/BusinessKpi';
import type {
  NormalizedCellValue,
  NormalizedDocument,
  NormalizedDocumentTable
} from '../models/NormalizedDocument';

interface NumericColumnSummary {
  tableName: string;
  columnKey: string;
  columnLabel: string;
  values: number[];
  total: number;
  average: number;
  minimum: number;
  maximum: number;
}

function toFiniteNumber(value: NormalizedCellValue): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

function collectNumericColumnSummaries(
  table: NormalizedDocumentTable
): NumericColumnSummary[] {
  return table.columns
    .filter((column) =>
      ['number', 'currency', 'percentage'].includes(
        column.detectedType
      )
    )
    .map((column) => {
      const values = table.rows
        .map((row) => toFiniteNumber(row[column.key] ?? null))
        .filter((value): value is number => value !== null);

      if (values.length === 0) return null;

      const total = values.reduce(
        (sum, currentValue) => sum + currentValue,
        0
      );

      return {
        tableName: table.name,
        columnKey: column.key,
        columnLabel: column.label,
        values,
        total,
        average: total / values.length,
        minimum: Math.min(...values),
        maximum: Math.max(...values)
      };
    })
    .filter(
      (summary): summary is NumericColumnSummary =>
        summary !== null
    );
}

function createKpiId(
  tableName: string,
  columnKey: string,
  metric: string
): string {
  return [tableName, columnKey, metric]
    .join('_')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function resolveUnit(
  detectedType: string
): string | undefined {
  if (detectedType === 'currency') return 'TRY';
  if (detectedType === 'percentage') return '%';

  return undefined;
}

export class BusinessKpiExtractor {
  extract(document: NormalizedDocument): BusinessKpi[] {
    const kpis: BusinessKpi[] = [];

    for (const table of document.tables) {
      kpis.push({
        id: createKpiId(table.name, 'rows', 'count'),
        label: `${table.name} Kayıt Sayısı`,
        value: table.rowCount,
        unit: 'kayıt'
      });

      const summaries = collectNumericColumnSummaries(table);

      for (const summary of summaries) {
        const column = table.columns.find(
          (candidate) =>
            candidate.key === summary.columnKey
        );

        const unit = resolveUnit(
          column?.detectedType ?? 'number'
        );

        kpis.push(
          {
            id: createKpiId(
              summary.tableName,
              summary.columnKey,
              'total'
            ),
            label: `${summary.columnLabel} Toplamı`,
            value: Number(summary.total.toFixed(2)),
            unit
          },
          {
            id: createKpiId(
              summary.tableName,
              summary.columnKey,
              'average'
            ),
            label: `${summary.columnLabel} Ortalaması`,
            value: Number(summary.average.toFixed(2)),
            unit
          }
        );
      }
    }

    return kpis.slice(0, 24);
  }
}
