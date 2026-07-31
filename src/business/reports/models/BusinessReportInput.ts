import type {
  BusinessBenchmarkResult,
  BusinessForecastResult
} from '../../document-intelligence';
import type {
  StoredBusinessDocumentAnalysis
} from '../../document-intelligence/providers/supabase/SupabaseBusinessDocumentAnalysisProvider';
import type {
  ExecutiveReport
} from '../../reporting/models/ExecutiveReport';

export interface BusinessReportInput {
  businessName: string;
  analysis: StoredBusinessDocumentAnalysis;
  executiveReport?: ExecutiveReport;
  benchmark?: BusinessBenchmarkResult;
  forecast?: BusinessForecastResult;
}
