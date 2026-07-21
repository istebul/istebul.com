/**
 * İSTEBUL Business Export Engine — FormatDocument (PR-106D).
 *
 * Formata özgü çıktı modeli — fiziksel dosya değildir.
 */

import type { FormatRepresentationKind } from './FormatRepresentation';

/**
 * Format document üst bilgisi.
 */
export interface FormatDocumentMetadata {
  /** Format document kimliği */
  id: string;
  /** Kaynak RenderDocument kimliği */
  renderDocumentId: string;
  /** Kaynak ExportModel / istek kimliği */
  requestId: string;
  /** Başlık */
  title: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Report DNA */
  reportDnaId: string;
  /** Oluşturulma (ISO 8601) */
  createdAt: string;
  /** Sürüm */
  version: string;
}

/**
 * Format outline düğümü — RenderSection/Block projeksiyonu.
 */
export interface FormatOutlineNode {
  id: string;
  title: string;
  order: number;
  kind: 'section' | 'block';
  blockKind?: string;
  children?: readonly FormatOutlineNode[];
}

/**
 * Formata özgü yapısal representation (bayt yok).
 */
export interface FormatRepresentationModel {
  /** Temsil türü */
  kind: FormatRepresentationKind;
  /** Sayfa / gövde özeti */
  bodySummary: string;
  /** Bölüm başlıkları */
  headings: readonly string[];
  /** Blok sayısı */
  blockCount: number;
  /** Outline */
  outline: readonly FormatOutlineNode[];
  /** Ek format ipuçları — içerik üretmez */
  hints: Readonly<Record<string, string | number | boolean | null>>;
}

/**
 * Tek format document — dosya yazılmaz.
 */
export interface FormatDocument {
  /** Kimlik */
  id: string;
  /** Temsil kimliği */
  formatId: FormatRepresentationKind;
  /** Görünen ad */
  name: string;
  /** MIME */
  mimeType: string;
  /** Uzantı önerisi */
  fileExtension: string;
  /** Deterministik sıra */
  order: number;
  /** Üst veri */
  metadata: FormatDocumentMetadata;
  /** Representation modeli */
  representation: FormatRepresentationModel;
  /** İçerik var mı */
  present: boolean;
}
