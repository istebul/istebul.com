import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  runAcquisitionEngine,
  countDuplicateCandidates,
  ACQUISITION_MAX_ROWS,
  ACQUISITION_MAX_PAYLOAD_BYTES,
  measureAcquisitionPayloadBytes,
  detectAcquisitionSource,
  getSourceLabelTr,
  buildAcquisitionEventPayload,
  ACQUISITION_EVENT_TYPES
} = await import('../../supabase/functions/_shared/ai-listings/acquisition/acquisition-engine.js');

const {
  validateAcquisitionRow,
  parseAcquisitionCsvRows,
  parseAcquisitionJsonRows
} = await import('../../supabase/functions/_shared/ai-listings/acquisition/acquisition-validator.js');

const { normalizeAcquisitionBatch } = await import(
  '../../supabase/functions/_shared/ai-listings/acquisition/batch-normalizer.js'
);

const { buildAcquisitionSummary } = await import(
  '../../supabase/functions/_shared/ai-listings/acquisition/acquisition-summary.js'
);

const {
  buildAcquisitionPreviewHtml,
  formatAcquisitionErrorsText
} = await import('../../js/ai-listings-acquisition/acquisition-preview.js');

const {
  previewImportContent,
  buildImportPreviewHtml,
  buildAcquisitionErrorsExportText
} = await import('../../js/admin/ai-listings-admin-core.js');

const sampleCsv = `category,title,price,currency,location,source_url
vehicle,Toyota Corolla,950000,TRY,İstanbul,https://example.com/1
vehicle,Honda Civic,880000,TRY,Ankara,https://example.com/2
,Missing Title,,,,
vehicle,Bad URL,100000,TRY,İzmir,javascript:alert(1)`;

test('detectAcquisitionSource maps csv format to csv', () => {
  assert.equal(detectAcquisitionSource({ format: 'csv' }), 'csv');
});

test('detectAcquisitionSource maps json format to json', () => {
  assert.equal(detectAcquisitionSource({ format: 'json' }), 'json');
});

test('detectAcquisitionSource honors explicit ai_builder source', () => {
  assert.equal(detectAcquisitionSource({ explicit_source: 'ai_builder' }), 'ai_builder');
});

test('detectAcquisitionSource detects future_sahibinden from source_url', () => {
  assert.equal(
    detectAcquisitionSource({
      rows: [{ source_url: 'https://www.sahibinden.com/ilan/123' }]
    }),
    'future_sahibinden'
  );
});

test('detectAcquisitionSource detects partner_api from metadata', () => {
  assert.equal(
    detectAcquisitionSource({ metadata: { partner: true } }),
    'partner_api'
  );
});

test('getSourceLabelTr returns Turkish labels', () => {
  assert.equal(getSourceLabelTr('csv'), 'CSV');
  assert.equal(getSourceLabelTr('ai_builder'), 'AI Builder');
});

test('parseAcquisitionCsvRows parses header and rows', () => {
  const rows = parseAcquisitionCsvRows(sampleCsv);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].title, 'Toyota Corolla');
});

test('parseAcquisitionCsvRows rejects missing headers', () => {
  assert.throws(() => parseAcquisitionCsvRows('foo,bar\n1,2'), /CSV başlık satırı eksik/i);
});

test('parseAcquisitionJsonRows parses array with Turkish error on invalid JSON', () => {
  assert.throws(() => parseAcquisitionJsonRows('{invalid'), /JSON ayrıştırılamadı/i);
});

test('parseAcquisitionJsonRows requires array root', () => {
  assert.throws(() => parseAcquisitionJsonRows('{"title":"x"}'), /dizi olmalıdır/i);
});

test('validateAcquisitionRow requires category and title', () => {
  const result = validateAcquisitionRow({ description: 'only desc' });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((msg) => /category/i.test(msg)));
    assert.ok(result.errors.some((msg) => /title/i.test(msg)));
  }
});

test('validateAcquisitionRow rejects unsafe source_url', () => {
  const result = validateAcquisitionRow({
    category: 'vehicle',
    title: 'Car',
    source_url: 'javascript:alert(1)'
  });
  assert.equal(result.ok, false);
});

test('validateAcquisitionRow normalizes create payload shape', () => {
  const result = validateAcquisitionRow({
    category: 'vehicle',
    title: 'Car',
    price: 900000,
    currency: 'TRY',
    location: 'İstanbul',
    images: ['https://example.com/a.jpg'],
    attributes: { year: 2022 },
    source_url: 'https://example.com/car',
    source_type: 'csv'
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.category, 'vehicle');
    assert.equal(result.value.source_type, 'csv');
    assert.deepEqual(result.value.images, ['https://example.com/a.jpg']);
  }
});

