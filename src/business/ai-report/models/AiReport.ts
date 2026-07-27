export type AiReportType =
  | 'warehouse-count'
  | 'cost-analysis'
  | 'financial-performance'
  | 'executive-summary';

export interface AiReportSection {
  id: string;
  title: string;
  content: string;
  highlights: string[];
}

export interface AiReport {
  title: string;
  reportType: AiReportType;
  executiveSummary: string;
  sections: AiReportSection[];
  recommendations: string[];
  risks: string[];
  generatedAt: string;
}

export interface GenerateAiReportInput {
  reportType: AiReportType;
  title: string;
  instructions: string;
  dataSummary?: string;
}
