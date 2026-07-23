/**
 * İSTEBUL Business Import Engine — NormalizedField (PR-101H).
 *
 * BusinessDataset değildir; builder için normalize edilmiş alan.
 */

/**
 * Normalize edilmiş ilkel tip.
 */
export type NormalizedPrimitiveType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'null'
  | 'collection'
  | 'unknown';

/**
 * Tek normalize edilmiş alan.
 */
export interface NormalizedField {
  /** Normalize business field adı */
  fieldName: string;
  /** Kaynak kolon anahtarı */
  sourceKey: string;
  /** Hedef entity tipi (semantic mapping’den) */
  entityType?: string;
  /** Normalize ilkel tip */
  primitiveType: NormalizedPrimitiveType;
  /** Ham girdi */
  rawValue: unknown;
  /** Normalize değer */
  value: string | number | boolean | null | readonly unknown[];
  /** ISO tarih (primitiveType=date) */
  dateIso?: string;
  /** Uygulanan kural kimlikleri */
  appliedRules: readonly string[];
  /** Alan bazlı uyarı kodları */
  warningCodes: readonly string[];
}
