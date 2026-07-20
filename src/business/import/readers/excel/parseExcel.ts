/**
 * Yapısal Excel workbook → sheet/tabular (PR-101F).
 *
 * Gerçek .xlsx binary decode yoktur — onaylı Excel kütüphanesi yok.
 */

import type { ExcelCell, ExcelCellType } from './ExcelCell';
import type {
  ExcelHeader,
  ExcelRow,
  ExcelSheet
} from './ExcelSheet';
import type {
  ExcelRawCellValue,
  ExcelRawSheet,
  ExcelRawWorkbook,
  ExcelWorkbook
} from './ExcelWorkbook';

function isPlainCellObject(
  value: ExcelRawCellValue
): value is {
  value: string | number | boolean | null;
  cellType?: ExcelCellType;
  dateIso?: string;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Date) &&
    'value' in value
  );
}

/**
 * Ham hücreden tip + değer çıkarır.
 */
export function normalizeExcelCell(
  raw: ExcelRawCellValue,
  columnIndex: number,
  headerName?: string
): ExcelCell {
  if (raw === null || raw === undefined || raw === '') {
    return {
      columnIndex,
      headerName,
      cellType: 'empty',
      raw: '',
      value: null
    };
  }

  if (isPlainCellObject(raw)) {
    const cellType =
      raw.cellType ??
      inferCellType(raw.value, raw.dateIso !== undefined);
    return {
      columnIndex,
      headerName,
      cellType,
      raw: stringifyCell(raw.value, raw.dateIso),
      value: raw.value,
      dateIso: raw.dateIso
    };
  }

  if (raw instanceof Date) {
    const dateIso = raw.toISOString();
    return {
      columnIndex,
      headerName,
      cellType: 'date',
      raw: dateIso,
      value: dateIso,
      dateIso
    };
  }

  if (typeof raw === 'boolean') {
    return {
      columnIndex,
      headerName,
      cellType: 'boolean',
      raw: raw ? 'true' : 'false',
      value: raw
    };
  }

  if (typeof raw === 'number') {
    return {
      columnIndex,
      headerName,
      cellType: 'number',
      raw: String(raw),
      value: raw
    };
  }

  return {
    columnIndex,
    headerName,
    cellType: 'string',
    raw: String(raw),
    value: String(raw)
  };
}

