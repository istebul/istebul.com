/**
 * İSTEBUL Business Analysis Engine — finding kategori tipleri (PR-102D).
 */

/**
 * Finding kategorileri.
 */
export type FindingCategory =
  | 'data-quality'
  | 'dataset-structure'
  | 'metadata'
  | 'informational';

export const FINDING_CATEGORY_LABELS: Readonly<
  Record<FindingCategory, string>
> = Object.freeze({
  'data-quality': 'Data Quality',
  'dataset-structure': 'Dataset Structure',
  metadata: 'Metadata',
  informational: 'Informational'
});
