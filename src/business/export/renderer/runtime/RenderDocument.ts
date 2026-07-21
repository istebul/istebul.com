/**
 * İSTEBUL Business Export Engine — RenderDocument (PR-106C).
 *
 * Formatlardan bağımsız, render edilebilir ortak çıktı modeli.
 * Dosya / PDF / HTML / DOCX üretmez.
 */

import type { OutputFormatId } from '../../../knowledge/outputs/OutputDefinition';
import type { ExportContent } from '../../modelBuilder/runtime/ExportContent';
import type { RenderSection } from './RenderSection';

/**
 * Render üst bilgisi.
 */
export interface RenderMetadata {
  /** Render document kimliği */
  id: string;
  /** Kaynak ExportModel kimliği */
  exportModelId: string;
  /** Kaynak istek kimliği */
  requestId: string;
  /** Başlık */
  title: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Format kimlikleri (taşıma; üretim yok) */
  formatIds: readonly OutputFormatId[];
  /** DocumentModel kimliği */
  documentModelId: string;
  /** DashboardModel kimliği */
  dashboardModelId: string;
  /** Report DNA kimliği */
  reportDnaId: string;
  /** Şablon kimliği */
  templateId: string;
  /** Hedef kimliği */
  targetId: string;
  /** Oluşturulma (ISO 8601) */
  createdAt: string;
  /** Sürüm */
  version: string;
}

/**
 * Render header.
 */
export interface RenderHeader {
  title: string;
  documentTitle?: string;
  dashboardTitle?: string;
  locale: 'tr' | 'en';
  reportDnaId: string;
}

/**
 * Render footer.
 */
export interface RenderFooter {
  documentModelId: string;
  dashboardModelId: string;
  totalSectionCount: number;
  totalBlockCount: number;
  content: ExportContent;
}

/**
 * Formatlardan bağımsız RenderDocument.
 */
export interface RenderDocument {
  /** Üst veri */
  metadata: RenderMetadata;
  /** Başlık alanı */
  header: RenderHeader;
  /** Bölümler (deterministik sıra) */
  sections: readonly RenderSection[];
  /** Alt bilgi */
  footer: RenderFooter;
  /** İçerik var mı */
  present: boolean;
}
