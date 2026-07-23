/**
 * İSTEBUL Business Admin — ExportResult girdi sözleşmesi (PR-202D).
 *
 * Export Engine `ExportResult` çıktısı ile yapısal uyumlu.
 * Engine yeniden yazılmaz; yalnızca projeksiyon girdisi olarak kullanılır.
 */

/**
 * Export metadata özeti.
 */
export interface ExportResultMetadata {
  id: string;
  title: string;
  locale: 'tr' | 'en';
  createdAt: string;
  version: string;
  formatIds: readonly string[];
  documentModelId?: string;
  dashboardModelId?: string;
  reportDnaId?: string;
}

/**
 * Export özeti.
 */
export interface ExportResultSummary {
  headline: string;
  artifactCount: number;
  formatLabels: readonly string[];
  warnings?: readonly string[];
}

/**
 * Export artifact özeti.
 */
export interface ExportResultArtifact {
  id: string;
  formatId: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
}

/**
 * Export Engine sonucu — workspace girdisi.
 * CRUD / API / DB yok; yalnızca okuma projeksiyonu.
 */
export interface ExportResult {
  requestId: string;
  status: string;
  lastStage: string;
  metadata: ExportResultMetadata;
  artifacts: readonly ExportResultArtifact[];
  summary: ExportResultSummary;
  completedAt?: string;
}
