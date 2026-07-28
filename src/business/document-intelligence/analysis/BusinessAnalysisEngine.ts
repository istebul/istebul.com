import type { DocumentClassification } from '../models/DocumentClassification';
import type { NormalizedDocument } from '../models/NormalizedDocument';
import type { BusinessAnalysisResult } from '../models/BusinessAnalysisResult';

export interface BusinessAnalysisEngine {
  analyze(
    document: NormalizedDocument,
    classification: DocumentClassification
  ): Promise<BusinessAnalysisResult>;
}
