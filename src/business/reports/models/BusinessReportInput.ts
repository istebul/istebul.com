import type {
  StoredBusinessDocumentAnalysis
} from '../../document-intelligence/providers/supabase/SupabaseBusinessDocumentAnalysisProvider';

export interface BusinessReportInput {
  businessName: string;
  analysis: StoredBusinessDocumentAnalysis;
}