test('normalizeAcquisitionBatch skips invalid rows', () => {
  const batch = normalizeAcquisitionBatch('csv', sampleCsv, 'csv');
  assert.equal(batch.raw_rows.length, 4);
  assert.equal(batch.valid_rows, 2);
  assert.equal(batch.invalid_rows, 2);
  assert.equal(batch.normalized_rows.length, 2);
});

test('runAcquisitionEngine returns acquisition output shape', () => {
  const result = runAcquisitionEngine({ format: 'csv', content: sampleCsv, source_type: 'csv' });
  assert.equal(result.source_type, 'csv');
  assert.equal(result.total_rows, 4);
  assert.equal(result.valid_rows, 2);
  assert.equal(result.invalid_rows, 2);
  assert.ok(Array.isArray(result.normalized_rows));
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.summary);
  assert.match(String(result.summary.text), /Kaynak: CSV/i);
});

test('runAcquisitionEngine enforces max row limit', () => {
  const rows = Array.from({ length: ACQUISITION_MAX_ROWS + 1 }, (_, i) => ({
    category: 'vehicle',
    title: `Car ${i + 1}`
  }));
  const result = runAcquisitionEngine({ format: 'json', content: JSON.stringify(rows), source_type: 'json' });
  assert.equal(result.valid_rows, 0);
  assert.ok(result.errors.some((entry) => entry.messages.some((msg) => /1000 satır/i.test(msg))));
});

test('runAcquisitionEngine enforces payload size limit', () => {
  const huge = 'category,title\n' + 'x'.repeat(ACQUISITION_MAX_PAYLOAD_BYTES);
  const result = runAcquisitionEngine({ format: 'csv', content: huge, source_type: 'csv' });
  assert.equal(result.valid_rows, 0);
  assert.ok(result.errors.some((entry) => entry.messages.some((msg) => /bayt sınırını/i.test(msg))));
});

test('measureAcquisitionPayloadBytes counts utf-8 bytes', () => {
  assert.ok(measureAcquisitionPayloadBytes('abc') >= 3);
  assert.ok(measureAcquisitionPayloadBytes('İstanbul') > 8);
});

test('countDuplicateCandidates detects intra-batch duplicates', () => {
  const rows = [
    {
      category: 'vehicle',
      title: 'Same Car',
      price: 100000,
      attributes: { year: 2020, brand: 'Toyota', model: 'Corolla' }
    },
    {
      category: 'vehicle',
      title: 'Same Car',
      price: 100000,
      attributes: { year: 2020, brand: 'Toyota', model: 'Corolla' }
    }
  ];
  assert.ok(countDuplicateCandidates(rows) >= 1);
});

test('countDuplicateCandidates uses existing duplicate engine candidates', () => {
  const incoming = {
    category: 'vehicle',
    title: 'BMW 320i',
    price: 900000,
    attributes: { year: 2019, brand: 'BMW', model: '320i', km: 45000 },
    location: 'İstanbul'
  };
  const existing = [
    {
      id: 'existing-1',
      category: 'vehicle',
      title: 'BMW 320i M Sport',
      price: 910000,
      attributes: { year: 2019, brand: 'BMW', model: '320i', km: 46000 },
      location: 'İstanbul'
    }
  ];
  assert.ok(countDuplicateCandidates([incoming], existing) >= 1);
});

test('buildAcquisitionSummary includes savable rows', () => {
  const summary = buildAcquisitionSummary({
    source_type: 'csv',
    total_rows: 500,
    valid_rows: 482,
    invalid_rows: 12,
    duplicate_candidates: 6,
    savable_rows: 482
  });
  assert.equal(summary.total_rows, 500);
  assert.equal(summary.valid_rows, 482);
  assert.equal(summary.duplicate_candidates, 6);
  assert.match(summary.text, /Kaydedilebilir kayıt: 482/);
});

test('buildAcquisitionPreviewHtml renders admin summary block', () => {
  const html = buildAcquisitionPreviewHtml({
    source_type: 'csv',
    total_rows: 500,
    valid_rows: 482,
    invalid_rows: 12,
    duplicate_candidates: 6,
    errors: [{ row: 3, messages: ['title zorunludur'] }],
    summary: buildAcquisitionSummary({
      source_type: 'csv',
      total_rows: 500,
      valid_rows: 482,
      invalid_rows: 12,
      duplicate_candidates: 6
    })
  });
  assert.match(html, /Veri Alma Özeti/);
  assert.match(html, /Toplam/);
  assert.match(html, /Geçerli/);
  assert.match(html, /Duplicate adayı/);
  assert.match(html, /Geçerli kayıtları kaydet/);
  assert.match(html, /Hataları kopyala/);
});

test('buildAcquisitionPreviewHtml compact mode for builder', () => {
  const html = buildAcquisitionPreviewHtml(
    {
      source_type: 'ai_builder',
      total_rows: 1,
      valid_rows: 1,
      invalid_rows: 0,
      duplicate_candidates: 0,
      summary: { source_label: 'AI Builder' }
    },
    { compact: true }
  );
  assert.match(html, /data-acquisition-preview-compact/);
  assert.doesNotMatch(html, /Geçerli kayıtları kaydet/);
});

