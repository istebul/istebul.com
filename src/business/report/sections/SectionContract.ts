/**
 * Bölüm şablon sözleşmesi — SectionRegistry kayıtları için.
 */

import type { ReportSectionKind } from '../models/ReportSection';

export interface SectionTemplateDefinition {
  sectionCode: string;
  kind: ReportSectionKind;
  title: string;
  description: string;
  order: number;
  version: string;
}
