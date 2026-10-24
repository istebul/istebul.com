import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

register(
  pathToFileURL(
    path.join(__dirname, '../helpers/business-ts-resolve.mjs')
  ).href
);

const XLSX = await import('xlsx');

const { ExcelDocumentParser } = await import(
  '../../src/business/document-intelligence/parsers/ExcelDocumentParser.ts'
);

const document = {
  id: 'doc-excel-test',
  businessId: 'business-excel-test',
  projectId: '',
  fileName: 'ornek.xlsx',
  format: 'xlsx',
  mimeType:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  sizeBytes: 0,
  storagePath: 'test/ornek.xlsx',
  status: 'uploaded',
  uploadedAt: '2026-10-20T00:00:00.000Z'
};

function createWorkbookArrayBuffer() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Ürün', 'Adet'],
    ['Elma', 3],
    ['Armut', 5]
  ]);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Satışlar');

  const output = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });

  const bytes =
    output instanceof ArrayBuffer
      ? new Uint8Array(output)
      : output;

  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );
}

describe('ExcelDocumentParser', () => {
  it('Excel biçimlerini doğru tanır', () => {
    const parser = new ExcelDocumentParser({
      load: async () => createWorkbookArrayBuffer()
    });

    assert.equal(parser.supports(document), true);
    assert.equal(
      parser.supports({ ...document, format: 'csv' }),
      false
    );
  });

  it('gerçek XLSX içeriğinden sütunları, satırları ve metni ayrıştırır', async () => {
    const buffer = createWorkbookArrayBuffer();

    const parser = new ExcelDocumentParser({
      load: async (loadedDocument) => {
        assert.equal(loadedDocument.id, document.id);
        return buffer;
      }
    });

    const result = await parser.parse(document);

    assert.equal(result.documentId, document.id);
    assert.equal(result.title, 'ornek.xlsx');
    assert.equal(result.tables.length, 1);

    assert.equal(result.tables[0].name, 'Satışlar');
    assert.deepEqual(result.tables[0].columns, ['Ürün', 'Adet']);

    assert.deepEqual(result.tables[0].rows, [
      { Ürün: 'Elma', Adet: '3' },
      { Ürün: 'Armut', Adet: '5' }
    ]);

    assert.equal(result.plainText, 'Elma 3\nArmut 5');
    assert.deepEqual(result.warnings, []);
    assert.ok(Number.isFinite(Date.parse(result.parsedAt)));
  });
});
