/**
 * İSTEBUL Business Document Engine — inceleme kaydı.
 */

export type DocumentReviewVerdict =
  | 'onaylandi'
  | 'revizyon-gerekli'
  | 'reddedildi';

/**
 * Yerleşim / stil tutarlılık incelemesi.
 */
export interface DocumentReview {
  verdict: DocumentReviewVerdict;
  summary: string;
  issues: readonly string[];
  reviewedAt: string;
}
