/**
 * İSTEBUL Business Import Engine — ExcelImportReader (PR-101F).
 *
 * IImportReader: yapısal Excel workbook → ham tabular.
 * BusinessDataset / Semantic / AI yoktur.
 *
 * Gerçek .xlsx binary decode: projede onaylı Excel kütüphanesi olmadığı
 * için desteklenmez (`EXCEL_BINARY_NOT_SUPPORTED`).
 */

import type { IImportReader } from '../../ports/IImportReader';
import type { ImportContext } from '../../types/ImportContext';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../pipeline/runtime/timing';
import type { ExcelReaderContext } from './ExcelReaderContext';
import { createExcelReaderContext } from './ExcelReaderContext';
import type {
  ExcelReaderResult,
  ExcelReaderTelemetry
} from './ExcelReaderResult';
import {
  EXCEL_BINARY_NOT_SUPPORTED,
} from './ExcelReaderResult';
import type { ExcelRawWorkbook } from './ExcelWorkbook';
import {
  parseExcelRawWorkbook,
  selectExcelSheet
} from './parseExcel';

export const EXCEL_READER_ID = 'excel-import-reader' as const;

/**
 * CSV ile hizalı tabular projeksiyon.
 */
export function excelResultToTabular(result: ExcelReaderResult): {
  headers: string[];
  records: string[][];
  columns: string[];
  rows: Record<string, string>[];
} {
  const headers = result.sheet.headers.map((h) => h.name);
  const records = result.sheet.rows.map((row) =>
    headers.map((_, i) => {
      const cell = row.cells[i];
      if (!cell || cell.value === null || cell.value === undefined) {
        return '';
      }
      return String(cell.value);
    })
  );
  const rows = result.sheet.rows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i += 1) {
      const cell = row.cells[i];
      obj[headers[i]!] =
        cell && cell.value !== null && cell.value !== undefined
          ? String(cell.value)
          : '';
    }
    return obj;
  });
  return { headers, records, columns: [...headers], rows };
}

function assertNoBinary(binary: ExcelReaderContext['binary']): void {
  if (binary === undefined || binary === null) {
    return;
  }
  const size =
    binary instanceof ArrayBuffer
      ? binary.byteLength
      : binary.byteLength;
  if (size > 0) {
    throw Object.assign(
      new Error(
        'Excel binary (.xlsx) decode desteklenmiyor: projede onaylı Excel kütüphanesi yok (PR-101F altyapı). Yapısal workbook girdisi kullanın.'
      ),
      { code: EXCEL_BINARY_NOT_SUPPORTED }
    );
  }
}

/**
 * Yapısal workbook içeriğini ExcelReaderResult’a çevirir.
 */
export function parseExcelWorkbook(
  input: ExcelReaderContext
): ExcelReaderResult {
  const ctx = createExcelReaderContext(input);
  const timer = startStageTimer();
  const startMark = nowMs();

  assertNoBinary(ctx.binary);

  if (!ctx.workbook || !Array.isArray(ctx.workbook.sheets)) {
    throw Object.assign(
      new Error(
        'Excel workbook girdisi gerekli (yapısal). Binary .xlsx bu PR’da okunmaz.'
      ),
      { code: 'EXCEL_WORKBOOK_MISSING' as const }
    );
  }

  const hasHeader = ctx.hasHeader !== false;
  const skipEmptyRows = ctx.skipEmptyRows !== false;
  const { workbook, skippedEmptyRows } = parseExcelRawWorkbook(ctx.workbook, {
    hasHeader,
    skipEmptyRows,
    maxRows: ctx.maxRows
  });

  const sheet = selectExcelSheet(workbook, ctx.sheetName, ctx.sheetIndex);
  const { endedAt, durationMs } = endStageTimer(timer);

  const telemetry: ExcelReaderTelemetry = {
    sheetCount: workbook.sheets.length,
    rowCount: sheet.rows.length,
    columnCount: sheet.columnKeys.length,
    durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
    startedAt: timer.startedAt,
    endedAt,
    selectedSheetName: sheet.name,
    selectedSheetIndex: sheet.index,
    headerPresent: hasHeader,
    skippedEmptyRows,
    binaryDecoded: false
  };

  return {
    workbook,
    sheet,
    columnKeys: sheet.columnKeys,
    telemetry
  };
}

/**
 * ImportContext metadata / payloadRef üzerinden yapısal workbook çözer.
 */
export function resolveExcelWorkbookPayload(
  context: ImportContext,
  payloadRef?: string
): ExcelRawWorkbook {
  const metaWb = context.metadata?.excelWorkbook;
  if (metaWb) {
    try {
      const parsed =
        typeof metaWb === 'string' ? (JSON.parse(metaWb) as unknown) : metaWb;
      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as ExcelRawWorkbook).sheets)
      ) {
        return parsed as ExcelRawWorkbook;
      }
    } catch {
      // fall through
    }
  }

  if (typeof payloadRef === 'string' && payloadRef.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(payloadRef) as ExcelRawWorkbook;
      if (parsed && Array.isArray(parsed.sheets)) {
        return parsed;
      }
    } catch {
      // fall through
    }
  }

  if (
    typeof payloadRef === 'string' &&
    (payloadRef.endsWith('.xlsx') ||
      payloadRef.endsWith('.xls') ||
      payloadRef.includes('/'))
  ) {
    throw Object.assign(
      new Error(
        'Excel dosya yolu / binary okuma desteklenmiyor (onaylı kütüphane yok). Yapısal workbook JSON kullanın.'
      ),
      { code: EXCEL_BINARY_NOT_SUPPORTED }
    );
  }

  throw Object.assign(
    new Error(
      'Excel içeriği bulunamadı: metadata.excelWorkbook veya yapısal JSON payloadRef gerekli.'
    ),
    { code: 'EXCEL_CONTENT_MISSING' as const }
  );
}

export interface ExcelImportReaderOptions {
  defaultHasHeader?: boolean;
  maxRows?: number;
  defaultSheetIndex?: number;
  defaultSheetName?: string;
}

/**
 * Excel IImportReader — altyapı (yapısal workbook).
 */
export class ExcelImportReader implements IImportReader {
  readonly adapterType = 'excel' as const;
  readonly readerId = EXCEL_READER_ID;
  private readonly options: ExcelImportReaderOptions;

  constructor(options: ExcelImportReaderOptions = {}) {
    this.options = options;
  }

  canRead(context: ImportContext): boolean {
    return context.source.type === 'excel';
  }

  /**
   * Yapısal workbook okur → ExcelReaderResult.
   * Binary .xlsx → EXCEL_BINARY_NOT_SUPPORTED.
   */
  async read(
    context: ImportContext,
    payloadRef?: string
  ): Promise<ExcelReaderResult> {
    const workbook = resolveExcelWorkbookPayload(context, payloadRef);
    return this.parse(
      createExcelReaderContext({
        workbook,
        hasHeader: this.options.defaultHasHeader ?? true,
        skipEmptyRows: true,
        locale: context.locale,
        sourceLabel: context.source.label,
        maxRows: this.options.maxRows,
        sheetIndex: this.options.defaultSheetIndex,
        sheetName: this.options.defaultSheetName,
        tenantId: context.metadata?.tenantId
      })
    );
  }

  parse(excelContext: ExcelReaderContext): ExcelReaderResult {
    return parseExcelWorkbook(excelContext);
  }
}

export function createExcelImportReader(
  options?: ExcelImportReaderOptions
): ExcelImportReader {
  return new ExcelImportReader(options);
}

export default ExcelImportReader;
