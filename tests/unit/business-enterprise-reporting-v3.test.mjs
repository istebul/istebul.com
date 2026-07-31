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
  ExecutiveReportBuilder
} = await import(
  '../../src/business/reporting/index.ts'
);

const {
  createPrintableBusinessReportHtml
} = await import(
  '../../src/business/reports/generators/BusinessPrintableReportGenerator.ts'
);

const {
  buildBusinessExcelWorkbook
} = await import(
  '../../src/business/reports/generators/BusinessExcelReportGenerator.ts'
);

const analysis = {
  documentId: 'document-001',
  category: 'sales',
  score: 84,
  summary: 'İşletme performansı kontrollü biçimde ilerliyor.',
  kpis: [
    {
      id: 'semantic_total_revenue',
      label: 'Toplam Ciro',
      value: 120000,
      unit: 'TRY'
    },
    {
      id: 'semantic_profit_margin',
      label: 'Kâr Marjı',
      value: 32.5,
      unit: '%'
    }
  ],
  insights: [
    {
      id: 'insight-1',
      title: 'Kârlılık güçlü',
      description: 'Brüt kârlılık olumlu seviyededir.',
      severity: 'success',
      source: 'executive-profitability'
    }
  ],
  recommendations: [
    'Kârlılığı yüksek ürünlere odaklanın.'
  ],
  analyzedAt: '2026-07-31T12:00:00.000Z'
};

const executiveReport =
  new ExecutiveReportBuilder().build(
    analysis,
    'Örnek İşletme',
    'satış-verisi.xlsx'
  );

const input = {
  businessName: 'Örnek İşletme',
  analysis: {
    id: 'analysis-001',
    businessId: 'business-001',
    documentId: analysis.documentId,
    analysisType: 'management-summary',
    category: analysis.category,
    score: analysis.score,
    summary: analysis.summary,
    kpis: analysis.kpis,
    insights: analysis.insights,
    recommendations: analysis.recommendations,
    createdAt: analysis.analyzedAt
  },
  executiveReport,
  benchmark: {
    profileId: 'structured-sme-reference-v1',
    profileLabel:
      'Yapılandırılmış KOBİ referans profili',
    disclosure:
      'Bu karşılaştırma gerçek sektör ortalaması değildir.',
    score: {
      id: 'business_health_score',
      label: 'İşletme sağlık skoru',
      value: 84,
      referenceMedian: 65,
      absoluteGap: 19,
      percentageGap: 29.23,
      percentile: 88,
      level: 'strong',
      impact: 'positive',
      statusLabel: 'Referans profilinin üzerinde'
    },
    kpis: [
      {
        id: 'semantic_total_revenue',
        label: 'Toplam Ciro',
        unit: 'TRY',
        value: 120000,
        referenceMedian: 100000,
        absoluteGap: 20000,
        percentageGap: 20,
        percentile: 72,
        level: 'strong',
        impact: 'positive',
        statusLabel: 'Referans profilinin üzerinde'
      }
    ],
    strongest: undefined,
    weakest: undefined,
    summary: 'Benchmark değerlendirmesi hazır.',
    hasBenchmarkData: true
  },
  forecast: {
    generatedAt:
      '2026-07-31T12:00:00.000Z',
    sourceAnalysisIds: [
      'analysis-001',
      'analysis-002',
      'analysis-003'
    ],
    sourcePointCount: 3,
    forecasts: [
      {
        id: 'semantic_total_revenue',
        label: 'Toplam Ciro',
        unit: 'TRY',
        currentValue: 120000,
        slopePerDay: 1000,
        direction: 'up',
        confidence: 'medium',
        dataPointCount: 3,
        fitScore: 0.8,
        projections: [
          {
            horizonDays: 30,
            projectedValue: 150000,
            absoluteChange: 30000,
            percentageChange: 25
          },
          {
            horizonDays: 90,
            projectedValue: 210000,
            absoluteChange: 90000,
            percentageChange: 75
          },
          {
            horizonDays: 365,
            projectedValue: 485000,
            absoluteChange: 365000,
            percentageChange: 304.17
          }
        ]
      }
    ],
    summary: 'Tahmin değerlendirmesi hazır.',
    disclosure:
      'Tahminler garanti niteliğinde değildir.',
    hasForecastData: true
  },
  alerts: {
    alerts: [
      {
        id: 'business-cost-pressure',
        category: 'cost',
        severity: 'warning',
        title: 'Maliyet baskısı yükseliyor',
        description:
          'Toplam maliyet önceki döneme göre arttı.',
        recommendation:
          'Maliyet kalemlerini ayrıştırın.',
        score: 80,
        source: 'period-comparison'
      }
    ],
    summary: {
      criticalCount: 0,
      warningCount: 1,
      infoCount: 0,
      successCount: 0,
      highestSeverity: 'warning'
    },
    executiveSummary:
      '1 uyarı seviyesinde konu bulundu.',
    hasAlerts: true
  },
  scenarios: [
    {
      id: 'growth',
      title: 'Büyüme Senaryosu',
      description:
        'Fiyat %5 ve satış hacmi %10 artarsa.',
      result: {
        baseline: {
          revenue: 120000,
          totalCost: 70000,
          grossProfit: 50000,
          profitMargin: 41.67,
          quantity: 1000
        },
        projected: {
          revenue: 138600,
          totalCost: 74550,
          grossProfit: 64050,
          profitMargin: 46.21,
          quantity: 1100
        },
        delta: {
          revenue: 18600,
          totalCost: 4550,
          grossProfit: 14050,
          profitMargin: 4.54,
          quantity: 100
        },
        risks: [
          {
            severity: 'info',
            title: 'Kritik senaryo riski bulunmadı',
            description:
              'Temel finansal yapı korunuyor.'
          }
        ],
        summary:
          'Senaryo sonucunda tahmini ciro artıyor.',
        disclosure:
          'Bu simülasyon finansal garanti değildir.'
      }
    }
  ]
};

