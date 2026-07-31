import type {
  BusinessAlertResult,
  BusinessBenchmarkResult,
  BusinessForecastResult,
  BusinessScenarioResult
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
  alerts?: BusinessAlertResult;
  scenarios?: readonly {
    id: string;
    title: string;
    description: string;
    result: BusinessScenarioResult;
  }[];
}
