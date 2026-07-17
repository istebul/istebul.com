import type { DocumentContext } from '../models/DocumentContext';
import type { DocumentModel } from '../models/DocumentModel';
import type { DocumentRequest } from '../models/DocumentRequest';

export interface IDocumentEngine {
  /**
   * ReportModel’den DocumentModel üretir.
   * Bu PR’da implementasyon yoktur.
   */
  buildDocument(
    request: DocumentRequest,
    context: DocumentContext
  ): Promise<DocumentModel>;
}
