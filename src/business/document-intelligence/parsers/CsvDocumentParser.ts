import type { BusinessDocument } from '../models/BusinessDocument';
import type {
  ParsedDocument,
  ParsedDocumentTable
} from '../models/ParsedDocument';
import type { DocumentParser } from './DocumentParser';

export interface CsvDocumentLoader {
  load(document: BusinessDocument): Promise<ArrayBuffer>;
}

const PREVIEW_ROW_LIMIT = 20;

function decodeCsv(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8', {
    fatal: false
  }).decode(buffer);
}

function detectDelimiter(text: string): string {
  const firstMeaningfulLine =
    text
      .split(/\r?\n/)
      .find((line) => line.trim().length > 0) ?? '';

  const candidates = [',', ';', '\t', '|'];

  return candidates
    .map((delimiter) => ({
      delimiter,
      count: firstMeaningfulLine.split(delimiter).length - 1
    }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter ?? ',';
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());

  return values;
}

function normalizeColumns(rawColumns: string[]): string[] {
  const used = new Map<string, number>();

  return rawColumns.map((column, index) => {
    const fallback = `kolon_${index + 1}`;
    const baseName = column.trim() || fallback;
    const occurrence = used.get(baseName) ?? 0;

    used.set(baseName, occurrence + 1);

    return occurrence === 0
      ? baseName
      : `${baseName}_${occurrence + 1}`;
  });
}

function buildTable(text: string): ParsedDocumentTable {
  const meaningfulLines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (meaningfulLines.length === 0) {
    return {
      name: 'CSV',
      columns: [],
      rows: []
    };
  }

  const delimiter = detectDelimiter(text);
  const columns = normalizeColumns(
    parseCsvLine(meaningfulLines[0], delimiter)
  );

  const rows = meaningfulLines
    .slice(1, PREVIEW_ROW_LIMIT + 1)
    .map((line) => {
      const values = parseCsvLine(line, delimiter);

      return Object.fromEntries(
        columns.map((column, index) => [
          column,
          values[index]?.trim() || null
        ])
      );
    });

  return {
    name: 'CSV',
    columns,
    rows
  };
}

export class CsvDocumentParser implements DocumentParser {
  private readonly loader: CsvDocumentLoader;

  constructor(loader: CsvDocumentLoader) {
    this.loader = loader;
  }

  supports(businessDocument: BusinessDocument): boolean {
    return businessDocument.format === 'csv';
  }

  async parse(
    businessDocument: BusinessDocument
  ): Promise<ParsedDocument> {
    const buffer = await this.loader.load(businessDocument);
    const text = decodeCsv(buffer);
    const table = buildTable(text);
    const warnings: string[] = [];

    if (table.columns.length === 0) {
      warnings.push('CSV dosyasında başlık veya veri bulunamadı.');
    }

    return {
      documentId: businessDocument.id,
      title: businessDocument.fileName,
      plainText: text.slice(0, 20_000),
      tables: [table],
      warnings,
      parsedAt: new Date().toISOString()
    };
  }
}
