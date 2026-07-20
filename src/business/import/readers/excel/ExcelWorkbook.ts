/**
 * İSTEBUL Business Import Engine — ExcelWorkbook (PR-101F).
 *
 * Yapısal workbook modeli. Gerçek .xlsx binary decode bu PR’da yoktur
 * (projede onaylı Excel kütüphanesi yok).
 */

import type { ExcelCellType } from './ExcelCell';
import type { ExcelSheet } from './ExcelSheet';

/**
 * Ham hücre girdisi — test ve altyapı için.
 */
export type ExcelRawCellValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | {
      value: string | number | boolean | null;
      cellType?: ExcelCellType;
      dateIso?: string;
    };

/**
 * Ham sheet tanımı (yapısal girdi).
 */
export interface ExcelRawSheet {
  name: string;
  /** Satırlar — her satır hücre dizisi */
  rows: readonly (readonly ExcelRawCellValue[])[];
}

/**
 * Yapısal workbook — binary değil.
 */
export interface ExcelWorkbook {
  /** Kaynak etiketi */
  label?: string;
  /** Sheet’ler */
  sheets: readonly ExcelSheet[];
}

/**
 * Ham workbook girdisi (parse öncesi).
 */
export interface ExcelRawWorkbook {
  label?: string;
  sheets: readonly ExcelRawSheet[];
}
