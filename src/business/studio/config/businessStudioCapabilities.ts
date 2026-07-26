export interface BusinessStudioCapability {
  id: string;
  title: string;
  description: string;
  acceptedFileTypes: string[];
  outputFormats: string[];
}

export const BUSINESS_STUDIO_CAPABILITIES: BusinessStudioCapability[] = [
  {
    id: "ai-report",
    title: "AI Rapor Oluşturucu",
    description: "Verileri profesyonel rapor ve yönetici özetine dönüştürür.",
    acceptedFileTypes: [".xlsx", ".csv", ".pdf", ".docx"],
    outputFormats: ["pdf", "docx"]
  },
  {
    id: "ai-presentation",
    title: "AI Sunum Oluşturucu",
    description: "Rapor ve verilerden kurumsal sunum hazırlar.",
    acceptedFileTypes: [".xlsx", ".csv", ".pdf", ".docx"],
    outputFormats: ["pptx", "pdf"]
  },
  {
    id: "warehouse-count",
    title: "Depo Sayım Analizi",
    description: "Sayım farkı, stok doğruluğu ve kayıp risklerini analiz eder.",
    acceptedFileTypes: [".xlsx", ".csv"],
    outputFormats: ["pdf", "docx", "xlsx"]
  },
  {
    id: "cost-analysis",
    title: "Maliyet Analizi",
    description: "Ürün, sipariş, departman ve operasyon maliyetlerini analiz eder.",
    acceptedFileTypes: [".xlsx", ".csv"],
    outputFormats: ["pdf", "docx", "xlsx", "pptx"]
  }
];
