import type { BusinessKpi } from './BusinessKpi';
import type { BusinessInsight } from './BusinessInsight';

export interface BusinessAnalysisResult {
  documentId: string;
  category: string;
  score: number;
  summary: string;
  kpis: BusinessKpi[];
  insights: BusinessInsight[];
  recommendations: string[];
  analyzedAt: string;
}
