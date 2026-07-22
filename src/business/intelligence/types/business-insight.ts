export type InsightKind = 'trend' | 'positive' | 'risk' | 'anomaly';

export type InsightSeverity = 'info' | 'positive' | 'warning' | 'critical';

export interface BusinessInsight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  title: string;
  body: string;
  relatedMetricIds: readonly string[];
}

export interface BusinessInsightsResult {
  insights: readonly BusinessInsight[];
  generatedAt: string;
}
