import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const { detectInputType } = await import('../../js/ai-listings-builder/input-detector.js');
const {
  parseTextInput,
  parsePriceValue,
  parseKmValue,
  parseYearValue,
  parseFuelValue,
  parseTransmissionValue
} = await import('../../js/ai-listings-builder/text-parser.js');
const { parseJsonInput } = await import('../../js/ai-listings-builder/json-parser.js');
const { parseCsvInput } = await import('../../js/ai-listings-builder/csv-parser.js');
const { parseUrlInput, isSafeBuilderUrl } = await import('../../js/ai-listings-builder/url-parser.js');
const { buildCanonicalListing, toCreateListingPayload } = await import('../../js/ai-listings-builder/canonical-builder.js');
const { enrichListing } = await import('../../js/ai-listings-builder/enrichment-engine.js');
const { buildPreviewHtml, buildPreviewJson } = await import('../../js/ai-listings-builder/preview-builder.js');
const { runAiListingBuilder } = await import('../../js/ai-listings-builder/index.js');

const BMW_SAMPLE = `2022 BMW 320i M Sport
58.000 km
Benzin
Otomatik
Yetkili servis bakımlı
1.780.000 TL`;

test('detectInputType detects url input', () => {
  assert.equal(detectInputType('https://example.com/listing/1'), 'url');
});

test('detectInputType detects json object input', () => {
  assert.equal(detectInputType('{"title":"BMW","category":"vehicle"}'), 'json');
});

test('detectInputType detects json array input', () => {
  assert.equal(detectInputType('[{"title":"BMW"}]'), 'json');
});

test('detectInputType detects csv input with comma headers', () => {
  assert.equal(detectInputType('category,title,price\nvehicle,BMW,100'), 'csv');
});

test('detectInputType falls back to text', () => {
  assert.equal(detectInputType(BMW_SAMPLE), 'text');
});

test('parsePriceValue parses Turkish formatted price', () => {
  assert.equal(parsePriceValue('1.780.000 TL'), 1780000);
});

test('parseKmValue parses dotted km value', () => {
  assert.equal(parseKmValue('58.000 km'), 58000);
});

test('parseYearValue parses year from title', () => {
  assert.equal(parseYearValue('2022 BMW 320i'), 2022);
});

test('parseFuelValue parses Benzin', () => {
  assert.equal(parseFuelValue('Benzin'), 'Benzin');
});

test('parseTransmissionValue parses Otomatik', () => {
  assert.equal(parseTransmissionValue('Otomatik'), 'Otomatik');
});

test('parseTextInput extracts BMW sample fields', () => {
  const parsed = parseTextInput(BMW_SAMPLE);
  assert.equal(parsed.fields.category.value, 'vehicle');
  assert.equal(parsed.fields.title.value, '2022 BMW 320i M Sport');
  assert.equal(parsed.fields.price.value, 1780000);
  assert.equal(parsed.fields.currency.value, 'TRY');
  assert.equal(parsed.fields.brand.value, 'BMW');
  assert.equal(parsed.fields.model.value, '320i');
  assert.equal(parsed.fields.year.value, 2022);
  assert.equal(parsed.fields.km.value, 58000);
  assert.equal(parsed.fields.fuel.value, 'Benzin');
  assert.equal(parsed.fields.transmission.value, 'Otomatik');
  assert.ok(Array.isArray(parsed.fields.tags.value));
  assert.ok(parsed.fields.tags.value.includes('Düşük KM'));
});

test('parseTextInput keeps description as cleaned source text', () => {
  const parsed = parseTextInput(BMW_SAMPLE);
  assert.equal(parsed.fields.description.value, BMW_SAMPLE);
});

test('parseTextInput does not invent missing fuel when absent', () => {
  const parsed = parseTextInput('2020 Audi A3\n45.000 km');
  assert.equal(parsed.fields.fuel, undefined);
});

test('isSafeBuilderUrl rejects javascript protocol', () => {
  assert.equal(isSafeBuilderUrl('javascript:alert(1)'), false);
});

test('isSafeBuilderUrl rejects data protocol', () => {
  assert.equal(isSafeBuilderUrl('data:text/html,test'), false);
});

test('isSafeBuilderUrl rejects file protocol', () => {
  assert.equal(isSafeBuilderUrl('file:///etc/passwd'), false);
});

test('isSafeBuilderUrl rejects blob protocol', () => {
  assert.equal(isSafeBuilderUrl('blob:https://example.com/id'), false);
});

test('isSafeBuilderUrl accepts https URL', () => {
  assert.equal(isSafeBuilderUrl('https://example.com/listing'), true);
});

test('parseUrlInput returns Turkish error for unsafe URL', () => {
  const result = parseUrlInput('javascript:alert(1)');
  assert.equal(result.ok, false);
  assert.match(result.message, /Geçersiz URL/i);
});

