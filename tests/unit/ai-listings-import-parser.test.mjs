import test from 'node:test';
import assert from 'node:assert/strict';

const {
  parseCsvRows,
  parseJsonRows,
  validateImportRow,
  buildImportPreview,
  validateImportRequestBody,
  measureImportContentBytes,
  IMPORT_MAX_ROWS,
  IMPORT_MAX_CONTENT_BYTES
} = await import('../../supabase/functions/_shared/ai-listings/import-parser.js');

test('parseCsvRows parses header and data rows', () => {
  const csv = `category,title,price,currency
vehicle,Toyota Corolla,950000,TRY
housing,Daire,2500000,TRY`;

  const rows = parseCsvRows(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].category, 'vehicle');
  assert.equal(rows[0].title, 'Toyota Corolla');
  assert.equal(rows[1].category, 'housing');
});

test('parseJsonRows parses array of listing objects', () => {
  const rows = parseJsonRows(
    JSON.stringify([
      { category: 'vehicle', title: 'Honda Civic', price: 800000 },
      { category: 'housing', title: 'Villa', location: 'Antalya' }
    ])
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, 'Honda Civic');
  assert.equal(rows[1].location, 'Antalya');
});

test('validateImportRow rejects missing category and title', () => {
  const result = validateImportRow({ description: 'No keys' });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((msg) => /category/i.test(msg)));
    assert.ok(result.errors.some((msg) => /title/i.test(msg)));
  }
});

test('validateImportRow rejects invalid source_url', () => {
  const result = validateImportRow({
    category: 'vehicle',
    title: 'Car',
    source_url: 'javascript:alert(1)'
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((msg) => /source_url/i.test(msg)));
});

test('validateImportRow normalizes images and attributes', () => {
  const result = validateImportRow({
    category: 'vehicle',
    title: 'Car',
    images: 'https://a.example/1.jpg|https://b.example/2.jpg',
    attributes: '{"year":2020}'
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value.images, ['https://a.example/1.jpg', 'https://b.example/2.jpg']);
    assert.deepEqual(result.value.attributes, { year: 2020 });
  }
});

test('buildImportPreview skips invalid rows and returns normalized rows', () => {
  const csv = `category,title,source_url
vehicle,Valid Car,https://example.com/car
,Missing Title,
vehicle,Bad URL,javascript:evil()`;

  const preview = buildImportPreview('csv', csv);
  assert.equal(preview.total_count, 3);
  assert.equal(preview.valid_rows, 1);
  assert.equal(preview.invalid_rows, 2);
  assert.equal(preview.normalized_rows.length, 1);
  assert.equal(preview.normalized_rows[0].title, 'Valid Car');
  assert.equal(preview.row_errors.length, 2);
});

test('buildImportPreview enforces max row limit', () => {
  const rows = Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => ({
    category: 'vehicle',
    title: `Car ${i + 1}`
  }));

  assert.throws(
    () => buildImportPreview('json', JSON.stringify(rows)),
    /maximum of 100 rows/i
  );
});

test('validateImportRequestBody rejects oversized content', () => {
  const huge = 'x'.repeat(IMPORT_MAX_CONTENT_BYTES + 1);
  const result = validateImportRequestBody({ format: 'csv', content: huge });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /exceeds maximum size/i);
});

test('measureImportContentBytes counts utf-8 bytes', () => {
  assert.ok(measureImportContentBytes('abc') >= 3);
  assert.ok(measureImportContentBytes('İstanbul') > 8);
});
