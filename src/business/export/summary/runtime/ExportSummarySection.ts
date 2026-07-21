/**
 * İSTEBUL Business Export Engine — Export Summary section tipleri (PR-106E).
 */

/**
 * Export Summary bölüm kimlikleri.
 */
export type ExportSummarySectionId =
  | 'metadata'
  | 'validation'
  | 'export-model'
  | 'renderer'
  | 'format'
  | 'execution'
  | 'warnings';

/**
 * Tek bir Export Summary bölümü — yalnızca nesnel özet.
 */
export interface ExportSummarySection {
  /** Bölüm kimliği */
  id: ExportSummarySectionId;
  /** Başlık */
  title: string;
  /** Kısa nesnel özet satırları */
  items: readonly string[];
  /** Yapılandırılmış sayılar / etiketler */
  metrics: Readonly<Record<string, string | number | boolean | null>>;
  /** Sıra */
  order: number;
}

export const EXPORT_SUMMARY_SECTION_LABELS: Readonly<
  Record<ExportSummarySectionId, string>
> = Object.freeze({
  metadata: 'Metadata',
  validation: 'Validation',
  'export-model': 'Export Model',
  renderer: 'Renderer',
  format: 'Format',
  execution: 'Execution',
  warnings: 'Warnings'
});

export const EXPORT_SUMMARY_SECTION_ORDER: readonly ExportSummarySectionId[] =
  Object.freeze([
    'metadata',
    'validation',
    'export-model',
    'renderer',
    'format',
    'execution',
    'warnings'
  ]);
