export interface ParsedDocumentTable {
  name: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
}

export interface ParsedDocument {
  documentId: string;
  title: string;
  plainText: string;
  tables: ParsedDocumentTable[];
  warnings: string[];
  parsedAt: string;
}
