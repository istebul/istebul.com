import * as XLSX from 'xlsx';

import type { BusinessDocument } from '../models/BusinessDocument';
import type {
  ParsedDocument,
  ParsedDocumentTable
} from '../models/ParsedDocument';
import type { DocumentParser } from './DocumentParser';

export interface ExcelDocumentLoader {
  load(document: BusinessDocument): Promise<ArrayBuffer>;
}

const PREVIEW_ROW_LIMIT = 20;

function normalizeCell(
  value: unknown
): string | number | boolean | null {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function worksheetToTable(
  workbook: XLSX.WorkBook,
  sheetName: string
): ParsedDocumentTable {
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    return {
      name: sheetName,
      columns: [],
      rows: []
    };
  }

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: false
  });

  const headerRow = rawRows[0] ?? [];
  const columns = headerRow.map((value, index) => {
    const normalized = normalizeCell(value);

    return normalized === null || String(normalized).trim() === ''
      ? `kolon_${index + 1}`
      : String(normalized).trim();
  });

  const rows = rawRows
    .slice(1, PREVIEW_ROW_LIMIT + 1)
    .map((row) =>
      Object.fromEntries(
        columns.map((column, index) => [
          column,
          normalizeCell(row[index])
        ])
      )
    );

  return {
    name: sheetName,
    columns,
    rows
  };
}

export class ExcelDocumentParser implements DocumentParser {
  constructor(private readonly loader: ExcelDocumentLoader) {}

  supports(businessDocument: BusinessDocument): boolean {
    return (
      businessDocument.format === 'xlsx' ||
      businessDocument.format === 'xls'
    );
  }

  async parse(
    businessDocument: BusinessDocument
  ): Promise<ParsedDocument> {
    const buffer = await this.loader.load(businessDocument);
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true
    });

    const tables = workbook.SheetNames.map((sheetName) =>
      worksheetToTable(workbook, sheetName)
    );

    const warnings: string[] = [];

    if (tables.length === 0) {
      warnings.push('Excel dosyasında çalışma sayfası bulunamadı.');
    }

    const plainText = tables
      .flatMap((table) =>
        table.rows.map((row) =>
          Object.values(row)
            .filter((value) => value !== null)
            .join(' ')
        )
      )
      .join('\n')
      .slice(0, 20_000);

    return {
      documentId: businessDocument.id,
      title: businessDocument.fileName,
      plainText,
      tables,
      warnings,
      parsedAt: new Date().toISOString()
    };
  }
}
