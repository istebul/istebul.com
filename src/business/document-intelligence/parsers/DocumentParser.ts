import type { BusinessDocument } from '../models/BusinessDocument';
import type { ParsedDocument } from '../models/ParsedDocument';

export interface DocumentParser {
  supports(document: BusinessDocument): boolean;
  parse(document: BusinessDocument): Promise<ParsedDocument>;
}
