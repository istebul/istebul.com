/**
 * İSTEBUL Business — prompt anahtar tip sözleşmeleri.
 *
 * Bu PR’da prompt metni yazılmaz; yalnızca anahtar isimleri tanımlanır.
 * Gerçek prompt içerikleri sonraki PR’larda Prompt Registry’ye eklenir.
 */

/**
 * Resmî AI prompt anahtarları.
 * Anahtarlar İngilizce kebab-case; içerik (gelecekte) Türkçe olacaktır.
 */
export type PromptKey =
  | 'inventory-analysis'
  | 'blind-count-analysis'
  | 'budget-analysis'
  | 'cashflow-analysis'
  | 'income-expense-analysis'
  | 'sales-performance-analysis'
  | 'personnel-analysis'
  | 'vehicle-cost-analysis'
  | 'risk-analysis'
  | 'swot-analysis'
  | 'executive-summary';

/**
 * Prompt kayıt girişi — şimdilik yalnızca anahtar ve meta.
 * `body` alanı bilerek yoktur; prompt yazımı sonraki PR’dadır.
 */
export interface PromptRegistryEntry {
  /** Anahtar — PromptRegistry ve Report DNA tarafından kullanılır */
  key: PromptKey;
  /** Ad — kısa Türkçe etiket */
  name: string;
  /** Açıklama — hangi analiz için rezerv edildiği */
  description: string;
  /** Sürüm — prompt şablon sürümü (içerik gelince artar) */
  version: string;
}
