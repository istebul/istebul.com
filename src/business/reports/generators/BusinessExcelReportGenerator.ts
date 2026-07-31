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

export async function downloadBusinessExcelReport(
  input: BusinessReportInput
): Promise<void> {
  const XLSX = await import('xlsx');
  const { analysis } = input;

  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ['İSTEBUL Business Yönetici Raporu'],
    [],
    ['İşletme', input.businessName],
    ['Analiz türü', analysis.analysisType],
    ['Kategori', analysis.category],
    ['Belge sağlık skoru', analysis.score],
    ['KPI sayısı', analysis.kpis.length],
    ['İçgörü sayısı', analysis.insights.length],
    ['Analiz tarihi', analysis.createdAt],
    [],
    ['Yönetici özeti'],
    [analysis.summary]
  ];

  const kpiRows = analysis.kpis.map((kpi) => ({
    Gösterge: kpi.label,
    Değer: kpi.value,
    Birim: kpi.unit ?? ''
  }));

  const insightRows = analysis.insights.map(
    (insight, index) => ({
      Sıra: index + 1,
      Başlık: insight.title,
      Açıklama: insight.description,
      Önem: insight.severity
    })
  );

  const recommendationRows =
    analysis.recommendations.map(
      (recommendation, index) => ({
        Öncelik: index + 1,
        Aksiyon: recommendation
      })
    );

  const executiveSectionRows =
    input.executiveReport?.sections.flatMap(
      (section) => [
        {
          Bölüm: section.title,
          İçerik: ''
        },
        ...section.content.map((item) => ({
          Bölüm: section.title,
          İçerik: item
        }))
      ]
    ) ?? [];

  const summarySheet =
    XLSX.utils.aoa_to_sheet(summaryRows);

  const kpiSheet =
    XLSX.utils.json_to_sheet(kpiRows);

  const insightSheet =
    XLSX.utils.json_to_sheet(insightRows);

  const recommendationSheet =
    XLSX.utils.json_to_sheet(recommendationRows);

  const executiveSheet =
    XLSX.utils.json_to_sheet(executiveSectionRows);

  summarySheet['!cols'] = [
    { wch: 26 },
    { wch: 85 }
  ];

  kpiSheet['!cols'] = [
    { wch: 38 },
    { wch: 18 },
    { wch: 14 }
  ];

  insightSheet['!cols'] = [
    { wch: 8 },
    { wch: 34 },
    { wch: 85 },
    { wch: 16 }
  ];

  recommendationSheet['!cols'] = [
    { wch: 12 },
    { wch: 100 }
  ];

  executiveSheet['!cols'] = [
    { wch: 32 },
    { wch: 110 }
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    'Yönetici Özeti'
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
    recommendationSheet,
    'Aksiyon Planı'
  );

  if (executiveSectionRows.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      executiveSheet,
      'Yönetici Değerlendirmesi'
    );
  }

  const date = new Date()
    .toISOString()
    .slice(0, 10);

  const fileName = [
    sanitizeFileName(input.businessName),
    'yonetici-raporu',
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
