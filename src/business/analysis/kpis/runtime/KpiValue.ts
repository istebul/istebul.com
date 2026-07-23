/**
 * İSTEBUL Business Analysis Engine — runtime KPI değeri (PR-102B).
 */

/**
 * Hesaplanmış KPI değeri.
 */
export interface KpiValue {
  /** Ham değer */
  raw: string | number | null;
  /** İsteğe bağlı biçimlendirilmiş gösterim */
  formatted?: string;
  /** Güven 0–1 */
  confidence?: number;
}
