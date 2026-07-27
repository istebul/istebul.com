export interface DocumentMetric {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
}

export interface DocumentFinding {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface DocumentAnalysis {
  documentId: string;
  summary: string;
  metrics: DocumentMetric[];
  findings: DocumentFinding[];
  recommendations: string[];
  analyzedAt: string;
}
