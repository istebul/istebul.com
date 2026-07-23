/**
 * İSTEBUL Business Analysis Engine — runtime KPI tanımı (PR-102B).
 *
 * Knowledge `KPIDefinition` sözleşmesini değiştirmez.
 */

/**
 * Dataset analizi KPI kategorileri.
 */
export type KpiCategory =
  | 'dataset-metrics'
  | 'data-quality'
  | 'structure'
  | 'metadata';

/**
 * Runtime hesaplama tipi.
 */
export type KpiCalculationType = 'adet' | 'oran' | 'ortalama' | 'metin';

/**
 * Runtime KPI tanımı — temel dataset / kalite metrikleri.
 */
export interface KpiDefinition {
  /** Kararlı kimlik */
  id: string;
  /** Görünen ad (Türkçe) */
  name: string;
  /** Açıklama */
  description: string;
  /** Kategori */
  category: KpiCategory;
  /** Birim */
  unit: string;
  /** Hesaplama tipi */
  calculationType: KpiCalculationType;
  /** Sıra */
  order: number;
}

export const KPI_CATEGORY_LABELS: Readonly<Record<KpiCategory, string>> =
  Object.freeze({
    'dataset-metrics': 'Dataset Metrics',
    'data-quality': 'Data Quality',
    structure: 'Structure',
    metadata: 'Metadata'
  });
