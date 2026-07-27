import type { BusinessDocument } from '../models/BusinessDocument';
import type { ParsedDocument } from '../models/ParsedDocument';
import type { DocumentParser } from '../parsers/DocumentParser';

export class DocumentIntelligenceService {
  constructor(private readonly parsers: DocumentParser[]) {}

  async parse(document: BusinessDocument): Promise<ParsedDocument> {
    const parser = this.parsers.find((candidate) =>
      candidate.supports(document)
    );

    if (!parser) {
      throw new Error(
        `${document.format.toUpperCase()} biçimi için ayrıştırıcı bulunamadı.`
      );
    }

    return parser.parse(document);
  }
}
