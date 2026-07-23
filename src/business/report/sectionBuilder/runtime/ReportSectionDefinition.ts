/**
 * İSTEBUL Business Report Engine — ReportSectionDefinition (PR-104D).
 */

import type { ReportSectionKind } from '../../models/ReportSection';
import type { NarrativeKind } from '../../narrative/runtime/NarrativeKind';
import type { ReportSectionId } from './ReportSectionId';

/**
 * Runtime Report Section tanımı.
 */
export interface ReportSectionDefinition {
  /** Kararlı kimlik */
  id: ReportSectionId;
  /** SectionRegistry kodu */
  sectionCode: string;
  /** Foundation tür */
  kind: ReportSectionKind;
  /** Başlık */
  title: string;
  /** Açıklama */
  description: string;
  /** Kaynak narrative türü (opsiyonel) */
  sourceNarrativeKind?: NarrativeKind;
  /** Sıra — deterministic */
  order: number;
  /** Aktif mi */
  enabled: boolean;
}
