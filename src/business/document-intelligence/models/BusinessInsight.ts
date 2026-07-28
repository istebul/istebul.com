export type InsightSeverity =
  | 'info'
  | 'success'
  | 'warning'
  | 'critical';

export interface BusinessInsight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  source: string;
}