test('previewImportContent uses acquisition engine', () => {
  const result = previewImportContent('csv', sampleCsv);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.preview.valid_rows, 2);
    assert.equal(result.preview.invalid_rows, 2);
  }
});

test('buildImportPreviewHtml supports legacy and acquisition preview shapes', () => {
  const acquisitionHtml = buildImportPreviewHtml({
    source_type: 'csv',
    total_rows: 10,
    valid_rows: 8,
    invalid_rows: 2,
    duplicate_candidates: 1,
    normalized_rows: [],
    errors: [],
    summary: buildAcquisitionSummary({
      source_type: 'csv',
      total_rows: 10,
      valid_rows: 8,
      invalid_rows: 2,
      duplicate_candidates: 1
    })
  });
  assert.match(acquisitionHtml, /Veri Alma Özeti/);

  const legacyHtml = buildImportPreviewHtml({
    total_count: 3,
    valid_rows: 2,
    invalid_rows: 1,
    row_errors: [{ row: 2, messages: ['bad row'] }],
    normalized_rows: []
  });
  assert.match(legacyHtml, /Toplam satır/);
});

test('formatAcquisitionErrorsText exports row errors', () => {
  const text = formatAcquisitionErrorsText([
    { row: 3, messages: ['title zorunludur'] },
    { row: 4, messages: ['source_url yalnızca http veya https olabilir'] }
  ]);
  assert.match(text, /Satır 3/);
  assert.match(text, /Satır 4/);
});

test('buildAcquisitionErrorsExportText delegates to formatter', () => {
  const text = buildAcquisitionErrorsExportText({
    errors: [{ row: 1, messages: ['category zorunludur'] }]
  });
  assert.match(text, /Satır 1/);
});

test('buildAcquisitionEventPayload shapes previewed event', () => {
  const payload = buildAcquisitionEventPayload('acquisition_previewed', {
    source_type: 'csv',
    total_rows: 10,
    valid_rows: 8,
    invalid_rows: 2,
    duplicate_candidates: 1,
    summary: { text: 'summary' }
  });
  assert.equal(payload.source_type, 'csv');
  assert.equal(payload.total_rows, 10);
  assert.equal(payload.valid_rows, 8);
});

test('buildAcquisitionEventPayload shapes failed event', () => {
  const payload = buildAcquisitionEventPayload('acquisition_failed', { message: 'Hata' });
  assert.equal(payload.message, 'Hata');
});

test('ACQUISITION_EVENT_TYPES lists suggested event names', () => {
  assert.deepEqual(ACQUISITION_EVENT_TYPES, [
    'acquisition_previewed',
    'acquisition_validated',
    'acquisition_imported',
    'acquisition_failed'
  ]);
});

test('runAcquisitionEngine ai_builder rows path works', () => {
  const result = runAcquisitionEngine({
    rows: [{ category: 'vehicle', title: 'Builder Car', price: 500000 }],
    source_type: 'ai_builder'
  });
  assert.equal(result.source_type, 'ai_builder');
  assert.equal(result.valid_rows, 1);
  assert.equal(result.normalized_rows[0].source_type, 'ai_builder');
});

test('invalid rows are not included in normalized_rows', () => {
  const result = runAcquisitionEngine({ format: 'csv', content: sampleCsv, source_type: 'csv' });
  assert.ok(result.normalized_rows.every((row) => row.category && row.title));
});

test('no database schema changes for acquisition layer', () => {
  const schemaPath = path.join(process.cwd(), 'docs/ai-listings/DATABASE_SCHEMA.md');
  assert.ok(fs.existsSync(schemaPath));
  const schema = fs.readFileSync(schemaPath, 'utf8');
  assert.doesNotMatch(schema, /acquisition_engine|acquisition_previewed/i);
});

test('buildAcquisitionPreviewHtml escapes HTML in errors', () => {
  const html = buildAcquisitionPreviewHtml({
    source_type: 'csv',
    total_rows: 1,
    valid_rows: 0,
    invalid_rows: 1,
    duplicate_candidates: 0,
    errors: [{ row: 1, messages: ['<script>alert(1)</script>'] }],
    summary: buildAcquisitionSummary({
      source_type: 'csv',
      total_rows: 1,
      valid_rows: 0,
      invalid_rows: 1,
      duplicate_candidates: 0
    })
  });
  assert.doesNotMatch(html, /<script>/);
});

test('runAcquisitionEngine handles empty content', () => {
  const result = runAcquisitionEngine({ format: 'csv', content: '   ', source_type: 'csv' });
  assert.equal(result.valid_rows, 0);
  assert.ok(result.errors.some((entry) => entry.messages.some((msg) => /boş olamaz/i.test(msg))));
});
