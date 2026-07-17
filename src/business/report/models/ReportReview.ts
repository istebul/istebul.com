/**
 * İSTEBUL Business Report Engine — inceleme kaydı.
 */

export type ReportReviewVerdict = 'onaylandi' | 'revizyon-gerekli' | 'reddedildi';

/**
 * Kalite / tutarlılık inceleme özeti (otomatik veya kural tabanlı).
 */
export interface ReportReview {
  verdict: ReportReviewVerdict;
  summary: string;
  issues: readonly string[];
  reviewedAt: string;
}
