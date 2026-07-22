export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface BusinessRecommendation {
  id: string;
  title: string;
  /** Example-style AI suggestion sentence. */
  message: string;
  priority: RecommendationPriority;
  relatedInsightIds: readonly string[];
}

export interface BusinessRecommendationsResult {
  recommendations: readonly BusinessRecommendation[];
  generatedAt: string;
}
