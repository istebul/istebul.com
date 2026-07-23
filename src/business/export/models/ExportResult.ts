/**
 * İSTEBUL Business Export Engine — sonuç modeli.
 */

import type { ExportArtifact } from './ExportArtifact';
import type { ExportMetadata } from './ExportMetadata';
import type { ExportStage } from './ExportStatus';
import type { ExportStatus } from './ExportStatus';
import type { ExportSummary } from './ExportSummary';

/**
 * Pipeline tamamlandığında dönen export sonucu.
 * Gerçek dosya içeriği yoktur.
 */
export interface ExportResult {
  /** İstek kimliği */
  requestId: string;
  /** Durum */
  status: ExportStatus;
  /** Son aşama */
  lastStage: ExportStage;
  /** Üst veri */
  metadata: ExportMetadata;
  /** Artifact’lar */
  artifacts: readonly ExportArtifact[];
  /** Özet */
  summary: ExportSummary;
  /** Tamamlanma zamanı (ISO 8601) */
  completedAt?: string;
}
