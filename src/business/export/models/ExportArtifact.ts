/**
 * İSTEBUL Business Export Engine — artifact modeli.
 */

import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';

/**
 * Export çıktı parçası — bayt üretimi sonraki PR.
 */
export interface ExportArtifact {
  /** Artifact kimliği */
  id: string;
  /** Format */
  formatId: OutputFormatId;
  /** Dosya adı önerisi */
  fileName: string;
  /** MIME türü */
  mimeType: string;
  /** Boyut (bayt) — bilinmiyorsa atlanır */
  sizeBytes?: number;
  /** İçerik referansı — depo / bellek anahtarı; dosya yazılmaz */
  contentRef?: string;
  /** Kontrol özeti (hash placeholder) */
  checksumHint?: string;
}
