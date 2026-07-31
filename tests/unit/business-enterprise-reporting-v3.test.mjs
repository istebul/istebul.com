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
  executiveReport
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
        'Analiz Verisi'
      ]
    );
  }
);
