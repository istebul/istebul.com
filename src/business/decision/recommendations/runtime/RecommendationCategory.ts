/**
 * İSTEBUL Business Decision Engine — recommendation kategori tipleri (PR-103C).
 */

/**
 * Recommendation kategorileri.
 */
export type RecommendationCategory =
  | 'data-quality'
  | 'analysis'
  | 'dataset'
  | 'metadata'
  | 'informational';

export const RECOMMENDATION_CATEGORY_LABELS: Readonly<
  Record<RecommendationCategory, string>
> = Object.freeze({
  'data-quality': 'Data Quality',
  analysis: 'Analysis',
  dataset: 'Dataset',
  metadata: 'Metadata',
  informational: 'Informational'
});
