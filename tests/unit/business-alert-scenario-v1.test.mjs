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
  BusinessAlertEngine
} = await import(
  '../../src/business/document-intelligence/alerts/BusinessAlertEngine.ts'
);

const {
  BusinessScenarioSimulator
} = await import(
  '../../src/business/document-intelligence/scenarios/BusinessScenarioSimulator.ts'
);

function analysis(overrides = {}) {
  return {
    id: 'analysis-current',
    businessId: 'business-001',
    documentId: 'document-001',
    analysisType: 'management-summary',
    category: 'sales',
    score: 72,
    summary: 'Test analizi',
    kpis: [
      {
        id: 'semantic_total_revenue',
        label: 'Toplam Ciro',
        value: 100000,
        unit: 'TRY'
      },
      {
        id: 'semantic_total_cost',
        label: 'Toplam Maliyet',
        value: 70000,
        unit: 'TRY'
      },
      {
        id: 'semantic_gross_profit',
        label: 'Brüt Kâr',
        value: 30000,
        unit: 'TRY'
      },
      {
        id: 'semantic_profit_margin',
        label: 'Kâr Marjı',
        value: 30,
        unit: '%'
      },
      {
        id: 'semantic_total_quantity',
        label: 'Satış Adedi',
        value: 1000,
        unit: 'adet'
      }
    ],
    insights: [],
    recommendations: [],
    createdAt:
      '2026-08-01T00:00:00.000Z',
    ...overrides
  };
}

test(
  'Alert Engine detects critical health decline and financial risks',
  () => {
    const result =
      new BusinessAlertEngine().evaluate({
        analysis: analysis({ score: 35 }),
        comparison: {
          currentAnalysisId: 'current',
          previousAnalysisId: 'previous',
          currentCreatedAt:
            '2026-08-01T00:00:00.000Z',
          previousCreatedAt:
            '2026-07-01T00:00:00.000Z',
          score: {
            currentValue: 35,
            previousValue: 55,
            absoluteChange: -20,
            direction: 'down',
            impact: 'negative',
            changeLabel: '-20 puan'
          },
          kpis: [
            {
              id: 'semantic_total_revenue',
              label: 'Toplam Ciro',
              unit: 'TRY',
              currentValue: 80000,
              previousValue: 100000,
              absoluteChange: -20000,
              percentageChange: -20,
              direction: 'down',
              impact: 'negative',
              changeLabel: '%-20'
            },
            {
              id: 'semantic_total_cost',
              label: 'Toplam Maliyet',
              unit: 'TRY',
              currentValue: 90000,
              previousValue: 70000,
              absoluteChange: 20000,
              percentageChange: 28.57,
              direction: 'up',
              impact: 'negative',
              changeLabel: '%+28,57'
            }
          ],
          summary: 'Riskli dönem',
          hasComparableData: true
        }
      });

    assert.equal(result.hasAlerts, true);
    assert.ok(
      result.summary.criticalCount >= 2
    );

    assert.equal(
      result.summary.highestSeverity,
      'critical'
    );

    assert.match(
      result.executiveSummary,
      /Acil yönetim müdahalesi/i
    );
  }
);

test(
  'Alert Engine reports insufficient forecast history',
  () => {
    const result =
      new BusinessAlertEngine().evaluate({
        analysis: analysis(),
        forecast: {
          generatedAt:
            '2026-08-01T00:00:00.000Z',
          sourceAnalysisIds: [],
          sourcePointCount: 1,
          forecasts: [],
          summary: 'Yetersiz veri',
          disclosure: 'Tahmin değildir.',
          hasForecastData: false
        }
      });

    assert.ok(
      result.alerts.some(
        (item) =>
          item.id ===
          'business-forecast-data-insufficient'
      )
    );
  }
);

test(
  'Scenario Simulator calculates positive growth scenario',
  () => {
    const result =
      new BusinessScenarioSimulator().simulate(
        analysis(),
        {
          priceChangePercent: 5,
          salesVolumeChangePercent: 10,
          unitCostChangePercent: -5
        }
      );

    assert.ok(
      result.projected.revenue >
        result.baseline.revenue
    );

    assert.ok(
      result.projected.grossProfit >
        result.baseline.grossProfit
    );

    assert.ok(result.delta.revenue > 0);
    assert.match(
      result.summary,
      /tahmini ciro/i
    );

    assert.match(
      result.disclosure,
      /garanti/i
    );
  }
);

test(
  'Scenario Simulator detects loss risk',
  () => {
    const result =
      new BusinessScenarioSimulator().simulate(
        analysis(),
        {
          salesVolumeChangePercent: -80,
          unitCostChangePercent: 100,
          fixedCostChangePercent: 50,
          personnelCostChangePercent: 50
        }
      );

    assert.ok(
      result.risks.some(
        (risk) =>
          risk.severity === 'critical'
      )
    );
  }
);
