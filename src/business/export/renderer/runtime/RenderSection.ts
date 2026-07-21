/**
 * İSTEBUL Business Export Engine — RenderSection (PR-106C).
 */

import type { RenderBlock } from './RenderBlock';

/**
 * Tek render bölümü.
 */
export interface RenderSection {
  /** Bölüm kimliği */
  id: string;
  /** Başlık */
  title: string;
  /** Sıra */
  order: number;
  /** Kaynak */
  source: 'document' | 'dashboard';
  /** Kaynak rapor bölüm kimliği */
  sourceSectionId?: string;
  /** Widget kimlikleri */
  widgetIds?: readonly string[];
  /** İçerik blokları (deterministik sıra) */
  blocks: readonly RenderBlock[];
}
