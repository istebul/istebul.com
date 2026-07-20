/**
 * İSTEBUL Business Import Engine — CsvImportReader (PR-101E).
 *
 * IImportReader uygulaması: yalnızca ham CSV satır/kolon üretir.
 * BusinessDataset / Excel / AI yoktur.
 */

import type { IImportReader } from '../../ports/IImportReader';
import type { ImportContext } from '../../types/ImportContext';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../pipeline/runtime/timing';
import type { CsvCell } from './CsvCell';
import type { CsvHeader } from './CsvHeader';
import type { CsvDelimiter, CsvReaderContext } from './CsvReaderContext';
import { createCsvReaderContext } from './CsvReaderContext';
import type { CsvReaderResult, CsvReaderTelemetry } from './CsvReaderResult';
import type { CsvRow } from './CsvRow';
import {
  detectDelimiter,
  splitCsvLine,
  splitPhysicalRecords,
  stripBom,
  utf8ByteLength
} from './parseCsv';

export const CSV_READER_ID = 'csv-import-reader' as const;

function resolveHeaderName(raw: string, index: number, hasHeader: boolean): string {
  const trimmed = raw.trim();
  if (!hasHeader || trimmed === '') {
    return `col_${index}`;
  }
  return trimmed;
}

function buildCells(
  fields: readonly string[],
  headers: readonly CsvHeader[]
): CsvCell[] {
  const count = Math.max(fields.length, headers.length);
  const cells: CsvCell[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = fields[i] ?? '';
    cells.push({
      columnIndex: i,
      headerName: headers[i]?.name,
      raw,
      value: raw
    });
  }
  return cells;
}

/**
 * CSV içeriğini yapısal sonuca çevirir (senkron).
 */
export function parseCsvContent(input: CsvReaderContext): CsvReaderResult {
  const ctx = createCsvReaderContext(input);
  const timer = startStageTimer();
  const startMark = nowMs();

  const content = stripBom(ctx.content ?? '');
  const fileSizeBytes = utf8ByteLength(content);
  const delimiter: CsvDelimiter =
    ctx.delimiter === 'auto' || ctx.delimiter === undefined
      ? detectDelimiter(content)
      : ctx.delimiter;
  const hasHeader = ctx.hasHeader !== false;
  const skipEmpty = ctx.skipEmptyRows !== false;

  const physical = splitPhysicalRecords(content);
  let skippedEmptyRows = 0;
  let malformedRowCount = 0;

  const meaningful: { line: string; sourceLine: number }[] = [];
  for (let i = 0; i < physical.length; i += 1) {
    const line = physical[i]!;
    if (line.trim() === '') {
      if (skipEmpty) {
        skippedEmptyRows += 1;
        continue;
      }
    }
    meaningful.push({ line, sourceLine: i + 1 });
  }

  let headers: CsvHeader[] = [];
  let dataStart = 0;

  if (meaningful.length === 0) {
    const { endedAt, durationMs } = endStageTimer(timer);
    return {
      headers: Object.freeze([]),
      rows: Object.freeze([]),
      columnKeys: Object.freeze([]),
      telemetry: {
        fileSizeBytes,
        rowCount: 0,
        columnCount: 0,
        durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
        startedAt: timer.startedAt,
        endedAt,
        delimiter,
        headerPresent: hasHeader,
        skippedEmptyRows,
        malformedRowCount: 0
      }
    };
  }

  if (hasHeader) {
    const headerFields = splitCsvLine(meaningful[0]!.line, delimiter);
    headers = headerFields.map((raw, index) => ({
      index,
      name: resolveHeaderName(raw, index, true),
      raw
    }));
    dataStart = 1;
  } else {
    const firstFields = splitCsvLine(meaningful[0]!.line, delimiter);
    headers = firstFields.map((_, index) => ({
      index,
      name: `col_${index}`,
      raw: `col_${index}`
    }));
    dataStart = 0;
  }

  const columnCount = headers.length;
  const maxRows = ctx.maxRows;
  const rows: CsvRow[] = [];

  for (let i = dataStart; i < meaningful.length; i += 1) {
    if (maxRows !== undefined && rows.length >= maxRows) {
      break;
    }
    const entry = meaningful[i]!;
    const fields = splitCsvLine(entry.line, delimiter);
    let malformed = fields.length !== columnCount;
    if (!hasHeader && fields.length > headers.length) {
      for (let c = headers.length; c < fields.length; c += 1) {
        headers.push({
          index: c,
          name: `col_${c}`,
          raw: `col_${c}`
        });
      }
      malformed = false;
    }
    if (malformed) {
      malformedRowCount += 1;
    }
    rows.push({
      index: rows.length,
      sourceLine: entry.sourceLine,
      cells: Object.freeze(buildCells(fields, headers)),
      raw: entry.line,
      malformed: malformed || undefined
    });
  }

  const { endedAt, durationMs } = endStageTimer(timer);
  const telemetry: CsvReaderTelemetry = {
    fileSizeBytes,
    rowCount: rows.length,
    columnCount: headers.length,
    durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
    startedAt: timer.startedAt,
    endedAt,
    delimiter,
    headerPresent: hasHeader,
    skippedEmptyRows,
    malformedRowCount
  };

  return {
    headers: Object.freeze([...headers]),
    rows: Object.freeze(rows),
    columnKeys: Object.freeze(headers.map((h) => h.name)),
    telemetry
  };
}

