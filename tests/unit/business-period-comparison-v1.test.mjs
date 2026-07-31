import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import {
  fileURLToPath
} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

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

const {
  BusinessPeriodComparisonEngine
} = await import(
  '../../src/business/document-intelligence/comparison/BusinessPeriodComparisonEngine.ts'
);

function analysis({
  id,
  score,
  createdAt,
  revenue,
  cost,
  profit,
  margin,
  quantity
}) {
  return {
    id,
    businessId: 'business-001',
    documentId: `document-${id}`,
    analysisType: 'sales-analysis',
    category: 'sales',
    score,
    summary: 'Test analizi',
    kpis: [
      {
        id: 'semantic_total_revenue',
        label: 'Toplam ciro',
        value: revenue,
        unit: 'TRY'
      },
      {
        id: 'semantic_total_cost',
        label: 'Toplam maliyet',
        value: cost,
        unit: 'TRY'
      },
      {
        id: 'semantic_gross_profit',
        label: 'Brüt kâr',
        value: profit,
        unit: 'TRY'
      },
      {
        id: 'semantic_profit_margin',
        label: 'Kâr marjı',
        value: margin,
        unit: '%'
      },
      {
        id: 'semantic_total_quantity',
        label: 'Toplam satış adedi',
        value: quantity,
        unit: 'adet'
      }
    ],
    insights: [],
    recommendations: [],
    createdAt
  };
}

test(
  'Period comparison calculates KPI deltas safely',
  () => {
    const engine =
      new BusinessPeriodComparisonEngine();

    const result = engine.compare(
      analysis({
        id: 'current',
        score: 84,
        createdAt:
          '2026-07-31T12:00:00.000Z',
        revenue: 120000,
        cost: 72000,
        profit: 48000,
        margin: 40,
        quantity: 120
      }),
      analysis({
        id: 'previous',
        score: 76,
        createdAt:
          '2026-06-30T12:00:00.000Z',
        revenue: 100000,
        cost: 75000,
        profit: 25000,
        margin: 25,
        quantity: 100
      })
    );

    assert.equal(
      result.hasComparableData,
      true
    );

    assert.equal(result.kpis.length, 5);

    const revenue = result.kpis.find(
      (item) =>
        item.id === 'semantic_total_revenue'
    );

    assert.equal(revenue?.absoluteChange, 20000);
    assert.equal(revenue?.percentageChange, 20);
    assert.equal(revenue?.direction, 'up');
    assert.equal(revenue?.impact, 'positive');

    const cost = result.kpis.find(
      (item) =>
        item.id === 'semantic_total_cost'
    );

    assert.equal(cost?.direction, 'down');
    assert.equal(cost?.impact, 'positive');

    const margin = result.kpis.find(
      (item) =>
        item.id === 'semantic_profit_margin'
    );

    assert.equal(margin?.absoluteChange, 15);
    assert.equal(margin?.percentageChange, null);
    assert.match(
      margin?.changeLabel ?? '',
      /puan/
    );

    assert.equal(result.score.absoluteChange, 8);
    assert.match(result.summary, /olumlu/i);
  }
);

test(
  'Period comparison avoids percentage when baseline is zero',
  () => {
    const engine =
      new BusinessPeriodComparisonEngine();

    const current = analysis({
      id: 'current-zero',
      score: 50,
      createdAt:
        '2026-07-31T12:00:00.000Z',
      revenue: 1000,
      cost: 0,
      profit: 1000,
      margin: 100,
      quantity: 10
    });

    const previous = analysis({
      id: 'previous-zero',
      score: 50,
      createdAt:
        '2026-06-30T12:00:00.000Z',
      revenue: 0,
      cost: 0,
      profit: 0,
      margin: 0,
      quantity: 0
    });

    const result =
      engine.compare(current, previous);

    const revenue = result.kpis.find(
      (item) =>
        item.id === 'semantic_total_revenue'
    );

    assert.equal(
      revenue?.percentageChange,
      null
    );

    assert.match(
      revenue?.changeLabel ?? '',
      /mutlak değişim/
    );
  }
);
