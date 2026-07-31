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
