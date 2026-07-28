export type NormalizedCellValue =
  | string
  | number
  | boolean
  | null;

export interface NormalizedDocumentColumn {
  key: string;
  label: string;
  detectedType:
    | 'text'
    | 'number'
    | 'currency'
    | 'percentage'
    | 'date'
    | 'boolean'
    | 'unknown';
  nullCount: number;
  sampleValues: NormalizedCellValue[];
}

export interface NormalizedDocumentTable {
  name: string;
  columns: NormalizedDocumentColumn[];
  rows: Array<Record<string, NormalizedCellValue>>;
  rowCount: number;
}

export interface NormalizedDocument {
  documentId: string;
  title: string;
  plainText: string;
  tables: NormalizedDocumentTable[];
  warnings: string[];
  normalizedAt: string;
}
