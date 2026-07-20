/**
 * İSTEBUL Business Report Engine — NarrativeRecord (PR-104C).
 */

import type { NarrativeKind } from './NarrativeKind';

/**
 * Üretilmiş narrative kaydı.
 */
export interface NarrativeRecord {
  /** Kayıt kimliği */
  id: string;
  /** Tür */
  kind: NarrativeKind;
  /** Başlık */
  title: string;
  /** Şablondan üretilmiş gövde */
  body: string;
  /** Şablondan üretilmiş vurgular */
  highlights: readonly string[];
  /** Kullanılan şablon kimliği */
  templateId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Sıra */
  order: number;
}
