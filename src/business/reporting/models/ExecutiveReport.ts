import type { BusinessInsight } from '../../document-intelligence/models/BusinessInsight';
import type { BusinessKpi } from '../../document-intelligence/models/BusinessKpi';
import type { ExecutiveReportSection } from './ExecutiveReportSection';

export interface ExecutiveReport {
  title: string;
  businessName: string;
  documentName: string;
  generatedAt: Date;

  score: number;
  summary: string;

  kpis: BusinessKpi[];
  insights: BusinessInsight[];
  recommendations: string[];

  sections: ExecutiveReportSection[];
}
