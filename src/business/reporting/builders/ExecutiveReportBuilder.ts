import type { BusinessAnalysisResult } from '../../document-intelligence/models/BusinessAnalysisResult';
import type { BusinessInsight } from '../../document-intelligence/models/BusinessInsight';
import type { ExecutiveReport } from '../models/ExecutiveReport';
import type { ExecutiveReportSection } from '../models/ExecutiveReportSection';

function selectInsights(
  insights: readonly BusinessInsight[],
  source: string
): string[] {
  return insights
    .filter((insight) => insight.source === source)
    .map(
      (insight) =>
        `${insight.title}: ${insight.description}`
    );
}

function selectRiskInsights(
  insights: readonly BusinessInsight[]
): string[] {
  return insights
    .filter(
      (insight) =>
        insight.severity === 'warning' ||
        insight.severity === 'critical'
    )
    .map(
      (insight) =>
        `${insight.title}: ${insight.description}`
    );
}

function selectOpportunityInsights(
  insights: readonly BusinessInsight[]
): string[] {
  return insights
    .filter(
      (insight) =>
        insight.severity === 'success' &&
        insight.source.startsWith('executive-')
    )
    .map(
      (insight) =>
        `${insight.title}: ${insight.description}`
    );
}

function createActionPlan(
  recommendations: readonly string[]
): {
  thirtyDays: string[];
  sixtyDays: string[];
  ninetyDays: string[];
} {
  const safe = recommendations.length > 0
    ? [...recommendations]
    : [
        'Veri kalitesini ve eksik alanları doğrulayın.',
        'KPI sonuçlarını sorumlu ekiplerle değerlendirin.',
        'Bir sonraki dönem için karşılaştırmalı analiz hazırlayın.'
      ];

  return {
    thirtyDays: [
      safe[0] ??
        'Kritik riskleri ve veri eksiklerini doğrulayın.',
      safe[1] ??
        'En yüksek etkili KPI alanı için sorumlu belirleyin.'
    ],
    sixtyDays: [
      safe[2] ??
        'Maliyet, satış ve operasyon göstergelerini yeniden ölçün.',
      'İlk 30 günlük aksiyonların etkisini kontrol edin.'
    ],
    ninetyDays: [
      safe[3] ??
        'Dönemsel KPI karşılaştırmasını yönetim gündemine alın.',
      safe[4] ??
        'Başarılı aksiyonları standart iş sürecine dönüştürün.'
    ]
  };
}

function createCeoDecisionSummary(
  analysis: BusinessAnalysisResult
): string[] {
  const criticalCount = analysis.insights.filter(
    (insight) => insight.severity === 'critical'
  ).length;

  const warningCount = analysis.insights.filter(
    (insight) => insight.severity === 'warning'
  ).length;

  const status =
    criticalCount > 0
      ? 'Acil yönetim müdahalesi gerekiyor.'
      : warningCount > 0
        ? 'Yakın takip ve düzeltici aksiyon gerekiyor.'
        : 'Genel görünüm kontrollü ve sürdürülebilir.';

  return [
    `Belge sağlık skoru ${analysis.score}/100.`,
    `${analysis.kpis.length} KPI ve ${analysis.insights.length} içgörü üretildi.`,
    `${criticalCount} kritik, ${warningCount} uyarı seviyesinde konu bulundu.`,
    status
  ];
}

function createSections(
  analysis: BusinessAnalysisResult
): ExecutiveReportSection[] {
  const profitability = selectInsights(
    analysis.insights,
    'executive-profitability'
  );

  const costPressure = selectInsights(
    analysis.insights,
    'executive-cost-pressure'
  );

  const productPerformance = selectInsights(
    analysis.insights,
    'executive-product-performance'
  );

  const operationalHealth = [
    ...selectInsights(
      analysis.insights,
      'executive-sales-volume'
    ),
    ...selectInsights(
      analysis.insights,
      'executive-data-quality'
    )
  ];

  const risks = selectRiskInsights(analysis.insights);
  const opportunities =
    selectOpportunityInsights(analysis.insights);

  const actionPlan = createActionPlan(
    analysis.recommendations
  );

  return [
    {
      title: 'Yönetici Özeti',
      content: [analysis.summary]
    },
    {
      title: 'Finansal Performans',
      content:
        costPressure.length > 0
          ? costPressure
          : ['Finansal maliyet baskısı için yeterli veri bulunamadı.']
    },
    {
      title: 'Kârlılık Analizi',
      content:
        profitability.length > 0
          ? profitability
          : ['Kârlılık değerlendirmesi için yeterli KPI bulunamadı.']
    },
    {
      title: 'Risk Analizi',
      content:
        risks.length > 0
          ? risks
          : ['Kritik veya uyarı seviyesinde risk tespit edilmedi.']
    },
    {
      title: 'Fırsat Analizi',
      content:
        opportunities.length > 0
          ? opportunities
          : ['Belirgin büyüme fırsatı için ek dönemsel veri gerekiyor.']
    },
    {
      title: 'Ürün Performansı',
      content:
        productPerformance.length > 0
          ? productPerformance
          : ['Ürün liderliği için yeterli veri bulunamadı.']
    },
    {
      title: 'Operasyonel Sağlık',
      content:
        operationalHealth.length > 0
          ? operationalHealth
          : ['Operasyonel sağlık için ek veri gerekiyor.']
    },
    {
      title: 'Öncelikli Aksiyonlar',
      content: analysis.recommendations
    },
    {
      title: '30 Günlük Plan',
      content: actionPlan.thirtyDays
    },
    {
      title: '60 Günlük Plan',
      content: actionPlan.sixtyDays
    },
    {
      title: '90 Günlük Plan',
      content: actionPlan.ninetyDays
    },
    {
      title: 'CEO Karar Özeti',
      content: createCeoDecisionSummary(analysis)
    }
  ];
}

export class ExecutiveReportBuilder {
  build(
    analysis: BusinessAnalysisResult,
    businessName: string,
    documentName: string
  ): ExecutiveReport {
    return {
      title: 'İSTEBUL Business Yönetici Raporu',
      businessName,
      documentName,
      generatedAt: new Date(),

      score: analysis.score,
      summary: analysis.summary,

      kpis: analysis.kpis,
      insights: analysis.insights,
      recommendations: analysis.recommendations,

      sections: createSections(analysis)
    };
  }
}