function inferCellType(
  value: string | number | boolean | null,
  hasDateIso: boolean
): ExcelCellType {
  if (hasDateIso) {
    return 'date';
  }
  if (value === null || value === '') {
    return 'empty';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  return 'string';
}

function stringifyCell(
  value: string | number | boolean | null,
  dateIso?: string
): string {
  if (dateIso) {
    return dateIso;
  }
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function rowIsEmpty(cells: readonly ExcelRawCellValue[]): boolean {
  return cells.every((c) => {
    if (c === null || c === undefined || c === '') {
      return true;
    }
    if (isPlainCellObject(c)) {
      return c.value === null || c.value === '' || c.value === undefined;
    }
    return false;
  });
}

function resolveHeaderName(
  raw: string,
  index: number,
  hasHeader: boolean
): string {
  const trimmed = raw.trim();
  if (!hasHeader || trimmed === '') {
    return `col_${index}`;
  }
  return trimmed;
}

export interface ParseSheetOptions {
  hasHeader: boolean;
  skipEmptyRows: boolean;
  maxRows?: number;
  sheetIndex: number;
}

/**
 * Ham sheet → ExcelSheet.
 */
export function parseExcelRawSheet(
  raw: ExcelRawSheet,
  options: ParseSheetOptions
): { sheet: ExcelSheet; skippedEmptyRows: number } {
  const sourceRows = raw.rows ?? [];
  let skippedEmptyRows = 0;
  const filtered: { cells: readonly ExcelRawCellValue[]; sourceRow: number }[] =
    [];

  for (let i = 0; i < sourceRows.length; i += 1) {
    const cells = sourceRows[i] ?? [];
    if (options.skipEmptyRows && rowIsEmpty(cells)) {
      skippedEmptyRows += 1;
      continue;
    }
    filtered.push({ cells, sourceRow: i + 1 });
  }

  if (filtered.length === 0) {
    return {
      sheet: {
        name: raw.name,
        index: options.sheetIndex,
        headers: Object.freeze([]),
        rows: Object.freeze([]),
        columnKeys: Object.freeze([]),
        isEmpty: true
      },
      skippedEmptyRows
    };
  }

  let headers: ExcelHeader[] = [];
  let dataStart = 0;

  if (options.hasHeader) {
    const headerCells = filtered[0]!.cells;
    headers = headerCells.map((cell, index) => {
      const normalized = normalizeExcelCell(cell, index);
      const name = resolveHeaderName(normalized.raw, index, true);
      return { index, name, raw: normalized.raw };
    });
    // Genişlik: sonraki satırlardan max
    for (const row of filtered.slice(1)) {
      while (headers.length < row.cells.length) {
        const idx = headers.length;
        headers.push({
          index: idx,
          name: `col_${idx}`,
          raw: `col_${idx}`
        });
      }
    }
    dataStart = 1;
  } else {
    const width = Math.max(...filtered.map((r) => r.cells.length), 0);
    headers = Array.from({ length: width }, (_, index) => ({
      index,
      name: `col_${index}`,
      raw: `col_${index}`
    }));
    dataStart = 0;
  }

  const rows: ExcelRow[] = [];
  for (let i = dataStart; i < filtered.length; i += 1) {
    if (options.maxRows !== undefined && rows.length >= options.maxRows) {
      break;
    }
    const entry = filtered[i]!;
    const cells: ExcelCell[] = [];
    const width = Math.max(headers.length, entry.cells.length);
    for (let c = 0; c < width; c += 1) {
      if (c >= headers.length) {
        headers.push({
          index: c,
          name: `col_${c}`,
          raw: `col_${c}`
        });
      }
      cells.push(
        normalizeExcelCell(
          entry.cells[c],
          c,
          headers[c]?.name
        )
      );
    }
    rows.push({
      index: rows.length,
      sourceRow: entry.sourceRow,
      cells: Object.freeze(cells)
    });
  }

  const sheet: ExcelSheet = {
    name: raw.name,
    index: options.sheetIndex,
    headers: Object.freeze([...headers]),
    rows: Object.freeze(rows),
    columnKeys: Object.freeze(headers.map((h) => h.name)),
    isEmpty: rows.length === 0 && headers.length === 0
  };

  return { sheet, skippedEmptyRows };
}

/**
 * Ham workbook → ExcelWorkbook + sheet’ler.
 */
export function parseExcelRawWorkbook(
  raw: ExcelRawWorkbook,
  options: Omit<ParseSheetOptions, 'sheetIndex'>
): { workbook: ExcelWorkbook; skippedEmptyRows: number } {
  const sheets: ExcelSheet[] = [];
  let skippedEmptyRows = 0;
  const list = raw.sheets ?? [];
  for (let i = 0; i < list.length; i += 1) {
    const parsed = parseExcelRawSheet(list[i]!, {
      ...options,
      sheetIndex: i
    });
    sheets.push(parsed.sheet);
    skippedEmptyRows += parsed.skippedEmptyRows;
  }
  return {
    workbook: {
      label: raw.label,
      sheets: Object.freeze(sheets)
    },
    skippedEmptyRows
  };
}

/**
 * Sheet seçimi — ad veya index; yoksa ilk sheet.
 */
export function selectExcelSheet(
  workbook: ExcelWorkbook,
  sheetName?: string,
  sheetIndex?: number
): ExcelSheet {
  if (sheetName !== undefined) {
    const found = workbook.sheets.find((s) => s.name === sheetName);
    if (!found) {
      throw Object.assign(
        new Error(`Excel sheet bulunamadı: ${sheetName}`),
        { code: 'EXCEL_SHEET_NOT_FOUND' as const }
      );
    }
    return found;
  }
  if (sheetIndex !== undefined) {
    const found = workbook.sheets[sheetIndex];
    if (!found) {
      throw Object.assign(
        new Error(`Excel sheet index geçersiz: ${sheetIndex}`),
        { code: 'EXCEL_SHEET_NOT_FOUND' as const }
      );
    }
    return found;
  }
  const first = workbook.sheets[0];
  if (!first) {
    return {
      name: '',
      index: 0,
      headers: Object.freeze([]),
      rows: Object.freeze([]),
      columnKeys: Object.freeze([]),
      isEmpty: true
    };
  }
  return first;
}
