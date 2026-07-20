/**
 * İSTEBUL Business Report Engine — ReportSectionRecord (PR-104D).
 */

import type { ReportSection } from '../../models/ReportSection';
import type { NarrativeKind } from '../../narrative/runtime/NarrativeKind';
import type { ReportSectionId } from './ReportSectionId';

/**
 * Zengin Report Section kaydı — foundation ReportSection + runtime alanlar.
 */
export interface ReportSectionRecord {
  /** Kimlik */
  id: string;
  /** Standart section id */
  sectionId: ReportSectionId;
  /** Section kodu */
  sectionCode: string;
  /** Başlık */
  title: string;
  /** Sıra */
  order: number;
  /** Kaynak narrative türü */
  sourceNarrativeKind?: NarrativeKind;
  /** Kullanılan narrative kayıt kimliği */
  sourceNarrativeId?: string;
  /** Kullanılan narrative şablon kimliği */
  sourceTemplateId?: string;
  /** Yapılandırılmış içerik */
  content: Readonly<Record<string, unknown>>;
  /** Foundation projeksiyonu */
  section: ReportSection;
}