/**
 * CsvReaderResult → Schema Detection / Validation için ham tablo.
 */
export function csvResultToTabular(result: CsvReaderResult): {
  headers: string[];
  records: string[][];
  columns: string[];
  rows: Record<string, string>[];
} {
  const headers = result.headers.map((h) => h.name);
  const records = result.rows.map((row) =>
    headers.map((_, i) => row.cells[i]?.value ?? '')
  );
  const rows = result.rows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i += 1) {
      obj[headers[i]!] = row.cells[i]?.value ?? '';
    }
    return obj;
  });
  return { headers, records, columns: [...headers], rows };
}

/**
 * ImportContext / payloadRef üzerinden UTF-8 içerik çözer.
 * Dosya yolu best-effort (Node fs); aksi halde inline metin.
 */
export async function resolveCsvPayload(
  context: ImportContext,
  payloadRef?: string,
  explicitContent?: string
): Promise<string> {
  if (typeof explicitContent === 'string') {
    return explicitContent;
  }
  const fromMeta = context.metadata?.csvContent ?? context.metadata?.content;
  if (typeof fromMeta === 'string') {
    return fromMeta;
  }
  if (typeof payloadRef === 'string' && payloadRef.length > 0) {
    const looksLikePath =
      !payloadRef.includes('\n') &&
      (payloadRef.endsWith('.csv') ||
        payloadRef.includes('/') ||
        payloadRef.includes('\\'));
    if (looksLikePath) {
      try {
        const fs = await import('node:fs/promises');
        return await fs.readFile(payloadRef, 'utf8');
      } catch {
        // Dosya yoksa veya fs yoksa inline kabul et
      }
    }
    return payloadRef;
  }
  throw Object.assign(
    new Error('CSV içeriği bulunamadı: content veya payloadRef gerekli.'),
    { code: 'CSV_CONTENT_MISSING' as const }
  );
}

export interface CsvImportReaderOptions {
  /** Varsayılan ayırıcı politikası */
  defaultDelimiter?: CsvDelimiter | 'auto';
  /** Varsayılan başlık */
  defaultHasHeader?: boolean;
  /** Üst satır sınırı */
  maxRows?: number;
}

/**
 * Gerçek CSV IImportReader.
 */
export class CsvImportReader implements IImportReader {
  readonly adapterType = 'csv' as const;
  readonly readerId = CSV_READER_ID;
  private readonly options: CsvImportReaderOptions;

  constructor(options: CsvImportReaderOptions = {}) {
    this.options = options;
  }

  canRead(context: ImportContext): boolean {
    return context.source.type === 'csv';
  }

  /**
   * Ham CSV okur → CsvReaderResult (BusinessDataset değil).
   */
  async read(
    context: ImportContext,
    payloadRef?: string
  ): Promise<CsvReaderResult> {
    const content = await resolveCsvPayload(context, payloadRef);
    return this.parse(
      createCsvReaderContext({
        content,
        delimiter: this.options.defaultDelimiter ?? 'auto',
        hasHeader: this.options.defaultHasHeader ?? true,
        skipEmptyRows: true,
        locale: context.locale,
        sourceLabel: context.source.label,
        maxRows: this.options.maxRows,
        tenantId: context.metadata?.tenantId
      })
    );
  }

  /**
   * Doğrudan bağlam ile senkron parse.
   */
  parse(csvContext: CsvReaderContext): CsvReaderResult {
    return parseCsvContent(csvContext);
  }
}

export function createCsvImportReader(
  options?: CsvImportReaderOptions
): CsvImportReader {
  return new CsvImportReader(options);
}

export default CsvImportReader;
