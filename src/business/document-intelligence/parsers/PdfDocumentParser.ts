import type { BusinessDocument } from '../models/BusinessDocument';
import type { ParsedDocument } from '../models/ParsedDocument';
import type { DocumentParser } from './DocumentParser';

export class PdfDocumentParser implements DocumentParser {
  supports(businessDocument: BusinessDocument): boolean {
    return businessDocument.format === 'pdf';
  }

  async parse(
    businessDocument: BusinessDocument
  ): Promise<ParsedDocument> {
    return {
      documentId: businessDocument.id,
      title: businessDocument.fileName,
      plainText: '',
      tables: [],
      warnings: [
        'PDF ayrıştırma desteği henüz etkinleştirilmedi.'
      ],
      parsedAt: new Date().toISOString()
    };
  }
}
