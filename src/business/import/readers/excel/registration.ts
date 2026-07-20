/**
 * Excel → ReaderRegistryRuntime kayıt yardımcısı (PR-101F).
 *
 * PR-101A–101E dosyalarını değiştirmez.
 */

import type { ReaderRegistration } from '../runtime/ReaderRegistration';
import type { ReaderRegistryRuntime } from '../runtime/ReaderRegistryRuntime';
import {
  EXCEL_READER_ID,
  createExcelImportReader,
  type ExcelImportReaderOptions
} from './ExcelImportReader';

/**
 * Excel reader descriptor + createReader fabrikası.
 *
 * .xlsx uzantısı kayıtlıdır; binary decode altyapı seviyesinde
 * (onaylı kütüphane yok) desteklenmez — yapısal workbook kullanılır.
 */
export function createExcelReaderRegistration(
  options?: ExcelImportReaderOptions
): ReaderRegistration {
  return {
    descriptor: {
      id: EXCEL_READER_ID,
      name: 'Excel Import Reader',
      description:
        'Excel (.xlsx) reader altyapısı — yapısal workbook; binary decode için onaylı kütüphane gerekir. BusinessDataset üretmez.',
      sourceTypes: ['excel'],
      mimeTypes: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ],
      extensions: ['.xlsx', '.xls'],
      priority: 100,
      version: '1.0.0'
    },
    createReader: () => createExcelImportReader(options)
  };
}

export function registerExcelImportReader(
  registry: ReaderRegistryRuntime,
  options?: ExcelImportReaderOptions
): void {
  registry.register(createExcelReaderRegistration(options));
}

export { EXCEL_READER_ID };
