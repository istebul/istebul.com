/**
 * İSTEBUL Business Report Engine — sunumdan bağımsız Report Metadata (PR-104B).
 *
 * Foundation `models/ReportMetadata` ile karıştırılmamalıdır; bu tip yalnızca
 * Report Model Builder veri modelinin bir parçasıdır.
 */

/**
 * Report Model üst bilgisi — metin/narrative üretmez.
 */
export interface ReportMetadata {
  /** Rapor iş / model kimliği */
  id: string;
  /** Knowledge Report DNA kimliği */
  reportDnaId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Kaynak karar isteği kimliği */
  decisionRequestId: string;
  /** Dataset kimliği */
  datasetId: string;
  /** Analiz isteği kimliği */
  analysisRequestId: string;
  /** Oluşturulma (ISO 8601) */
  createdAt: string;
  /** Şema / motor sürümü */
  version: string;
  /** Etiketler */
  tags: readonly string[];
}
