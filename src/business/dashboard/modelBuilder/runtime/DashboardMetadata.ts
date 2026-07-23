/**
 * İSTEBUL Business Dashboard Engine — sunumdan bağımsız Dashboard Metadata (PR-105B).
 *
 * Foundation `models/DashboardMetadata` ile karıştırılmamalıdır; bu tip yalnızca
 * Dashboard Model Builder veri modelinin bir parçasıdır.
 */

/**
 * Dashboard Model üst bilgisi — widget/KPI üretmez.
 */
export interface DashboardMetadata {
  /** Dashboard iş / model kimliği */
  id: string;
  /** Knowledge Report DNA kimliği */
  reportDnaId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Dataset kimliği */
  datasetId: string;
  /** Kaynak rapor model kimliği */
  reportModelId: string;
  /** Kaynak karar isteği kimliği */
  decisionRequestId: string;
  /** Analiz isteği kimliği */
  analysisRequestId: string;
  /** Yerleşim kimliği */
  layoutId: string;
  /** Tema kimliği */
  themeId: string;
  /** Oluşturulma (ISO 8601) */
  createdAt: string;
  /** Şema / motor sürümü */
  version: string;
  /** Etiketler */
  tags: readonly string[];
}
