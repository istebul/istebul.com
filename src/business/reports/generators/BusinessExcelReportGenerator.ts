import type {
  BusinessReportInput
} from '../models/BusinessReportInput';

function sanitizeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'istebul-business-raporu';
}

function setColumns(
  sheet: Record<string, unknown>,
  widths: number[]
): void {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
}

export async function buildBusinessExcelWorkbook(
  input: BusinessReportInput
): Promise<{
  XLSX: typeof import('xlsx');
  workbook: import('xlsx').WorkBook;
}> {
  const XLSX = await import('xlsx');
  const { analysis, executiveReport } = input;

  const workbook = XLSX.utils.book_new();

  const actionPlans =
    executiveReport?.actionPlan.actionPlans ?? [];

  const averageEstimatedImpact =
    actionPlans.length > 0
      ? actionPlans.reduce(
          (total, plan) =>
            total + plan.estimatedImpact,
          0
        ) / actionPlans.length
      : 0;

  const averageEstimatedEffort =
    actionPlans.length > 0
      ? actionPlans.reduce(
          (total, plan) =>
            total + plan.estimatedEffort,
          0
        ) / actionPlans.length
      : 0;

  const summaryRows = [
    ['İSTEBUL Business Kurumsal Yönetici Raporu'],
    [],
    ['İşletme', input.businessName],
    ['Analiz türü', analysis.analysisType],
    ['Kategori', analysis.category],
    ['Belge sağlık skoru', analysis.score],
    ['KPI sayısı', analysis.kpis.length],
    ['İçgörü sayısı', analysis.insights.length],
    [
      'Aksiyon planı sayısı',
      executiveReport?.actionPlan.summary
        .actionPlanCount ?? 0
    ],
    [
      'Toplam aksiyon adımı',
      executiveReport?.actionPlan.summary
        .stepCount ?? 0
    ],
    ['Analiz tarihi', analysis.createdAt],
    [],
    ['Yönetici özeti'],
    [analysis.summary]
  ];

  const dashboardRows = [
    ['YÖNETİCİ DASHBOARD'],
    [],
    ['Gösterge', 'Değer'],
    ['İşletme Sağlık Skoru', analysis.score],
    ['Toplam KPI', analysis.kpis.length],
    ['Toplam İçgörü', analysis.insights.length],
    ['Toplam Öneri', analysis.recommendations.length],
    [
      'Aksiyon Planı',
      executiveReport?.actionPlan.summary
        .actionPlanCount ?? 0
    ],
    [
      'Aksiyon Adımı',
      executiveReport?.actionPlan.summary
        .stepCount ?? 0
    ],
    [
      'Ortalama Tahmini Etki',
      Number(averageEstimatedImpact.toFixed(2))
    ],
    [
      'Ortalama Tahmini Efor',
      Number(averageEstimatedEffort.toFixed(2))
    ]
  ];

  const kpiRows = analysis.kpis.map((kpi) => ({
    KPI_Kodu: kpi.id,
    Gösterge: kpi.label,
    Değer: kpi.value,
    Birim: kpi.unit ?? ''
  }));

  const insightRows = analysis.insights.map(
    (insight, index) => ({
      Sıra: index + 1,
      Başlık: insight.title,
      Açıklama: insight.description,
      Önem: insight.severity,
      Kaynak: insight.source
    })
  );

  const actionPlanRows = actionPlans.flatMap(
    (plan, planIndex) =>
      plan.steps.map((step, stepIndex) => ({
        Plan_Sırası: planIndex + 1,
        Plan: plan.title,
        Öncelik: plan.priority,
        Tahmini_Etki: plan.estimatedImpact,
        Tahmini_Efor: plan.estimatedEffort,
        Adım_Sırası: stepIndex + 1,
        Adım: step.title,
        Açıklama: step.description
      }))
  );

  const roadmapTitles = new Set([
    'İlk 7 Gün',
    '30 Günlük Plan',
    '60 Günlük Plan',
    '90 Günlük Plan'
  ]);

  const roadmapRows =
    executiveReport?.sections
      .filter((section) =>
        roadmapTitles.has(section.title)
      )
      .flatMap((section) =>
        section.content.map((content, index) => ({
          Dönem: section.title,
          Sıra: index + 1,
          Aksiyon: content
        }))
      ) ?? [];

  const executiveRows =
    executiveReport?.sections.flatMap(
      (section) =>
        section.content.map((content, index) => ({
          Bölüm: section.title,
          Sıra: index + 1,
          İçerik: content
        }))
    ) ?? [];

  const benchmarkRows =
    input.benchmark?.kpis.map((item) => ({
      KPI_Kodu: item.id,
      Gösterge: item.label,
      Birim: item.unit ?? '',
      Güncel_Değer: item.value,
      Referans_Medyan: item.referenceMedian,
      Mutlak_Fark: item.absoluteGap,
      Yüzdesel_Fark:
        item.percentageGap ?? '',
      Persentil: item.percentile,
      Seviye: item.level,
      Etki: item.impact,
      Durum: item.statusLabel
    })) ?? [];

  const forecastRows =
    input.forecast?.forecasts.flatMap(
      (forecast) =>
        forecast.projections.map(
          (projection) => ({
            KPI_Kodu: forecast.id,
            Gösterge: forecast.label,
            Birim: forecast.unit ?? '',
            Güncel_Değer:
              forecast.currentValue,
            Tahmin_Günü:
              projection.horizonDays,
            Tahmini_Değer:
              projection.projectedValue,
            Mutlak_Değişim:
              projection.absoluteChange,
            Yüzdesel_Değişim:
              projection.percentageChange ?? '',
            Yön: forecast.direction,
            Güven: forecast.confidence,
            Veri_Noktası:
              forecast.dataPointCount,
            Uyum_Skoru: forecast.fitScore
          })
        )
    ) ?? [];

  const alertRows =
    input.alerts?.alerts.map((alert) => ({
      Alarm_Kodu: alert.id,
      Seviye: alert.severity,
      Kategori: alert.category,
      Başlık: alert.title,
      Açıklama: alert.description,
      Önerilen_Aksiyon: alert.recommendation,
      Öncelik_Skoru: alert.score,
      Kaynak: alert.source
    })) ?? [];

  const scenarioRows =
    input.scenarios?.flatMap((scenario) =>
      scenario.result.risks.map(
        (risk, index) => ({
          Senaryo_Kodu: scenario.id,
          Senaryo: scenario.title,
          Varsayım: scenario.description,
          Baz_Ciro:
            scenario.result.baseline.revenue,
          Baz_Maliyet:
            scenario.result.baseline.totalCost,
          Baz_Brüt_Kâr:
            scenario.result.baseline.grossProfit,
          Baz_Kâr_Marjı:
            scenario.result.baseline.profitMargin,
          Tahmini_Ciro:
            scenario.result.projected.revenue,
          Tahmini_Maliyet:
            scenario.result.projected.totalCost,
          Tahmini_Brüt_Kâr:
            scenario.result.projected.grossProfit,
          Tahmini_Kâr_Marjı:
            scenario.result.projected.profitMargin,
          Ciro_Farkı:
            scenario.result.delta.revenue,
          Maliyet_Farkı:
            scenario.result.delta.totalCost,
          Brüt_Kâr_Farkı:
            scenario.result.delta.grossProfit,
          Marj_Farkı:
            scenario.result.delta.profitMargin,
          Risk_Sırası: index + 1,
          Risk_Seviyesi: risk.severity,
          Risk_Başlığı: risk.title,
          Risk_Açıklaması: risk.description
        })
      )
    ) ?? [];

  const rawAnalysisRows = [
    {
      Alan: 'documentId',
      Değer: analysis.documentId
    },
    {
      Alan: 'analysisType',
      Değer: analysis.analysisType
    },
    {
      Alan: 'category',
      Değer: analysis.category
    },
    {
      Alan: 'score',
      Değer: analysis.score
    },
    {
      Alan: 'summary',
      Değer: analysis.summary
    },
    {
      Alan: 'createdAt',
      Değer: analysis.createdAt
    }
  ];

  const summarySheet =
    XLSX.utils.aoa_to_sheet(summaryRows);

  const dashboardSheet =
    XLSX.utils.aoa_to_sheet(dashboardRows);

  const kpiSheet =
    XLSX.utils.json_to_sheet(kpiRows);

  const insightSheet =
    XLSX.utils.json_to_sheet(insightRows);

  const actionPlanSheet =
    XLSX.utils.json_to_sheet(actionPlanRows);

  const roadmapSheet =
    XLSX.utils.json_to_sheet(roadmapRows);

  const executiveSheet =
    XLSX.utils.json_to_sheet(executiveRows);

  const benchmarkSheet =
    XLSX.utils.json_to_sheet(benchmarkRows);

  const forecastSheet =
    XLSX.utils.json_to_sheet(forecastRows);

  const alertSheet =
    XLSX.utils.json_to_sheet(alertRows);

  const scenarioSheet =
    XLSX.utils.json_to_sheet(scenarioRows);

  const rawAnalysisSheet =
    XLSX.utils.json_to_sheet(rawAnalysisRows);

  setColumns(summarySheet, [30, 90]);
  setColumns(dashboardSheet, [34, 24]);
  setColumns(kpiSheet, [34, 40, 18, 14]);
  setColumns(insightSheet, [8, 38, 90, 18, 30]);
  setColumns(
    actionPlanSheet,
    [12, 40, 18, 16, 16, 12, 38, 90]
  );
  setColumns(roadmapSheet, [24, 10, 100]);
  setColumns(executiveSheet, [34, 10, 110]);
  setColumns(
    benchmarkSheet,
    [30, 38, 14, 18, 20, 18, 18, 14, 16, 16, 38]
  );

  setColumns(
    forecastSheet,
    [30, 38, 14, 18, 14, 18, 18, 18, 14, 14, 16, 16]
  );

  setColumns(
    alertSheet,
    [30, 14, 18, 36, 60, 60, 16, 22]
  );

  setColumns(
    scenarioSheet,
    [
      26, 28, 46, 18, 18, 18, 18, 18,
      18, 18, 18, 18, 18, 18, 18, 14,
      16, 32, 60
    ]
  );

  setColumns(rawAnalysisSheet, [30, 110]);

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    'Yönetici Özeti'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    dashboardSheet,
    'Dashboard'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    kpiSheet,
    'KPI'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    insightSheet,
    'İçgörüler'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    actionPlanSheet,
    'Aksiyon Planı'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    roadmapSheet,
    '30-60-90 Gün'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    executiveSheet,
    'Yönetici Değerlendirmesi'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    benchmarkSheet,
    'Benchmark'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    forecastSheet,
    'Tahminler'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    alertSheet,
    'CEO Alarmları'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    scenarioSheet,
    'Senaryolar'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rawAnalysisSheet,
    'Analiz Verisi'
  );

  return {
    XLSX,
    workbook
  };
}

export async function downloadBusinessExcelReport(
  input: BusinessReportInput
): Promise<void> {
  const { XLSX, workbook } =
    await buildBusinessExcelWorkbook(input);

  const date = new Date()
    .toISOString()
    .slice(0, 10);

  const fileName = [
    sanitizeFileName(input.businessName),
    'kurumsal-yonetici-raporu',
    date
  ].join('-');

  XLSX.writeFile(
    workbook,
    `${fileName}.xlsx`,
    {
      compression: true
    }
  );
}
