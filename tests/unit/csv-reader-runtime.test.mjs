/**
 * CSV Reader Runtime — PR-101E (en az 25 unit test)
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(
  pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href
);

const {
  createCsvImportReader,
  parseCsvContent,
  createCsvReaderContext,
  csvResultToTabular,
  detectDelimiter,
  splitCsvLine,
  stripBom,
  utf8ByteLength,
  CSV_READER_ID,
  createCsvReaderRegistration,
  registerCsvImportReader,
  attachCsvResultToPipelineContext,
  readCsvResultFromPipelineContext,
  PIPELINE_BAG_CSV_RESULT_KEY
} = await import('../../src/business/import/readers/csv/index.ts');

const {
  createReaderRegistryRuntime,
  createReaderFactory
} = await import('../../src/business/import/readers/runtime/index.ts');

const {
  createSchemaDetectionRuntime,
  createSchemaContext
} = await import('../../src/business/import/detectors/runtime/index.ts');

function importContext(overrides = {}) {
  return {
    importId: 'imp-csv-1',
    source: { type: 'csv', label: 'ornek.csv' },
    locale: 'tr',
    currentStage: 'okuma',
    status: 'bekliyor',
    ...overrides
  };
}

describe('CsvImportReader', () => {
  /** @type {ReturnType<typeof createCsvImportReader>} */
  let reader;

  beforeEach(() => {
    reader = createCsvImportReader();
  });

  it('virgül ayracı ile başlıklı CSV okur', () => {
    const result = reader.parse(
      createCsvReaderContext({
        content: 'ad,adet\nElma,3\nArmut,5\n'
      })
    );
    assert.deepEqual(result.columnKeys, ['ad', 'adet']);
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].cells[0].value, 'Elma');
    assert.equal(result.telemetry.delimiter, ',');
  });

  it('noktalı virgül ayracı ile okur', () => {
    const result = reader.parse(
      createCsvReaderContext({
        content: 'ad;adet\nElma;3\nArmut;5\n',
        delimiter: ';'
      })
    );
    assert.equal(result.telemetry.delimiter, ';');
    assert.equal(result.rows[1].cells[1].value, '5');
  });

  it('auto delimiter noktalı virgülü seçer', () => {
    assert.equal(detectDelimiter('a;b;c\n1;2;3'), ';');
    assert.equal(detectDelimiter('a,b,c\n1,2,3'), ',');
  });

  it('başlıklı CSV headerPresent=true', () => {
    const result = parseCsvContent({
      content: 'sku,fiyat\nA1,10'
    });
    assert.equal(result.telemetry.headerPresent, true);
    assert.equal(result.headers[0].name, 'sku');
  });

  it('başlıksız CSV sentetik kolon üretir', () => {
    const result = parseCsvContent({
      content: 'A1,10\nA2,12',
      hasHeader: false
    });
    assert.deepEqual(result.columnKeys, ['col_0', 'col_1']);
    assert.equal(result.rows.length, 2);
    assert.equal(result.telemetry.headerPresent, false);
  });

  it('boş dosya: sıfır satır/sütun', () => {
    const result = parseCsvContent({ content: '' });
    assert.equal(result.rows.length, 0);
    assert.equal(result.columnKeys.length, 0);
    assert.equal(result.telemetry.rowCount, 0);
  });

  it('yalnızca boş satırlar atlanır', () => {
    const result = parseCsvContent({
      content: '\n\n\n'
    });
    assert.equal(result.rows.length, 0);
    assert.ok(result.telemetry.skippedEmptyRows >= 1);
  });

  it('boş satırları atlar (veri arasında)', () => {
    const result = parseCsvContent({
      content: 'a,b\n1,2\n\n3,4\n'
    });
    assert.equal(result.rows.length, 2);
    assert.equal(result.telemetry.skippedEmptyRows, 1);
  });

  it('skipEmptyRows=false boş satırı korur', () => {
    const result = parseCsvContent({
      content: 'a,b\n1,2\n\n',
      skipEmptyRows: false
    });
    assert.ok(result.rows.length >= 2);
  });

  it('UTF-8 Türkçe karakterleri korur', () => {
    const result = parseCsvContent({
      content: 'ürün,şehir\nÇağrı,İstanbul\n'
    });
    assert.equal(result.headers[0].name, 'ürün');
    assert.equal(result.rows[0].cells[0].value, 'Çağrı');
    assert.equal(result.rows[0].cells[1].value, 'İstanbul');
  });

  it('UTF-8 BOM temizlenir', () => {
    const result = parseCsvContent({
      content: '\uFEFFad,adet\nElma,1'
    });
    assert.equal(result.headers[0].name, 'ad');
    assert.equal(stripBom('\uFEFFx'), 'x');
  });

  it('quoted value ve kaçış destekler', () => {
    const fields = splitCsvLine('"a,b","c""d"', ',');
    assert.deepEqual(fields, ['a,b', 'c"d']);
    const result = parseCsvContent({
      content: 'not,aciklama\n"Elma, Granny","hepsi ""iyi"""\n'
    });
    assert.equal(result.rows[0].cells[0].value, 'Elma, Granny');
    assert.equal(result.rows[0].cells[1].value, 'hepsi "iyi"');
  });

  it('hatalı satır (eksik kolon) malformed işaretler', () => {
    const result = parseCsvContent({
      content: 'a,b,c\n1,2\n3,4,5\n'
    });
    assert.equal(result.telemetry.malformedRowCount, 1);
    assert.equal(result.rows[0].malformed, true);
    assert.equal(result.rows[1].malformed, undefined);
  });

  it('fazla kolonlu satır malformed', () => {
    const result = parseCsvContent({
      content: 'a,b\n1,2,3\n'
    });
    assert.equal(result.telemetry.malformedRowCount, 1);
  });

  it('büyük dosya senaryosu: maxRows ile sınırlanır', () => {
    const lines = ['id,value'];
    for (let i = 0; i < 5000; i += 1) {
      lines.push(`${i},v${i}`);
    }
    const content = lines.join('\n');
    assert.ok(utf8ByteLength(content) > 10_000);
    const result = parseCsvContent({
      content,
      maxRows: 100
    });
    assert.equal(result.rows.length, 100);
    assert.equal(result.telemetry.columnCount, 2);
    assert.ok(result.telemetry.fileSizeBytes > 10_000);
  });

  it('telemetri: boyut, satır, sütun, süre', () => {
    const result = parseCsvContent({
      content: 'x,y\n1,2\n3,4\n'
    });
    const t = result.telemetry;
    assert.ok(t.fileSizeBytes > 0);
    assert.equal(t.rowCount, 2);
    assert.equal(t.columnCount, 2);
    assert.ok(t.durationMs >= 0);
    assert.ok(t.startedAt && t.endedAt);
  });

  it('canRead yalnızca csv kaynağında true', () => {
    assert.equal(reader.canRead(importContext()), true);
    assert.equal(
      reader.canRead(importContext({ source: { type: 'excel', label: 'x' } })),
      false
    );
  });

  it('read() payloadRef inline içerikle çalışır', async () => {
    const result = await reader.read(
      importContext(),
      'ad,adet\nElma,2\n'
    );
    assert.equal(result.rows.length, 1);
    assert.equal(result.adapterType === undefined, true);
    assert.equal(result.telemetry.rowCount, 1);
  });

  it('read() metadata.csvContent kullanır', async () => {
    const result = await reader.read(
      importContext({
        metadata: { csvContent: 'a,b\n1,2\n' }
      })
    );
    assert.equal(result.rows[0].cells[0].value, '1');
  });

  it('read() dosya yolundan okur', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'csv-reader-'));
    const file = path.join(dir, 'data.csv');
    writeFileSync(file, 'ad,adet\nKiraz,9\n', 'utf8');
    try {
      const result = await reader.read(importContext(), file);
      assert.equal(result.rows[0].cells[0].value, 'Kiraz');
    } finally {
      unlinkSync(file);
    }
  });

  it('içerik yoksa CSV_CONTENT_MISSING', async () => {
    await assert.rejects(
      () => reader.read(importContext()),
      (err) => {
        assert.equal(err.code, 'CSV_CONTENT_MISSING');
        return true;
      }
    );
  });

  it('registry registerCsvImportReader + factory create', () => {
    const registry = createReaderRegistryRuntime();
    registerCsvImportReader(registry);
    assert.ok(registry.getById(CSV_READER_ID));
    const factory = createReaderFactory(registry);
    const { reader: created, readerId } = factory.create({
      sourceType: 'csv',
      extension: '.csv',
      mimeType: 'text/csv'
    });
    assert.equal(readerId, CSV_READER_ID);
    assert.equal(created.adapterType, 'csv');
    assert.ok(created.canRead(importContext()));
  });

  it('createCsvReaderRegistration descriptor alanları', () => {
    const reg = createCsvReaderRegistration();
    assert.equal(reg.descriptor.id, CSV_READER_ID);
    assert.ok(reg.descriptor.extensions?.includes('.csv'));
    assert.equal(typeof reg.createReader, 'function');
  });

  it('pipeline bag’e CSV sonucu ve rawPayload yazılır', () => {
    const result = parseCsvContent({ content: 'a,b\n1,2\n' });
    const bag = {};
    const ctx = {
      request: { id: 'r', source: { type: 'csv', label: 'x' } },
      importContext: importContext(),
      stageExecutions: [],
      bag,
      startedAt: new Date().toISOString(),
      startedMark: 0
    };
    attachCsvResultToPipelineContext(ctx, result);
    assert.equal(bag[PIPELINE_BAG_CSV_RESULT_KEY], result);
    assert.equal(readCsvResultFromPipelineContext(ctx), result);
    assert.ok(bag.rawPayload.columns);
    assert.ok(Array.isArray(bag.rawPayload.rows));
  });

  it('csvResultToTabular Schema Detection girdisi üretir', () => {
    const csv = parseCsvContent({
      content: 'urun_adi,stok\nElma,10\nArmut,4\n'
    });
    const tabular = csvResultToTabular(csv);
    const schemaRuntime = createSchemaDetectionRuntime();
    const schema = schemaRuntime.detect(
      createSchemaContext({ input: tabular.rows })
    );
    assert.ok(schema.columnKeys.includes('urun_adi'));
    assert.ok(schema.entities.some((e) => e.entityType === 'urun'));
  });

  it('CRLF satır sonlarını işler', () => {
    const result = parseCsvContent({
      content: 'a,b\r\n1,2\r\n3,4\r\n'
    });
    assert.equal(result.rows.length, 2);
  });

  it('quoted alan içinde satır sonu birleştirilir', () => {
    const result = parseCsvContent({
      content: 'ad,not\n"Ali","satir1\nsatir2"\n'
    });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].cells[1].value, 'satir1\nsatir2');
  });

  it('readerId sabiti csv-import-reader', () => {
    assert.equal(reader.readerId, 'csv-import-reader');
    assert.equal(CSV_READER_ID, 'csv-import-reader');
  });
});
