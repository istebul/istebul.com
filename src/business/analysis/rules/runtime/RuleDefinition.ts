/**
 * İSTEBUL Business Analysis Engine — runtime kural tanımı (PR-102C).
 *
 * Foundation `AnalysisRuleDefinition` sözleşmesini değiştirmez.
 */

/**
 * Rule Engine önem derecesi.
 */
export type RuleSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * Runtime kural kategorileri.
 */
export type RuleCategory =
  | 'data-quality'
  | 'dataset-structure'
  | 'metadata';

/**
 * Karşılaştırma operatörü.
 */
export type RuleOperator =
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'eq'
  | 'present'
  | 'not-empty';

/**
 * Runtime kural tanımı — yalnızca değerlendirme; karar/öneri yok.
 */
export interface RuleDefinition {
  /** Kararlı kimlik */
  id: string;
  /** Görünen ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Kategori */
  category: RuleCategory;
  /** Önem */
  severity: RuleSeverity;
  /** Birincil KPI kimliği */
  kpiId?: string;
  /** Ek KPI kimlikleri (oran türetme vb.) */
  kpiIds?: readonly string[];
  /** Karşılaştırma operatörü */
  operator: RuleOperator;
  /** Eşik — present/not-empty için opsiyonel */
  threshold?: number;
  /** Sıra */
  order: number;
  /** Aktif mi */
  enabled: boolean;
}

export const RULE_SEVERITY_RANK: Readonly<Record<RuleSeverity, number>> =
  Object.freeze({
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 4
  });

export const RULE_CATEGORY_LABELS: Readonly<Record<RuleCategory, string>> =
  Object.freeze({
    'data-quality': 'Data Quality',
    'dataset-structure': 'Dataset Structure',
    metadata: 'Metadata'
  });
