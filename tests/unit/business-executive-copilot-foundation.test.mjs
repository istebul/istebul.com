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
  buildExecutiveCopilotResult
} = await import(
  '../../src/business/executive-copilot/index.ts'
);

function analysis(overrides = {}) {
  return {
    id: 'analysis-current',
    businessId: 'business-001',
    documentId: 'document-001',
    analysisType: 'management-summary',
    category: 'sales',
    score: 35,
    summary: 'Ciro ve kârlılık baskı altında.',
    kpis: [
      {
        id: 'semantic_total_revenue',
        label: 'Toplam Ciro',
        value: 80000,
        unit: 'TRY'
      },
      {
        id: 'semantic_total_cost',
        label: 'Toplam Maliyet',
        value: 90000,
        unit: 'TRY'
      },
      {
        id: 'semantic_gross_profit',
        label: 'Brüt Kâr',
        value: -10000,
        unit: 'TRY'
      },
      {
        id: 'semantic_profit_margin',
        label: 'Kâr Marjı',
        value: -12.5,
        unit: '%'
      },
      {
        id: 'semantic_total_quantity',
        label: 'Satış Adedi',
        value: 700,
        unit: 'adet'
      }
    ],
    insights: [],
    recommendations: [
      'Maliyet kalemlerini yeniden değerlendir.',
      'Satış hacmini artıracak kampanya planla.'
    ],
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides
  };
}

const comparison = {
  currentAnalysisId: 'current',
  previousAnalysisId: 'previous',
  currentCreatedAt: '2026-08-01T00:00:00.000Z',
  previousCreatedAt: '2026-07-01T00:00:00.000Z',
  score: {
    currentValue: 35,
    previousValue: 60,
    absoluteChange: -25,
    direction: 'down',
    impact: 'negative',
    changeLabel: '-25 puan'
  },
  kpis: [
    {
      id: 'semantic_total_revenue',
      label: 'Toplam Ciro',
      unit: 'TRY',
      currentValue: 80000,
      previousValue: 120000,
      absoluteChange: -40000,
      percentageChange: -33.33,
      direction: 'down',
      impact: 'negative',
      changeLabel: '%-33,33'
    },
    {
      id: 'semantic_total_quantity',
      label: 'Satış Adedi',
      unit: 'adet',
      currentValue: 700,
      previousValue: 650,
      absoluteChange: 50,
      percentageChange: 7.69,
      direction: 'up',
      impact: 'positive',
      changeLabel: '%+7,69'
    }
  ],
  summary: 'İşletme performansı geriledi.',
  hasComparableData: true
};

const alerts = {
  alerts: [
    {
      id: 'health-critical',
      severity: 'critical',
      category: 'health',
      title: 'Sağlık skorunda hızlı düşüş',
      description:
        'İşletme sağlık skoru kritik seviyeye geriledi.',
      recommendation:
        'Nakit akışı ve maliyetleri bugün incele.'
    }
  ],
  summary: {
    criticalCount: 1,
    warningCount: 0,
    infoCount: 0,
    successCount: 0,
    highestSeverity: 'critical'
  },
  executiveSummary:
    'Acil yönetim müdahalesi gerekiyor.',
  hasAlerts: true
};

test(
  'Executive Copilot builds canonical manager result',
  () => {
    const result = buildExecutiveCopilotResult({
      analysis: analysis(),
      comparison,
      alerts,
      forecast: {
        generatedAt: '2026-08-01T00:00:00.000Z',
        sourceAnalysisIds: [
          'analysis-current',
          'analysis-previous',
          'analysis-older'
        ],
        sourcePointCount: 3,
        forecasts: [],
        summary: 'Tahmin verisi hazır.',
        disclosure: 'Garanti değildir.',
        hasForecastData: true
      },
      generatedAt: '2026-08-03T00:00:00.000Z'
    });

    assert.equal(result.businessId, 'business-001');
    assert.equal(result.analysisId, 'analysis-current');
    assert.equal(result.health.score, 35);
    assert.equal(result.health.status, 'critical');
    assert.equal(result.health.trend, 'declining');

    assert.equal(
      result.topRisk?.title,
      'Sağlık skorunda hızlı düşüş'
    );

    assert.equal(
      result.topOpportunity?.title,
      'Satış Adedi güçleniyor'
    );

    assert.ok(result.actions.length >= 2);
    assert.equal(result.actions[0]?.priority, 'critical');
    assert.equal(result.confidence.level, 'high');

    assert.match(
      result.dailySummary,
      /İşletme sağlık skoru 35\/100/
    );

    assert.match(result.disclosure, /garanti/i);
  }
);

test(
  'Executive Copilot reports low confidence without history',
  () => {
    const result = buildExecutiveCopilotResult({
      analysis: analysis({
        score: 78,
        kpis: [],
        recommendations: []
      }),
      generatedAt: '2026-08-03T00:00:00.000Z'
    });

    assert.equal(result.health.status, 'healthy');
    assert.equal(result.health.trend, 'unknown');
    assert.equal(result.confidence.level, 'low');
    assert.equal(result.topRisk, undefined);
  }
);
