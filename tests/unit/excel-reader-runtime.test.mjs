/**
 * Excel Reader Runtime — PR-101F (en az 30 unit test)
 *
 * Not: Projede onaylı Excel kütüphanesi yok; yapısal workbook altyapısı test edilir.
 * Binary .xlsx decode desteklenmez.
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(
  pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href
);

const {
  createExcelImportReader,
  parseExcelWorkbook,
  createExcelReaderContext,
  excelResultToTabular,
  normalizeExcelCell,
  selectExcelSheet,
  EXCEL_READER_ID,
  EXCEL_BINARY_NOT_SUPPORTED,
  createExcelReaderRegistration,
  registerExcelImportReader,
  attachExcelResultToPipelineContext,
  readExcelResultFromPipelineContext,
  PIPELINE_BAG_EXCEL_RESULT_KEY,
  resolveExcelWorkbookPayload
} = await import('../../src/business/import/readers/excel/index.ts');

const {
  createReaderRegistryRuntime,
  createReaderFactory
} = await import('../../src/business/import/readers/runtime/index.ts');

const {
  createSchemaDetectionRuntime,
  createSchemaContext
} = await import('../../src/business/import/detectors/runtime/index.ts');

const {
  createValidationRuntime,
  createValidationContext
} = await import('../../src/business/import/validators/runtime/index.ts');

function importContext(overrides = {}) {
  return {
    importId: 'imp-xlsx-1',
    source: { type: 'excel', label: 'ornek.xlsx' },
    locale: 'tr',
    currentStage: 'okuma',
    status: 'bekliyor',
    ...overrides
  };
}

function singleSheetWorkbook() {
  return {
    label: 'ornek.xlsx',
    sheets: [
      {
        name: 'Satis',
        rows: [
          ['urun', 'adet', 'aktif', 'tarih'],
          ['Elma', 3, true, new Date('2024-01-15T00:00:00.000Z')],
          ['Armut', 5, false, { value: '2024-02-01', cellType: 'date', dateIso: '2024-02-01T00:00:00.000Z' }]
        ]
      }
    ]
  };
}

function multiSheetWorkbook() {
  return {
    sheets: [
      {
        name: 'Urunler',
        rows: [
          ['sku', 'ad'],
          ['A1', 'Elma']
        ]
      },
      {
        name: 'Stok',
        rows: [
          ['sku', 'miktar'],
          ['A1', 10],
          ['A2', 4]
        ]
      },
      {
        name: 'Bos',
        rows: []
      }
    ]
  };
}

describe('ExcelImportReader', () => {
  /** @type {ReturnType<typeof createExcelImportReader>} */
  let reader;

  beforeEach(() => {
    reader = createExcelImportReader();
  });

  it('tek sheet okur ve kolonları üretir', () => {
    const result = reader.parse(
      createExcelReaderContext({ workbook: singleSheetWorkbook() })
    );
    assert.equal(result.workbook.sheets.length, 1);
    assert.deepEqual(result.columnKeys, ['urun', 'adet', 'aktif', 'tarih']);
    assert.equal(result.sheet.rows.length, 2);
    assert.equal(result.telemetry.sheetCount, 1);
  });

  it('çoklu sheet workbook üretir', () => {
    const result = parseExcelWorkbook({
      workbook: multiSheetWorkbook()
    });
    assert.equal(result.telemetry.sheetCount, 3);
    assert.equal(result.workbook.sheets[1].name, 'Stok');
  });

  it('sheetName ile sheet seçer', () => {
    const result = parseExcelWorkbook({
      workbook: multiSheetWorkbook(),
      sheetName: 'Stok'
    });
    assert.equal(result.sheet.name, 'Stok');
    assert.equal(result.telemetry.selectedSheetName, 'Stok');
    assert.equal(result.sheet.rows.length, 2);
  });

  it('sheetIndex ile sheet seçer', () => {
    const result = parseExcelWorkbook({
      workbook: multiSheetWorkbook(),
      sheetIndex: 1
    });
    assert.equal(result.sheet.index, 1);
    assert.equal(result.columnKeys[1], 'miktar');
  });

  it('olmayan sheetName hata fırlatır', () => {
    assert.throws(
      () =>
        parseExcelWorkbook({
          workbook: multiSheetWorkbook(),
          sheetName: 'Yok'
        }),
      (err) => {
        assert.equal(err.code, 'EXCEL_SHEET_NOT_FOUND');
        return true;
      }
    );
  });

  it('header desteği: hasHeader=true', () => {
    const result = parseExcelWorkbook({
      workbook: singleSheetWorkbook(),
      hasHeader: true
    });
    assert.equal(result.telemetry.headerPresent, true);
    assert.equal(result.sheet.headers[0].name, 'urun');
  });

  it('başlıksız sheet sentetik kolon üretir', () => {
    const result = parseExcelWorkbook({
      workbook: {
        sheets: [{ name: 'Ham', rows: [['a', 1], ['b', 2]] }]
      },
      hasHeader: false
    });
    assert.deepEqual(result.columnKeys, ['col_0', 'col_1']);
    assert.equal(result.sheet.rows.length, 2);
  });

  it('boş sheet isEmpty=true', () => {
    const result = parseExcelWorkbook({
      workbook: { sheets: [{ name: 'Bos', rows: [] }] }
    });
    assert.equal(result.sheet.isEmpty, true);
    assert.equal(result.telemetry.rowCount, 0);
    assert.equal(result.telemetry.columnCount, 0);
  });

  it('çoklu sheet içinde boş sheet seçilebilir', () => {
    const result = parseExcelWorkbook({
      workbook: multiSheetWorkbook(),
      sheetName: 'Bos'
    });
    assert.equal(result.sheet.isEmpty, true);
  });

  it('UTF-8 Türkçe karakterleri korur', () => {
    const result = parseExcelWorkbook({
      workbook: {
        sheets: [
          {
            name: 'TR',
            rows: [
              ['ürün', 'şehir'],
              ['Çağrı', 'İstanbul']
            ]
          }
        ]
      }
    });
    assert.equal(result.sheet.headers[0].name, 'ürün');
    assert.equal(result.sheet.rows[0].cells[0].value, 'Çağrı');
    assert.equal(result.sheet.rows[0].cells[1].value, 'İstanbul');
  });

  it('tarih hücresi Date olarak tip date', () => {
    const cell = normalizeExcelCell(new Date('2024-06-01T12:00:00.000Z'), 0);
    assert.equal(cell.cellType, 'date');
    assert.ok(cell.dateIso?.startsWith('2024-06-01'));
  });

  it('tarih hücresi nesne formu', () => {
    const cell = normalizeExcelCell(
      { value: '2024-01-01', cellType: 'date', dateIso: '2024-01-01T00:00:00.000Z' },
      1,
      'tarih'
    );
    assert.equal(cell.cellType, 'date');
    assert.equal(cell.headerName, 'tarih');
  });

  it('sayı hücresi tip number', () => {
    const cell = normalizeExcelCell(42.5, 0);
    assert.equal(cell.cellType, 'number');
    assert.equal(cell.value, 42.5);
  });

  it('boolean hücresi tip boolean', () => {
    assert.equal(normalizeExcelCell(true, 0).cellType, 'boolean');
    assert.equal(normalizeExcelCell(false, 0).value, false);
  });

  it('parse sonucu hücre tipleri doğru', () => {
    const result = parseExcelWorkbook({
      workbook: singleSheetWorkbook()
    });
    const row = result.sheet.rows[0];
    assert.equal(row.cells[0].cellType, 'string');
    assert.equal(row.cells[1].cellType, 'number');
    assert.equal(row.cells[2].cellType, 'boolean');
    assert.equal(row.cells[3].cellType, 'date');
  });

  it('boş hücre tip empty', () => {
    const cell = normalizeExcelCell(null, 0);
    assert.equal(cell.cellType, 'empty');
    assert.equal(cell.value, null);
  });

  it('boş satırları atlar', () => {
    const result = parseExcelWorkbook({
      workbook: {
        sheets: [
          {
            name: 'S',
            rows: [
              ['a', 'b'],
              ['1', '2'],
              [null, ''],
              ['3', '4']
            ]
          }
        ]
      },
      skipEmptyRows: true
    });
    assert.equal(result.sheet.rows.length, 2);
    assert.ok(result.telemetry.skippedEmptyRows >= 1);
  });

  it('skipEmptyRows=false boş satırı korur', () => {
    const result = parseExcelWorkbook({
      workbook: {
        sheets: [
          {
            name: 'S',
            rows: [
              ['a', 'b'],
              [null, null]
            ]
          }
        ]
      },
      skipEmptyRows: false
    });
    assert.equal(result.sheet.rows.length, 1);
  });

  it('telemetri: sheet/satır/sütun/süre', () => {
    const result = parseExcelWorkbook({
      workbook: singleSheetWorkbook()
    });
    const t = result.telemetry;
    assert.equal(t.sheetCount, 1);
    assert.equal(t.rowCount, 2);
    assert.equal(t.columnCount, 4);
    assert.ok(t.durationMs >= 0);
    assert.equal(t.binaryDecoded, false);
  });

  it('canRead yalnızca excel kaynağında true', () => {
    assert.equal(reader.canRead(importContext()), true);
    assert.equal(
      reader.canRead(importContext({ source: { type: 'csv', label: 'x' } })),
      false
    );
  });

  it('read() metadata.excelWorkbook ile çalışır', async () => {
    const result = await reader.read(
      importContext({
        metadata: {
          excelWorkbook: JSON.stringify(singleSheetWorkbook())
        }
      })
    );
    assert.equal(result.sheet.rows[0].cells[0].value, 'Elma');
  });

  it('read() JSON payloadRef ile çalışır', async () => {
    const result = await reader.read(
      importContext(),
      JSON.stringify(multiSheetWorkbook())
    );
    assert.equal(result.telemetry.sheetCount, 3);
  });

  it('binary payload EXCEL_BINARY_NOT_SUPPORTED', () => {
    assert.throws(
      () =>
        parseExcelWorkbook({
          workbook: singleSheetWorkbook(),
          binary: new Uint8Array([0x50, 0x4b])
        }),
      (err) => {
        assert.equal(err.code, EXCEL_BINARY_NOT_SUPPORTED);
        return true;
      }
    );
  });

  it('.xlsx dosya yolu EXCEL_BINARY_NOT_SUPPORTED', () => {
    assert.throws(
      () => resolveExcelWorkbookPayload(importContext(), '/tmp/data.xlsx'),
      (err) => {
        assert.equal(err.code, EXCEL_BINARY_NOT_SUPPORTED);
        return true;
      }
    );
  });

  it('içerik yoksa EXCEL_CONTENT_MISSING', async () => {
    await assert.rejects(
      () => reader.read(importContext()),
      (err) => {
        assert.equal(err.code, 'EXCEL_CONTENT_MISSING');
        return true;
      }
    );
  });

  it('workbook yoksa EXCEL_WORKBOOK_MISSING', () => {
    assert.throws(
      () => parseExcelWorkbook({}),
      (err) => {
        assert.equal(err.code, 'EXCEL_WORKBOOK_MISSING');
        return true;
      }
    );
  });

  it('registry registerExcelImportReader + factory', () => {
    const registry = createReaderRegistryRuntime();
    registerExcelImportReader(registry);
    assert.ok(registry.getById(EXCEL_READER_ID));
    const factory = createReaderFactory(registry);
    const { reader: created, readerId } = factory.create({
      sourceType: 'excel',
      extension: '.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    assert.equal(readerId, EXCEL_READER_ID);
    assert.equal(created.adapterType, 'excel');
  });

  it('createExcelReaderRegistration descriptor', () => {
    const reg = createExcelReaderRegistration();
    assert.equal(reg.descriptor.id, EXCEL_READER_ID);
    assert.ok(reg.descriptor.extensions?.includes('.xlsx'));
    assert.ok(reg.descriptor.sourceTypes.includes('excel'));
  });

  it('pipeline bag + rawPayload tabular', () => {
    const result = parseExcelWorkbook({
      workbook: singleSheetWorkbook()
    });
    const bag = {};
    const ctx = {
      request: { id: 'r', source: { type: 'excel', label: 'x' } },
      importContext: importContext(),
      stageExecutions: [],
      bag,
      startedAt: new Date().toISOString(),
      startedMark: 0
    };
    attachExcelResultToPipelineContext(ctx, result);
    assert.equal(bag[PIPELINE_BAG_EXCEL_RESULT_KEY], result);
    assert.equal(readExcelResultFromPipelineContext(ctx), result);
    assert.ok(bag.rawPayload.columns.includes('urun'));
  });

  it('excelResultToTabular Schema Detection ile çalışır', () => {
    const excel = parseExcelWorkbook({
      workbook: {
        sheets: [
          {
            name: 'U',
            rows: [
              ['urun_adi', 'stok'],
              ['Elma', 10]
            ]
          }
        ]
      }
    });
    const tabular = excelResultToTabular(excel);
    const schema = createSchemaDetectionRuntime().detect(
      createSchemaContext({ input: tabular.rows })
    );
    assert.ok(schema.columnKeys.includes('urun_adi'));
  });

  it('tabular ValidationRuntime readerOutput olarak kullanılabilir', () => {
    const excel = parseExcelWorkbook({
      workbook: singleSheetWorkbook()
    });
    const tabular = excelResultToTabular(excel);
    const validation = createValidationRuntime().validate(
      createValidationContext({
        request: {
          id: 'r1',
          source: { type: 'excel', label: 'ornek.xlsx' }
        },
        importContext: importContext(),
        readerOutput: tabular
      })
    );
    assert.equal(typeof validation.isValid, 'boolean');
    assert.ok(validation.telemetry.rulesExecuted > 0);
  });

  it('selectExcelSheet varsayılan ilk sheet', () => {
    const { workbook } = parseExcelWorkbook({
      workbook: multiSheetWorkbook()
    });
    const sheet = selectExcelSheet(workbook);
    assert.equal(sheet.name, 'Urunler');
  });

  it('maxRows üst sınırı uygular', () => {
    const rows = [['id']];
    for (let i = 0; i < 50; i += 1) {
      rows.push([String(i)]);
    }
    const result = parseExcelWorkbook({
      workbook: { sheets: [{ name: 'Big', rows }] },
      maxRows: 10
    });
    assert.equal(result.sheet.rows.length, 10);
  });

  it('readerId sabiti', () => {
    assert.equal(reader.readerId, 'excel-import-reader');
    assert.equal(EXCEL_READER_ID, 'excel-import-reader');
  });
});
