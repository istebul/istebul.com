import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

register(
  pathToFileURL(
    path.join(
      __dirname,
      '../helpers/business-ts-resolve.mjs'
    )
  ).href
);

const { BusinessKpiExtractor } = await import(
  '../../src/business/document-intelligence/kpi/BusinessKpiExtractor.ts'
);

function createSalesDocument() {
  return {
    documentId: 'doc-semantic-kpi',
    title: 'Temmuz Satışları',
    plainText: '',
    warnings: [],
    normalizedAt: '2026-07-30T00:00:00.000Z',
    tables: [
      {
        name: 'Satışlar',
        rowCount: 3,
        columns: [
          {
            key: 'tarih',
            label: 'Tarih',
            detectedType: 'date',
            nullCount: 0,
            sampleValues: ['2026-07-01']
          },
          {
            key: 'urun',
            label: 'Ürün',
            detectedType: 'text',
            nullCount: 0,
            sampleValues: ['Ürün A']
          },
          {
            key: 'kategori',
            label: 'Kategori',
            detectedType: 'text',
            nullCount: 0,
            sampleValues: ['Elektronik']
          },
          {
            key: 'adet',
            label: 'Adet',
            detectedType: 'number',
            nullCount: 0,
            sampleValues: [12]
          },
          {
            key: 'ciro',
            label: 'Ciro',
            detectedType: 'currency',
            nullCount: 0,
            sampleValues: [36000]
          },
          {
            key: 'maliyet',
            label: 'Maliyet',
            detectedType: 'currency',
            nullCount: 0,
            sampleValues: [24000]
          }
        ],
        rows: [
          {
            tarih: '2026-07-01',
            urun: 'Ürün A',
            kategori: 'Elektronik',
            adet: 12,
            ciro: 36000,
            maliyet: 24000
          },
          {
            tarih: '2026-07-02',
            urun: 'Ürün B',
            kategori: 'Ev Yaşam',
            adet: 8,
            ciro: 16000,
            maliyet: 10400
          },
          {
            tarih: '2026-07-03',
            urun: 'Ürün C',
            kategori: 'Elektronik',
            adet: 15,
            ciro: 52500,
            maliyet: 33000
          }
        ]
      }
    ]
  };
}

function byId(kpis, id) {
  return kpis.find((kpi) => kpi.id === id);
}

test('semantic KPI engine calculates executive sales metrics', () => {
  const kpis = new BusinessKpiExtractor().extract(
    createSalesDocument()
  );

  assert.equal(
    byId(kpis, 'semantic_total_records')?.value,
    3
  );
  assert.equal(
    byId(kpis, 'semantic_total_revenue')?.value,
    104500
  );
  assert.equal(
    byId(kpis, 'semantic_total_cost')?.value,
    67400
  );
  assert.equal(
    byId(kpis, 'semantic_gross_profit')?.value,
    37100
  );
  assert.equal(
    byId(kpis, 'semantic_profit_margin')?.value,
    35.5
  );
  assert.equal(
    byId(kpis, 'semantic_total_quantity')?.value,
    35
  );
});

test('semantic KPI engine identifies leading products', () => {
  const kpis = new BusinessKpiExtractor().extract(
    createSalesDocument()
  );

  const revenueLeader = byId(
    kpis,
    'semantic_top_revenue_product'
  );
  const quantityLeader = byId(
    kpis,
    'semantic_top_quantity_product'
  );

  assert.equal(
    revenueLeader?.label,
    'En Yüksek Ciro: Ürün C'
  );
  assert.equal(revenueLeader?.value, 52500);

  assert.equal(
    quantityLeader?.label,
    'En Çok Satan: Ürün C'
  );
  assert.equal(quantityLeader?.value, 15);
});

test('generic column KPIs remain available', () => {
  const kpis = new BusinessKpiExtractor().extract(
    createSalesDocument()
  );

  assert.ok(
    kpis.some((kpi) =>
      /Ciro Toplamı/i.test(kpi.label)
    )
  );
  assert.ok(
    kpis.some((kpi) =>
      /Adet Ortalaması/i.test(kpi.label)
    )
  );
});
