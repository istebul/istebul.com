/**
 * İSTEBUL Business Document Engine — kanonik DocumentModel.
 */

import type { DocumentExecutionStatus, DocumentStage } from './DocumentStage';
import type { DocumentFooter } from './DocumentFooter';
import type { DocumentHeader } from './DocumentHeader';
import type { DocumentLayout } from './DocumentLayout';
import type { DocumentMetadata } from './DocumentMetadata';
import type { DocumentReview } from './DocumentReview';
import type { DocumentSection } from './DocumentSection';
import type { DocumentStyle } from './DocumentStyle';
import type { DocumentTheme } from './DocumentTheme';

/**
 * ReportModel’den türetilen yerleşim/stil odaklı doküman modeli.
 * Export Engine bu yapıyı okur (PDF/Word sonraki PR).
 */
export interface DocumentModel {
  /** Model kimliği */
  id: string;
  /** Üst veri */
  metadata: DocumentMetadata;
  /** Durum */
  status: DocumentExecutionStatus;
  /** Son aşama */
  lastStage: DocumentStage;
  /** Yerleşim */
  layout: DocumentLayout;
  /** Stil */
  style: DocumentStyle;
  /** Tema */
  theme: DocumentTheme;
  /** Üst bilgi */
  header: DocumentHeader;
  /** Alt bilgi */
  footer: DocumentFooter;
  /** Bölümler */
  sections: readonly DocumentSection[];
  /** İnceleme */
  review?: DocumentReview;
}
