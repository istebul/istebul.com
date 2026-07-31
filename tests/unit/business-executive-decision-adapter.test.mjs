import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  ExecutiveDecisionAdapter,
  ExecutiveReportBuilder
} = await import(
  '../../src/business/reporting/index.ts'
);

function sampleAnalysis() {
  return {
    documentId: 'doc-exec-001',
    category: 'sales',
    score: 78,
    summary: 'Satış ve kârlılık analizi tamamlandı.',
    kpis: [
      {
        id: 'semantic_total_revenue',
        label: 'Toplam ciro',
        value: 104500,
        unit: 'TRY'
      }
    ],
    insights: [
      {
        id: 'profit-warning',
        title: 'Kâr marjı izlenmeli',
        description:
          'Kâr marjı hedef seviyenin altında görünüyor.',
        severity: 'warning',
        source: 'executive-profitability'
      },
      {
        id: 'quality-success',
        title: 'Veri kalitesi güçlü',
        description:
          'Analiz için yeterli veri yapısı mevcut.',
        severity: 'success',
        source: 'executive-data-quality'
      }
    ],
    recommendations: [
      'Fiyat ve maliyet yapısını ürün bazında inceleyin.'
    ],
    analyzedAt: '2026-07-31T12:00:00.000Z'
  };
}

test(
  'ExecutiveDecisionAdapter converts analysis into action plans',
  () => {
    const result =
      new ExecutiveDecisionAdapter().build(
        sampleAnalysis()
      );

    assert.equal(
      result.recommendationResult.summary.success,
      true
    );

    assert.ok(
      result.recommendationResult.records.length >= 2
    );

    assert.ok(
      result.actionPlanResult.summary.actionPlanCount >= 2
    );

    assert.ok(
      result.actionPlanResult.summary.stepCount >= 6
    );

    assert.ok(
      result.actionPlanResult.actionPlans.every(
        (plan) =>
          typeof plan.estimatedImpact === 'number' &&
          typeof plan.estimatedEffort === 'number'
      )
    );
  }
);

test(
  'ExecutiveReportBuilder includes decision runtime output',
  () => {
    const report =
      new ExecutiveReportBuilder().build(
        sampleAnalysis(),
        'Örnek İşletme',
        'satış-verisi.csv'
      );

    assert.ok(report.decisionRecommendations);
    assert.ok(report.actionPlan);

    assert.ok(
      report.sections.some(
        (section) =>
          section.title === 'Öncelik Matrisi'
      )
    );

    assert.ok(
      report.sections.some(
        (section) =>
          section.title === 'Yönetici Aksiyon Planı'
      )
    );

    assert.ok(
      report.sections.some(
        (section) =>
          section.title === 'İlk 7 Gün'
      )
    );
  }
);
