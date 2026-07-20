/**
 * CSV → ReaderRegistryRuntime kayıt yardımcısı (PR-101E).
 *
 * PR-101B dosyalarını değiştirmez; register() API’sini kullanır.
 */

import type { ReaderRegistration } from '../runtime/ReaderRegistration';
import type { ReaderRegistryRuntime } from '../runtime/ReaderRegistryRuntime';
import {
  CSV_READER_ID,
  CsvImportReader,
  createCsvImportReader,
  type CsvImportReaderOptions
} from './CsvImportReader';

/**
 * CSV reader descriptor + createReader fabrikası.
 */
export function createCsvReaderRegistration(
  options?: CsvImportReaderOptions
): ReaderRegistration {
  return {
    descriptor: {
      id: CSV_READER_ID,
      name: 'CSV Import Reader',
      description:
        'UTF-8 CSV okuyucu — ham satır/kolon; BusinessDataset üretmez.',
      sourceTypes: ['csv'],
      mimeTypes: ['text/csv', 'application/csv', 'text/plain'],
      extensions: ['.csv'],
      priority: 100,
      version: '1.0.0'
    },
    createReader: () => createCsvImportReader(options)
  };
}

/**
 * Registry’ye CSV reader kaydeder.
 */
export function registerCsvImportReader(
  registry: ReaderRegistryRuntime,
  options?: CsvImportReaderOptions
): void {
  registry.register(createCsvReaderRegistration(options));
}

export { CSV_READER_ID, CsvImportReader, createCsvImportReader };
