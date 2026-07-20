/**
 * İSTEBUL Business Decision Engine — runtime politika tanımı (PR-103B).
 *
 * Foundation port/model sözleşmelerini değiştirmez.
 */

/**
 * Policy Engine önem derecesi.
 */
export type PolicySeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * Runtime politika kategorileri.
 */
export type PolicyCategory =
  | 'data-quality'
  | 'analysis'
  | 'dataset'
  | 'metadata';

/**
 * Karşılaştırma / kontrol operatörü.
 */
export type PolicyOperator =
  | 'lt'
  | 'gte'
  | 'eq'
  | 'present'
  | 'finding-severity'
  | 'finding-rule';

/**
 * Runtime politika tanımı — yalnızca değerlendirme; öneri/aksiyon yok.
 */
export interface PolicyDefinition {
  /** Kararlı kimlik */
  id: string;
  /** Görünen ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Kategori */
  category: PolicyCategory;
  /** Önem */
  severity: PolicySeverity;
  /** Karşılaştırma operatörü */
  operator: PolicyOperator;
  /** Eşik — finding-* için opsiyonel */
  threshold?: number;
  /** Finding severity hedefi (finding-severity) */
  findingSeverity?: 'bilgi' | 'uyari' | 'kritik';
  /** Sıra */
  order: number;
  /** Aktif mi */
  enabled: boolean;
}

export const POLICY_SEVERITY_RANK: Readonly<Record<PolicySeverity, number>> =
  Object.freeze({
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 4
  });

export const POLICY_CATEGORY_LABELS: Readonly<
  Record<PolicyCategory, string>
> = Object.freeze({
  'data-quality': 'Data Quality',
  analysis: 'Analysis',
  dataset: 'Dataset',
  metadata: 'Metadata'
});
