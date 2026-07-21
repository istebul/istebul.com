/**
 * İSTEBUL Business Export Engine — Export Model parça kimlikleri (PR-106B).
 */

export type ExportPartId =
  | 'metadata'
  | 'content'
  | 'document-references'
  | 'dashboard-references'
  | 'report-references'
  | 'section-references'
  | 'widget-references'
  | 'kpi-references';

export const EXPORT_PART_LABELS: Readonly<Record<ExportPartId, string>> =
  Object.freeze({
    metadata: 'Export Metadata',
    content: 'Export Content',
    'document-references': 'Document References',
    'dashboard-references': 'Dashboard References',
    'report-references': 'Report References',
    'section-references': 'Section References',
    'widget-references': 'Widget References',
    'kpi-references': 'KPI References'
  });

export const EXPORT_PART_ORDER: readonly ExportPartId[] = Object.freeze([
  'metadata',
  'content',
  'document-references',
  'dashboard-references',
  'report-references',
  'section-references',
  'widget-references',
  'kpi-references'
]);
