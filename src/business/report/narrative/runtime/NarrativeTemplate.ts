/**
 * İSTEBUL Business Report Engine — NarrativeTemplate (PR-104C).
 *
 * Şablon tabanlı metin — LLM / AI kullanmaz.
 */

import type { NarrativeKind } from './NarrativeKind';

/**
 * Narrative şablon tanımı.
 */
export interface NarrativeTemplate {
  /** Kararlı kimlik */
  id: string;
  /** Narrative türü */
  kind: NarrativeKind;
  /** Başlık */
  title: string;
  /**
   * Gövde şablonu — `{{placeholder}}` yer tutucuları ReportModel alanlarıyla doldurulur.
   */
  bodyTemplate: string;
  /** Highlight şablonları */
  highlightTemplates: readonly string[];
  /** Dil */
  locale: 'tr' | 'en';
  /** Sıra */
  order: number;
  /** Aktif mi */
  enabled: boolean;
}
