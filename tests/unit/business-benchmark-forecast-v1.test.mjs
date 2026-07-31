import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  fileURLToPath,
  pathToFileURL
} from 'node:url';

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
  BusinessBenchmarkEngine
} = await import(
  '../../src/business/document-intelligence/benchmark/BusinessBenchmarkEngine.ts'
);

const {
  BusinessForecastEngine
} = await import(
  '../../src/business/document-intelligence/forecast/BusinessForecastEngine.ts'
);

function buildAnalysis({
  id,
  date,
  score,
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
    analysisType: 'management-summary',
    category: 'sales',
    score,
    summary: 'Test analizi',
    kpis: [
      {
        id: 'semantic_total_revenue',
        label: 'Toplam Ciro',
        value: revenue,
        unit: 'TRY'
      },
      {
        id: 'semantic_total_cost',
        label: 'Toplam Maliyet',
        value: cost,
        unit: 'TRY'
      },
      {
        id: 'semantic_gross_profit',
        label: 'Brüt Kâr',
        value: profit,
        unit: 'TRY'
      },
      {
        id: 'semantic_profit_margin',
        label: 'Kâr Marjı',
        value: margin,
        unit: '%'
      },
      {
        id: 'semantic_total_quantity',
        label: 'Toplam Satış Adedi',
        value: quantity,
        unit: 'adet'
      }
    ],
    insights: [],
    recommendations: [],
    createdAt: date
  };
}

test(
  'Benchmark Engine evaluates structured reference profile',
  () => {
    const result =
      new BusinessBenchmarkEngine().evaluate(
        buildAnalysis({
          id: 'benchmark',
          date:
            '2026-07-31T12:00:00.000Z',
          score: 84,
          revenue: 1_800_000,
          cost: 300_000,
          profit: 600_000,
          margin: 38,
          quantity: 1_700
        })
      );

    assert.equal(
      result.hasBenchmarkData,
      true
    );

    assert.equal(result.kpis.length, 5);
    assert.equal(
      result.profileId,
      'structured-sme-reference-v1'
    );

    assert.match(
      result.disclosure,
      /gerçek sektör ortalaması değildir/i
    );

    assert.equal(
      result.score.level,
      'strong'
    );

    const revenue = result.kpis.find(
      (item) =>
        item.id === 'semantic_total_revenue'
    );

    assert.equal(revenue?.level, 'strong');
    assert.ok(
      (revenue?.percentile ?? 0) >= 70
    );

    const cost = result.kpis.find(
      (item) =>
        item.id === 'semantic_total_cost'
    );

    assert.equal(cost?.impact, 'positive');
    assert.ok(result.strongest);
    assert.ok(result.weakest);
  }
);

test(
  'Forecast Engine requires at least three analyses',
  () => {
    const engine =
      new BusinessForecastEngine();

    const result = engine.forecast([
      buildAnalysis({
        id: 'one',
        date:
          '2026-06-01T00:00:00.000Z',
        score: 60,
        revenue: 100_000,
        cost: 70_000,
        profit: 30_000,
        margin: 30,
        quantity: 100
      }),
      buildAnalysis({
        id: 'two',
        date:
          '2026-07-01T00:00:00.000Z',
        score: 65,
        revenue: 110_000,
        cost: 72_000,
        profit: 38_000,
        margin: 34,
        quantity: 110
      })
    ]);

    assert.equal(
      result.hasForecastData,
      false
    );

    assert.equal(
      result.forecasts.length,
      0
    );
  }
);

test(
  'Forecast Engine creates safe 30 90 and 365 day projections',
  () => {
    const result =
      new BusinessForecastEngine().forecast([
        buildAnalysis({
          id: 'january',
          date:
            '2026-01-01T00:00:00.000Z',
          score: 60,
          revenue: 100_000,
          cost: 80_000,
          profit: 20_000,
          margin: 20,
          quantity: 100
        }),
        buildAnalysis({
          id: 'february',
          date:
            '2026-02-01T00:00:00.000Z',
          score: 66,
          revenue: 120_000,
          cost: 82_000,
          profit: 38_000,
          margin: 31.67,
          quantity: 120
        }),
        buildAnalysis({
          id: 'march',
          date:
            '2026-03-01T00:00:00.000Z',
          score: 72,
          revenue: 140_000,
          cost: 84_000,
          profit: 56_000,
          margin: 40,
          quantity: 140
        }),
        buildAnalysis({
          id: 'april',
          date:
            '2026-04-01T00:00:00.000Z',
          score: 78,
          revenue: 160_000,
          cost: 86_000,
          profit: 74_000,
          margin: 46.25,
          quantity: 160
        })
      ]);

    assert.equal(
      result.hasForecastData,
      true
    );

    assert.equal(result.forecasts.length, 5);

    const revenue = result.forecasts.find(
      (forecast) =>
        forecast.id ===
        'semantic_total_revenue'
    );

    assert.equal(revenue?.direction, 'up');
    assert.equal(
      revenue?.projections.length,
      3
    );

    assert.deepEqual(
      revenue?.projections.map(
        (point) => point.horizonDays
      ),
      [30, 90, 365]
    );

    assert.ok(
      (revenue?.projections[0]
        ?.projectedValue ?? 0) >
        revenue.currentValue
    );

    const margin = result.forecasts.find(
      (forecast) =>
        forecast.id ===
        'semantic_profit_margin'
    );

    for (
      const projection of
      margin?.projections ?? []
    ) {
      assert.ok(
        projection.projectedValue >= 0
      );

      assert.ok(
        projection.projectedValue <= 100
      );
    }

    assert.match(
      result.disclosure,
      /garanti/i
    );
  }
);
