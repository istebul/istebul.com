export interface BusinessTemplate {
  id: string;
  title: string;
  category: "report" | "presentation" | "analysis";
  description: string;
}

export const BUSINESS_STUDIO_TEMPLATES: BusinessTemplate[] = [
  {
    id: "warehouse-count",
    title: "Depo Sayım Raporu",
    category: "report",
    description: "Depo sayımı, sayım farkları ve stok doğruluğu."
  },
  {
    id: "cost-analysis",
    title: "Maliyet Analiz Raporu",
    category: "analysis",
    description: "Ürün, sipariş ve departman maliyetleri."
  },
  {
    id: "inventory-analysis",
    title: "Stok Analiz Raporu",
    category: "analysis",
    description: "ABC, yaşlandırma, kritik stok ve fire analizi."
  },
  {
    id: "financial-report",
    title: "Gelir-Gider Raporu",
    category: "report",
    description: "Finansal performans ve kârlılık değerlendirmesi."
  },
  {
    id: "board-presentation",
    title: "Yönetim Kurulu Sunumu",
    category: "presentation",
    description: "Yönetim kurulu ve üst yönetim sunumu."
  },
  {
    id: "free-ai",
    title: "Serbest AI Raporu",
    category: "report",
    description: "Konuyu yazın, AI profesyonel raporu hazırlasın."
  }
];
