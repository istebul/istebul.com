import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

register(
  pathToFileURL(
    path.join(
      __dirname,
      '../helpers/business-ts-resolve.mjs'
    )
  ).href
);

const { ExecutiveInsightEngine } = await import(
  '../../src/business/document-intelligence/analysis/ExecutiveInsightEngine.ts'
);

function createDocument() {
  return {
    documentId: 'doc-1',
    title: 'Satış Raporu',
    plainText: '',
    warnings: [],
    normalizedAt: '2026-07-31T00:00:00.000Z',
    tables: [
      {
        name: 'Satışlar',
        rowCount: 3,
        columns: [
          {
            key: 'urun',
            label: 'Ürün',
            detectedType: 'text',
            nullCount: 0,
            sampleValues: ['Ürün A']
          },
          {
            key: 'ciro',
            label: 'Ciro',
            detectedType: 'currency',
            nullCount: 0,
            sampleValues: [36000]
          }
        ],
        rows: [
          { urun: 'Ürün A', ciro: 36000 },
          { urun: 'Ürün B', ciro: 16000 },
          { urun: 'Ürün C', ciro: 52500 }
        ]
      }
    ]
  };
}

function createKpis(overrides = {}) {
  const values = {
    revenue: 104500,
    cost: 67400,
    profit: 37100,
    margin: 35.5,
    quantity: 35,
    records: 3,
    ...overrides
  };

  return [
    {
      id: 'semantic_total_revenue',
      label: 'Toplam Ciro',
      value: values.revenue,
      unit: 'TRY'
    },
    {
      id: 'semantic_total_cost',
      label: 'Toplam Maliyet',
      value: values.cost,
      unit: 'TRY'
    },
    {
      id: 'semantic_gross_profit',
      label: 'Brüt Kâr',
      value: values.profit,
      unit: 'TRY'
    },
    {
      id: 'semantic_profit_margin',
      label: 'Kâr Marjı',
      value: values.margin,
      unit: '%'
    },
    {
      id: 'semantic_total_quantity',
      label: 'Toplam Satış Adedi',
      value: values.quantity,
      unit: 'adet'
    },
    {
      id: 'semantic_total_records',
      label: 'Toplam Kayıt',
      value: values.records,
      unit: 'kayıt'
    },
    {
      id: 'semantic_top_revenue_product',
      label: 'En Yüksek Ciro: Ürün C',
      value: 52500,
      unit: 'TRY'
    },
    {
      id: 'semantic_top_quantity_product',
      label: 'En Çok Satan: Ürün C',
      value: 15,
      unit: 'adet'
    }
  ];
}

test('Executive Insight Engine produces profitability and cost insights', () => {
  const insights = new ExecutiveInsightEngine().generate(
    createDocument(),
    createKpis()
  );

  assert.ok(
    insights.some(
      (insight) =>
        insight.id ===
        'executive-profitability-strong'
    )
  );

  assert.ok(
    insights.some(
      (insight) =>
        insight.id ===
        'executive-cost-pressure-stable'
    )
  );
});

test('Executive Insight Engine detects critical profitability risk', () => {
  const insights = new ExecutiveInsightEngine().generate(
    createDocument(),
    createKpis({
      cost: 120000,
      profit: -15500,
      margin: -14.83
    })
  );

  const critical = insights.find(
    (insight) =>
      insight.id ===
      'executive-profitability-critical'
  );

  assert.equal(critical?.severity, 'critical');
  assert.match(
    critical?.description ?? '',
    /acilen gözden geçirilmelidir/i
  );
});

test('Executive Insight Engine identifies product leaders', () => {
  const insights = new ExecutiveInsightEngine().generate(
    createDocument(),
    createKpis()
  );

  assert.ok(
    insights.some((insight) =>
      /Ürün C/.test(insight.description)
    )
  );

  assert.ok(
    insights.some(
      (insight) =>
        insight.id === 'executive-revenue-leader'
    )
  );
});

test('Executive Insight Engine reports strong data quality', () => {
  const insights = new ExecutiveInsightEngine().generate(
    createDocument(),
    createKpis()
  );

  assert.ok(
    insights.some(
      (insight) =>
        insight.id ===
        'executive-data-quality-strong'
    )
  );
});
