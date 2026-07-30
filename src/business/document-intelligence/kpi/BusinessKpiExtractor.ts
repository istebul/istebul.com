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

interface SemanticColumnSet {
  revenue?: string;
  cost?: string;
  quantity?: string;
  product?: string;
  category?: string;
}

const SEMANTIC_COLUMN_ALIASES = Object.freeze({
  revenue: [
    'ciro',
    'gelir',
    'satis',
    'satis_tutari',
    'satis_tutari_tl',
    'toplam_satis',
    'tutar',
    'total',
    'revenue',
    'sales'
  ],
  cost: [
    'maliyet',
    'maliyet_tutari',
    'toplam_maliyet',
    'gider',
    'cost',
    'expense'
  ],
  quantity: [
    'adet',
    'miktar',
    'satis_adedi',
    'satilan_adet',
    'quantity',
    'qty'
  ],
  product: [
    'urun',
    'urun_adi',
    'urunadi',
    'malzeme',
    'stok_adi',
    'product',
    'product_name'
  ],
  category: [
    'kategori',
    'urun_kategorisi',
    'grup',
    'category'
  ]
} as const);

function normalizeSemanticKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findSemanticColumn(
  table: NormalizedDocumentTable,
  aliases: readonly string[]
): string | undefined {
  const normalizedAliases = new Set(
    aliases.map(normalizeSemanticKey)
  );

  return table.columns.find((column) => {
    const candidates = [
      normalizeSemanticKey(column.key),
      normalizeSemanticKey(column.label)
    ];

    return candidates.some((candidate) =>
      normalizedAliases.has(candidate)
    );
  })?.key;
}

function resolveSemanticColumns(
  table: NormalizedDocumentTable
): SemanticColumnSet {
  return {
    revenue: findSemanticColumn(
      table,
      SEMANTIC_COLUMN_ALIASES.revenue
    ),
    cost: findSemanticColumn(
      table,
      SEMANTIC_COLUMN_ALIASES.cost
    ),
    quantity: findSemanticColumn(
      table,
      SEMANTIC_COLUMN_ALIASES.quantity
    ),
    product: findSemanticColumn(
      table,
      SEMANTIC_COLUMN_ALIASES.product
    ),
    category: findSemanticColumn(
      table,
      SEMANTIC_COLUMN_ALIASES.category
    )
  };
}

function readNumber(
  row: Record<string, NormalizedCellValue>,
  key?: string
): number {
  if (!key) return 0;

  const value = row[key];

  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : 0;
}

function readText(
  row: Record<string, NormalizedCellValue>,
  key?: string
): string {
  if (!key) return '';

  const value = row[key];

  return typeof value === 'string'
    ? value.trim()
    : '';
}

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

function extractSemanticKpis(
  document: NormalizedDocument
): BusinessKpi[] {
  const rows = document.tables.flatMap((table) => {
    const columns = resolveSemanticColumns(table);

    return table.rows.map((row) => ({
      row,
      columns
    }));
  });

  const totalRevenue = rows.reduce(
    (sum, item) =>
      sum + readNumber(item.row, item.columns.revenue),
    0
  );

  const totalCost = rows.reduce(
    (sum, item) =>
      sum + readNumber(item.row, item.columns.cost),
    0
  );

  const totalQuantity = rows.reduce(
    (sum, item) =>
      sum + readNumber(item.row, item.columns.quantity),
    0
  );

  const grossProfit = totalRevenue - totalCost;
  const profitMargin =
    totalRevenue > 0
      ? (grossProfit / totalRevenue) * 100
      : 0;

  const semanticKpis: BusinessKpi[] = [
    {
      id: 'semantic_total_records',
      label: 'Toplam Kayıt',
      value: rows.length,
      unit: 'kayıt'
    }
  ];

  if (totalRevenue > 0) {
    semanticKpis.push(
      {
        id: 'semantic_total_revenue',
        label: 'Toplam Ciro',
        value: roundMetric(totalRevenue),
        unit: 'TRY'
      },
      {
        id: 'semantic_average_revenue',
        label: 'Ortalama Kayıt Değeri',
        value: roundMetric(
          rows.length > 0
            ? totalRevenue / rows.length
            : 0
        ),
        unit: 'TRY'
      }
    );
  }

  if (totalCost > 0) {
    semanticKpis.push({
      id: 'semantic_total_cost',
      label: 'Toplam Maliyet',
      value: roundMetric(totalCost),
      unit: 'TRY'
    });
  }

  if (totalRevenue > 0 || totalCost > 0) {
    semanticKpis.push(
      {
        id: 'semantic_gross_profit',
        label: 'Brüt Kâr',
        value: roundMetric(grossProfit),
        unit: 'TRY'
      },
      {
        id: 'semantic_profit_margin',
        label: 'Kâr Marjı',
        value: roundMetric(profitMargin),
        unit: '%'
      }
    );
  }

  if (totalQuantity > 0) {
    semanticKpis.push({
      id: 'semantic_total_quantity',
      label: 'Toplam Satış Adedi',
      value: roundMetric(totalQuantity),
      unit: 'adet'
    });
  }

  const productRevenue = new Map<string, number>();
  const productQuantity = new Map<string, number>();

  for (const item of rows) {
    const product = readText(
      item.row,
      item.columns.product
    );

    if (!product) continue;

    productRevenue.set(
      product,
      (productRevenue.get(product) ?? 0) +
        readNumber(item.row, item.columns.revenue)
    );

    productQuantity.set(
      product,
      (productQuantity.get(product) ?? 0) +
        readNumber(item.row, item.columns.quantity)
    );
  }

  const topRevenueProduct = [...productRevenue.entries()]
    .sort((a, b) => b[1] - a[1])[0];

  if (topRevenueProduct && topRevenueProduct[1] > 0) {
    semanticKpis.push({
      id: 'semantic_top_revenue_product',
      label: `En Yüksek Ciro: ${topRevenueProduct[0]}`,
      value: roundMetric(topRevenueProduct[1]),
      unit: 'TRY'
    });
  }

  const topQuantityProduct = [...productQuantity.entries()]
    .sort((a, b) => b[1] - a[1])[0];

  if (topQuantityProduct && topQuantityProduct[1] > 0) {
    semanticKpis.push({
      id: 'semantic_top_quantity_product',
      label: `En Çok Satan: ${topQuantityProduct[0]}`,
      value: roundMetric(topQuantityProduct[1]),
      unit: 'adet'
    });
  }

  return semanticKpis;
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
    const kpis: BusinessKpi[] =
      extractSemanticKpis(document);

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