test(
  'Enterprise printable report renders corporate sections',
  () => {
    const html =
      createPrintableBusinessReportHtml(input);

    assert.match(html, /Kurumsal Yönetici Raporu/);
    assert.match(html, /Yönetim Kurulu Özeti/);
    assert.match(html, /İçindekiler/);
    assert.match(html, /Aksiyon Planı Özeti/);
    assert.match(
      html,
      /Benchmark Değerlendirmesi/
    );
    assert.match(
      html,
      /30 \/ 90 \/ 365 Günlük Projeksiyon/
    );
    assert.match(
      html,
      /gerçek sektör ortalaması değildir/i
    );
    assert.match(
      html,
      /garanti niteliğinde değildir/i
    );
    assert.match(html, /CEO Alarm Özeti/);
    assert.match(html, /Maliyet baskısı yükseliyor/);
    assert.match(html, /Senaryo Simülasyonları/);
    assert.match(html, /Büyüme Senaryosu/);
    assert.match(
      html,
      /finansal garanti değildir/i
    );
    assert.match(html, /30 Günlük Plan/);
    assert.match(html, /CEO Karar Özeti/);
    assert.match(html, /@page/);
    assert.match(html, /break-after: page/);
  }
);

test(
  'Enterprise Excel report creates expected worksheets',
  async () => {
    const { workbook } =
      await buildBusinessExcelWorkbook(input);

    assert.deepEqual(
      workbook.SheetNames,
      [
        'Yönetici Özeti',
        'Dashboard',
        'KPI',
        'İçgörüler',
        'Aksiyon Planı',
        '30-60-90 Gün',
        'Yönetici Değerlendirmesi',
        'Benchmark',
        'Tahminler',
        'CEO Alarmları',
        'Senaryolar',
        'Analiz Verisi'
      ]
    );
  }
);
