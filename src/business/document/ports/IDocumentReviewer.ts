import type { DocumentContext } from '../models/DocumentContext';
import type { DocumentModel } from '../models/DocumentModel';
import type { DocumentReview } from '../models/DocumentReview';

export interface IDocumentReviewer {
  review(
    context: DocumentContext,
    draft: DocumentModel
  ): Promise<DocumentReview>;
}
