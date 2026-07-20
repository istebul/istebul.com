/**
 * Builtin Report Section tanımları (PR-104D).
 */

import type { ReportSectionDefinition } from './ReportSectionDefinition';
import {
  REPORT_SECTION_KIND_BY_ID,
  REPORT_SECTION_LABELS,
  REPORT_SECTION_NARRATIVE_KIND,
  REPORT_SECTION_ORDER
} from './ReportSectionId';

export const BUILTIN_REPORT_SECTION_DEFINITIONS: readonly ReportSectionDefinition[] =
  Object.freeze(
    REPORT_SECTION_ORDER.map((id, index) =>
      Object.freeze({
        id,
        sectionCode: `SEC_${id.toUpperCase().replace(/-/g, '_')}`,
        kind: REPORT_SECTION_KIND_BY_ID[id],
        title: REPORT_SECTION_LABELS[id],
        description: `Standart rapor bölümü: ${REPORT_SECTION_LABELS[id]}`,
        sourceNarrativeKind: REPORT_SECTION_NARRATIVE_KIND[id],
        order: index + 1,
        enabled: true
      })
    )
  );

export const BUILTIN_REPORT_SECTION_DEFINITION_COUNT =
  BUILTIN_REPORT_SECTION_DEFINITIONS.length;

export function getBuiltinReportSectionDefinition(
  id: string
): ReportSectionDefinition | undefined {
  return BUILTIN_REPORT_SECTION_DEFINITIONS.find((item) => item.id === id);
}

export function getBuiltinReportSectionDefinitionByCode(
  sectionCode: string
): ReportSectionDefinition | undefined {
  return BUILTIN_REPORT_SECTION_DEFINITIONS.find(
    (item) => item.sectionCode === sectionCode
  );
}
