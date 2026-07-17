/**
 * İSTEBUL Business — Report DNA kayıtları (statik).
 *
 * Yeni rapor eklemek için bu listeye `ReportDefinition` eklenir.
 * Rapor üretim motoru bu PR’da yoktur.
 */

import type { ReportDefinition } from './ReportDefinition';

const REPORTS: ReportDefinition[] = [
  {
    id: 'envanter-sayimi',
    name: 'Envanter Sayımı',
    description:
      'Depo ve stok kayıtlarıyla fiziksel sayımı karşılaştırarak envanter doğruluğunu ölçer.',
    category: 'stok',
    sector: 'stok',
    icon: 'package-search',
    requiredDataTypes: [
      'envanter-listesi',
      'sistem-stok-bakiyeleri'
    ],
    supportedFileTypes: ['csv', 'xlsx', 'xls', 'json'],
    kpiIds: ['stok-dogruluk-orani', 'sayim-fark-orani'],
    aiPromptKey: 'inventory-analysis',
    dashboardWidgets: [
      {
        id: 'stok-dogruluk-karti',
        title: 'Stok Doğruluk Oranı',
        widgetType: 'kpi-card',
        kpiIds: ['stok-dogruluk-orani']
      },
      {
        id: 'fark-dagilimi',
        title: 'Fark Dağılımı',
        widgetType: 'bar-chart',
        kpiIds: ['sayim-fark-orani']
      }
    ],
    outputs: ['dashboard', 'pdf', 'excel', 'csv'],
    tags: ['envanter', 'stok', 'sayım'],
    version: '0.1.0',
    status: 'aktif'
  },
  {
    id: 'kor-sayim',
    name: 'Kör Sayım',
    description:
      'Sistem bakiyesi görmeden yapılan sayım sonuçlarını fark analiziyle değerlendirir.',
    category: 'depo',
    sector: 'depo',
    icon: 'eye-off',
    requiredDataTypes: [
      'kor-sayim-sonuclari',
      'sistem-stok-bakiyeleri'
    ],
    supportedFileTypes: ['csv', 'xlsx', 'xls', 'json'],
    kpiIds: ['sayim-fark-orani', 'stok-dogruluk-orani'],
    aiPromptKey: 'blind-count-analysis',
    dashboardWidgets: [
      {
        id: 'kor-sayim-fark-karti',
        title: 'Sayım Fark Oranı',
        widgetType: 'kpi-card',
        kpiIds: ['sayim-fark-orani']
      },
      {
        id: 'kor-sayim-tablo',
        title: 'Fark Kalemleri',
        widgetType: 'table'
      }
    ],
    outputs: ['dashboard', 'pdf', 'excel', 'csv'],
    tags: ['kör sayım', 'depo', 'denetim'],
    version: '0.1.0',
    status: 'aktif'
  },
  {
    id: 'butce-analizi',
    name: 'Bütçe Analizi',
    description:
      'Planlanan bütçe ile gerçekleşen tutarları karşılaştırarak sapma ve eğilimleri özetler.',
    category: 'finans',
    sector: 'finans',
    icon: 'pie-chart',
    requiredDataTypes: ['butce-plani', 'gerceklesen-harcamalar'],
    supportedFileTypes: ['csv', 'xlsx', 'xls', 'json'],
    kpiIds: ['butce-sapma-orani'],
    aiPromptKey: 'budget-analysis',
    dashboardWidgets: [
      {
        id: 'butce-sapma-karti',
        title: 'Bütçe Sapma Oranı',
        widgetType: 'kpi-card',
        kpiIds: ['butce-sapma-orani']
      },
      {
        id: 'butce-gerceklesen-cizgi',
        title: 'Plan / Gerçekleşen',
        widgetType: 'line-chart',
        kpiIds: ['butce-sapma-orani']
      }
    ],
    outputs: ['dashboard', 'pdf', 'word', 'excel', 'powerpoint'],
    tags: ['bütçe', 'finans', 'sapma'],
    version: '0.1.0',
    status: 'aktif'
  },
  {
    id: 'nakit-akisi',
    name: 'Nakit Akışı',
    description:
      'Nakit giriş ve çıkışlarını dönemsel olarak izleyerek likidite görünümü sunar.',
    category: 'finans',
    sector: 'finans',
    icon: 'banknote',
    requiredDataTypes: [
      'nakit-girisleri',
      'nakit-cikislar',
      'acilis-bakiyesi'
    ],
    supportedFileTypes: ['csv', 'xlsx', 'xls', 'json'],
    kpiIds: ['net-nakit-akisi', 'nakit-oran'],
    aiPromptKey: 'cashflow-analysis',
    dashboardWidgets: [
      {
        id: 'net-nakit-karti',
        title: 'Net Nakit Akışı',
        widgetType: 'kpi-card',
        kpiIds: ['net-nakit-akisi']
      },
      {
        id: 'nakit-akisi-cizgi',
        title: 'Nakit Akışı Trendi',
        widgetType: 'line-chart',
        kpiIds: ['net-nakit-akisi', 'nakit-oran']
      }
    ],
    outputs: ['dashboard', 'pdf', 'excel', 'powerpoint'],
    tags: ['nakit', 'likidite', 'finans'],
    version: '0.1.0',
    status: 'aktif'
  },
  {
    id: 'gelir-gider',
    name: 'Gelir Gider',
    description:
      'Gelir ve gider kalemlerini karşılaştırarak dönemsel kârlılık özeti üretir.',
    category: 'muhasebe',
    sector: 'muhasebe',
    icon: 'scale',
    requiredDataTypes: ['gelir-kayitlari', 'gider-kayitlari'],
    supportedFileTypes: ['csv', 'xlsx', 'xls', 'json'],
    kpiIds: ['gelir-gider-orani', 'brut-kar-marji'],
    aiPromptKey: 'income-expense-analysis',
    dashboardWidgets: [
      {
        id: 'gelir-gider-orani-karti',
        title: 'Gelir / Gider Oranı',
        widgetType: 'kpi-card',
        kpiIds: ['gelir-gider-orani']
      },
      {
        id: 'gelir-gider-cubuk',
        title: 'Gelir ve Gider',
        widgetType: 'bar-chart',
        kpiIds: ['gelir-gider-orani', 'brut-kar-marji']
      }
    ],
    outputs: ['dashboard', 'pdf', 'excel', 'word'],
    tags: ['gelir', 'gider', 'muhasebe'],
    version: '0.1.0',
    status: 'aktif'
  },
  {
    id: 'satis-performansi',
    name: 'Satış Performansı',
    description:
      'Satış hedefleri, gerçekleşmeler ve büyüme göstergelerini tek raporda toplar.',
    category: 'satis',
    sector: 'satis',
    icon: 'trending-up',
    requiredDataTypes: [
      'satis-kayitlari',
      'satis-hedefleri'
    ],
    supportedFileTypes: ['csv', 'xlsx', 'xls', 'json'],
    kpiIds: [
      'satis-buyume-orani',
      'hedef-gerceklesme-orani'
    ],
    aiPromptKey: 'sales-performance-analysis',
    dashboardWidgets: [
      {
        id: 'satis-buyume-karti',
        title: 'Satış Büyüme Oranı',
        widgetType: 'kpi-card',
        kpiIds: ['satis-buyume-orani']
      },
      {
        id: 'hedef-gerceklesme-karti',
        title: 'Hedef Gerçekleşme',
        widgetType: 'kpi-card',
        kpiIds: ['hedef-gerceklesme-orani']
      }
    ],
    outputs: ['dashboard', 'pdf', 'powerpoint', 'excel'],
    tags: ['satış', 'hedef', 'performans'],
    version: '0.1.0',
    status: 'aktif'
  },
  {
    id: 'personel-performansi',
    name: 'Personel Performansı',
    description:
      'İnsan kaynakları verileriyle personel verimliliği ve maliyet göstergelerini özetler.',
    category: 'insan-kaynaklari',
    sector: 'insan-kaynaklari',
    icon: 'user-cog',
    requiredDataTypes: [
      'personel-kayitlari',
      'performans-puanlari'
    ],
    supportedFileTypes: ['csv', 'xlsx', 'xls', 'json'],
    kpiIds: [
      'personel-verimlilik-skoru',
      'kisi-basi-maliyet'
    ],
    aiPromptKey: 'personnel-analysis',
    dashboardWidgets: [
      {
        id: 'personel-verimlilik-karti',
        title: 'Personel Verimlilik Skoru',
        widgetType: 'kpi-card',
        kpiIds: ['personel-verimlilik-skoru']
      },
      {
        id: 'kisi-basi-maliyet-karti',
        title: 'Kişi Başı Maliyet',
        widgetType: 'kpi-card',
        kpiIds: ['kisi-basi-maliyet']
      }
    ],
    outputs: ['dashboard', 'pdf', 'word', 'excel'],
    tags: ['personel', 'İK', 'verimlilik'],
    version: '0.1.0',
    status: 'aktif'
  },
  {
    id: 'arac-maliyetleri',
    name: 'Araç Maliyetleri',
    description:
      'Filo ve araç işletme maliyetlerini birim ve toplam bazda analiz eder.',
    category: 'lojistik',
    sector: 'lojistik',
    icon: 'car',
    requiredDataTypes: [
      'arac-listesi',
      'arac-gider-kayitlari'
    ],
    supportedFileTypes: ['csv', 'xlsx', 'xls', 'json'],
    kpiIds: ['arac-birim-maliyet'],
    aiPromptKey: 'vehicle-cost-analysis',
    dashboardWidgets: [
      {
        id: 'arac-birim-maliyet-karti',
        title: 'Araç Birim Maliyeti',
        widgetType: 'kpi-card',
        kpiIds: ['arac-birim-maliyet']
      },
      {
        id: 'arac-maliyet-dagilimi',
        title: 'Maliyet Dağılımı',
        widgetType: 'bar-chart',
        kpiIds: ['arac-birim-maliyet']
      }
    ],
    outputs: ['dashboard', 'pdf', 'excel', 'csv'],
    tags: ['araç', 'filo', 'maliyet', 'lojistik'],
    version: '0.1.0',
    status: 'aktif'
  },
  {
    id: 'risk-analizi',
    name: 'Risk Analizi',
    description:
      'Operasyonel ve finansal risk kayıtlarını skorlayarak önceliklendirme önerir.',
    category: 'denetim',
    sector: 'yonetim',
    icon: 'alert-triangle',
    requiredDataTypes: ['risk-kayitlari', 'kontrol-noktalari'],
    supportedFileTypes: ['csv', 'xlsx', 'xls', 'json', 'docx'],
    kpiIds: ['risk-skoru', 'yuksek-risk-adet'],
    aiPromptKey: 'risk-analysis',
    dashboardWidgets: [
      {
        id: 'risk-skoru-karti',
        title: 'Risk Skoru',
        widgetType: 'kpi-card',
        kpiIds: ['risk-skoru']
      },
      {
        id: 'yuksek-risk-heatmap',
        title: 'Yüksek Risk Haritası',
        widgetType: 'heatmap',
        kpiIds: ['yuksek-risk-adet']
      }
    ],
    outputs: ['dashboard', 'pdf', 'word', 'powerpoint'],
    tags: ['risk', 'denetim', 'uyum'],
    version: '0.1.0',
    status: 'aktif'
  },
  {
    id: 'swot-analizi',
    name: 'SWOT Analizi',
    description:
      'Güçlü yönler, zayıf yönler, fırsatlar ve tehditleri yapılandırılmış özetler.',
    category: 'yonetim',
    sector: 'yonetim',
    icon: 'layout-grid',
    requiredDataTypes: [
      'swot-girdileri',
      'strateji-notlari'
    ],
    supportedFileTypes: ['csv', 'xlsx', 'json', 'docx', 'txt'],
    kpiIds: ['swot-firsat-sayisi', 'yonetici-ozet-skoru'],
    aiPromptKey: 'swot-analysis',
    dashboardWidgets: [
      {
        id: 'swot-matris',
        title: 'SWOT Matrisi',
        widgetType: 'table',
        kpiIds: ['swot-firsat-sayisi']
      }
    ],
    outputs: ['dashboard', 'pdf', 'word', 'powerpoint'],
    tags: ['swot', 'strateji', 'yönetim'],
    version: '0.1.0',
    status: 'aktif'
  },
  {
    id: 'yonetici-ozeti',
    name: 'Yönetici Özeti',
    description:
      'Çoklu göstergelerden üst yönetim için kısa, karar odaklı özet üretir.',
    category: 'yonetim',
    sector: 'yonetim',
    icon: 'file-bar-chart',
    requiredDataTypes: [
      'yonetici-kpi-ozeti',
      'donemsel-finans-ozeti',
      'operasyon-ozeti'
    ],
    supportedFileTypes: [
      'csv',
      'xlsx',
      'xls',
      'json',
      'pdf',
      'docx'
    ],
    kpiIds: [
      'yonetici-ozet-skoru',
      'net-nakit-akisi',
      'satis-buyume-orani',
      'risk-skoru'
    ],
    aiPromptKey: 'executive-summary',
    dashboardWidgets: [
      {
        id: 'yonetici-skor-karti',
        title: 'Yönetici Özet Skoru',
        widgetType: 'kpi-card',
        kpiIds: ['yonetici-ozet-skoru']
      },
      {
        id: 'yonetici-ozet-panel',
        title: 'Karar Özeti',
        widgetType: 'kpi-card',
        kpiIds: [
          'net-nakit-akisi',
          'satis-buyume-orani',
          'risk-skoru'
        ]
      }
    ],
    outputs: [
      'dashboard',
      'pdf',
      'word',
      'powerpoint',
      'json'
    ],
    tags: ['yönetici', 'özet', 'karar'],
    version: '0.1.0',
    status: 'aktif'
  }
];

export const REPORT_REGISTRY: readonly ReportDefinition[] = Object.freeze(REPORTS);

export function getReportById(id: string): ReportDefinition | undefined {
  return REPORT_REGISTRY.find((report) => report.id === id);
}

export function listReports(): readonly ReportDefinition[] {
  return REPORT_REGISTRY;
}

export function listActiveReports(): readonly ReportDefinition[] {
  return REPORT_REGISTRY.filter((report) => report.status === 'aktif');
}

export function listReportsByCategory(
  category: ReportDefinition['category']
): readonly ReportDefinition[] {
  return REPORT_REGISTRY.filter((report) => report.category === category);
}

export const REPORT_COUNT = REPORT_REGISTRY.length;

export default REPORT_REGISTRY;
