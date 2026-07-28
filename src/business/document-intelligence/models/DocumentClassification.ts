export type BusinessDocumentCategory =
  | 'sales'
  | 'inventory'
  | 'finance'
  | 'customers'
  | 'hr'
  | 'operations'
  | 'unknown';

export interface DocumentClassificationSignal {
  category: BusinessDocumentCategory;
  score: number;
  matchedTerms: string[];
}

export interface DocumentClassification {
  documentId: string;
  category: BusinessDocumentCategory;
  confidence: number;
  signals: DocumentClassificationSignal[];
  classifiedAt: string;
}