test('parseJsonInput parses object', () => {
  const result = parseJsonInput('{"category":"vehicle","title":"BMW 320i","price":900000}');
  assert.equal(result.ok, true);
  assert.equal(result.record.title, 'BMW 320i');
});

test('parseJsonInput returns Turkish error for invalid JSON', () => {
  const result = parseJsonInput('{bad json}');
  assert.equal(result.ok, false);
  assert.match(result.message, /Geçersiz JSON/i);
});

test('parseCsvInput parses first data row', () => {
  const result = parseCsvInput('category,title,price\nvehicle,BMW 320i,900000');
  assert.equal(result.ok, true);
  assert.equal(result.record.category, 'vehicle');
  assert.equal(result.record.title, 'BMW 320i');
});

test('buildCanonicalListing builds ai_builder preview shape', () => {
  const parsed = parseTextInput(BMW_SAMPLE);
  const canonical = buildCanonicalListing({
    fields: parsed.fields,
    input_type: 'text'
  });

  assert.equal(canonical.source_type, 'ai_builder');
  assert.equal(canonical.category, 'vehicle');
  assert.equal(canonical.attributes.brand, 'BMW');
  assert.equal(canonical.attributes.model, '320i');
  assert.equal(canonical.attributes.year, 2022);
  assert.equal(canonical.attributes.km, 58000);
  assert.ok(Array.isArray(canonical.tags));
  assert.ok(canonical.confidence >= 0);
});

test('enrichListing suggests title without inventing fuel', () => {
  const parsed = parseTextInput('45.000 km');
  parsed.fields.brand = { value: 'BMW', confidence: 0.9 };
  parsed.fields.model = { value: '320i', confidence: 0.9 };
  parsed.fields.year = { value: 2022, confidence: 0.9 };
  delete parsed.fields.title;
  delete parsed.fields.fuel;

  const canonical = enrichListing(
    buildCanonicalListing({ fields: parsed.fields, input_type: 'text' })
  );

  assert.match(String(canonical.title), /2022 BMW 320i/);
  assert.equal(canonical.attributes.fuel, undefined);
  assert.ok(canonical.extraction_warnings.some((item) => /Yakıt tipi belirlenemedi/i.test(String(item))));
});

test('buildPreviewHtml escapes HTML and includes actions', () => {
  const html = buildPreviewHtml({
    input_type: 'text',
    category: 'vehicle',
    title: '<script>alert(1)</script>',
    description: 'test',
    price: 100,
    currency: 'TRY',
    location: '',
    source_url: null,
    attributes: { brand: 'BMW' },
    confidence: 88,
    missing_fields: [],
    extraction_warnings: [],
    tags: ['BMW']
  });

  assert.match(html, /Önizleme/);
  assert.match(html, /Kaydet ve Analiz Et/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('buildPreviewJson returns serializable preview', () => {
  const json = buildPreviewJson({ title: 'BMW', category: 'vehicle', confidence: 80 });
  const parsed = JSON.parse(json);
  assert.equal(parsed.title, 'BMW');
});

test('runAiListingBuilder orchestrates BMW text sample', () => {
  const result = runAiListingBuilder(BMW_SAMPLE);
  assert.equal(result.ok, true);
  assert.equal(result.input_type, 'text');
  assert.equal(result.canonical.attributes.brand, 'BMW');
  assert.equal(result.canonical.price, 1780000);
  assert.ok(result.preview_html.includes('Önizleme'));
  assert.equal(result.create_payload.category, 'vehicle');
  assert.equal(result.create_payload.source_type, 'ai_builder');
});

test('toCreateListingPayload maps canonical to create endpoint body', () => {
  const payload = toCreateListingPayload({
    category: 'vehicle',
    title: 'BMW 320i',
    description: 'test',
    price: 900000,
    currency: 'TRY',
    attributes: { brand: 'BMW', model: '320i', year: 2022 },
    source_url: 'https://example.com/x'
  });

  assert.equal(payload.category, 'vehicle');
  assert.equal(payload.title, 'BMW 320i');
  assert.equal(payload.price, 900000);
  assert.deepEqual(payload.attributes, { brand: 'BMW', model: '320i', year: 2022 });
});

test('admin HTML exposes AI İlan Oluşturucu drawer', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin/ai-listings.html'), 'utf8');
  assert.match(html, /AI İlan Oluşturucu/);
  assert.match(html, /ai-listings-builder-template/);
  assert.match(html, /data-menu-action="ai-builder"/);
});

test('admin JS integrates AI listing builder module', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'js/admin/ai-listings-admin.js'), 'utf8');
  assert.match(js, /runAiListingBuilder/);
  assert.match(js, /openBuilderDrawer/);
  assert.match(js, /handleBuilderPreview/);
});
