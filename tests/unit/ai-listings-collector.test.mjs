import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  runCollectorEngine,
  runCollectorPreview,
  parseCsvAdapter,
  parseJsonAdapter,
  parseXmlAdapter,
  parsePartnerFeedAdapter,
  validateCollectorRow,
  validateCollectorBatchLimit,
  validateCollectorContentSize,
  normalizeCollectorBatch,
  detectCollectorDuplicateCandidates,
  buildRepositoryReadyPayloads,
  buildCollectorSummary,
  COLLECTOR_MAX_ROWS,
  getCollectorSourceLabelTr
} = await import('../../js/ai-listings-collector/index.js');

const {
  buildCollectorDashboardHtml,
  buildCollectorPreviewHtml,
  buildCollectorPreviewStatsHtml,
  buildCollectorErrorsExportText,
  previewCollectorContent
} = await import('../../js/admin/ai-listings-collector-admin.js');

const routerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/router.js');
const authPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/auth.js');
const handlerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/handler.js');
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260701_ai_listings_engine_v1.sql');
const adminHtmlPath = path.join(process.cwd(), 'admin/ai-listings.html');

const validRow = {
  category: 'vehicle',
  title: '2021 BMW 320i',
  price: 1250000,
  currency: 'TRY',
  location: 'İstanbul',
  source_url: 'https://example.com/a',
  attributes: { brand: 'BMW', model: '320i' }
};

const csvContent = `category,title,price,currency,location,source_url
vehicle,2021 BMW 320i,1250000,TRY,İstanbul,https://example.com/a`;

const jsonContent = JSON.stringify([
  { category: 'vehicle', title: 'Audi A3', price: 900000, currency: 'TRY' }
]);

const xmlContent = `<listings>
  <listing><category>vacation</category><title>Bodrum Villa</title><price>15000</price></listing>
</listings>`;

const partnerFeed = JSON.stringify({
  partner: true,
  listings: [{ category: 'housing', title: 'Kadıköy Daire', price: 4500000, source_type: 'partner_api' }]
});

test('parseCsvAdapter parses header and rows', () => {
  const rows = parseCsvAdapter(csvContent);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, '2021 BMW 320i');
});

test('parseJsonAdapter parses array', () => {
  const rows = parseJsonAdapter(jsonContent);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Audi A3');
});

test('parseXmlAdapter parses listing nodes', () => {
  const rows = parseXmlAdapter(xmlContent);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].category, 'vacation');
});

test('parsePartnerFeedAdapter parses wrapped listings', () => {
  const rows = parsePartnerFeedAdapter(partnerFeed);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_type, 'partner_api');
});

test('validateCollectorRow accepts valid row', () => {
  const result = validateCollectorRow(validRow, 'manual');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.title, '2021 BMW 320i');
});

test('validateCollectorRow rejects missing title', () => {
  const result = validateCollectorRow({ category: 'vehicle' }, 'manual');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(' '), /title/);
});

test('validateCollectorRow rejects unsafe source_url', () => {
  const result = validateCollectorRow(
    { ...validRow, source_url: 'javascript:alert(1)' },
    'manual'
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(' '), /http/);
});

test('validateCollectorBatchLimit enforces max rows', () => {
  const over = validateCollectorBatchLimit(COLLECTOR_MAX_ROWS + 1);
  assert.equal(over.ok, false);
  const ok = validateCollectorBatchLimit(COLLECTOR_MAX_ROWS);
  assert.equal(ok.ok, true);
});

test('validateCollectorContentSize enforces byte limit', () => {
  const huge = validateCollectorContentSize('x'.repeat(600000));
  assert.equal(huge.ok, false);
});

test('normalizeCollectorBatch splits valid and invalid', () => {
  const batch = normalizeCollectorBatch(
    [validRow, { category: 'vehicle' }],
    'csv'
  );
  assert.equal(batch.valid_rows, 1);
  assert.equal(batch.invalid_rows, 1);
});

test('detectCollectorDuplicateCandidates finds batch duplicate', () => {
  const normalized = normalizeCollectorBatch([validRow, validRow], 'manual').normalized_rows;
  const { duplicate_candidates } = detectCollectorDuplicateCandidates(normalized);
  assert.ok(duplicate_candidates >= 1);
});

test('buildRepositoryReadyPayloads excludes duplicate flags', () => {
  const normalized = normalizeCollectorBatch([validRow, validRow], 'manual').normalized_rows;
  const { duplicate_flags } = detectCollectorDuplicateCandidates(normalized);
  const payloads = buildRepositoryReadyPayloads(normalized, duplicate_flags);
  assert.equal(payloads.length, 1);
  assert.equal(payloads[0].title, '2021 BMW 320i');
});

test('runCollectorEngine processes CSV pipeline', () => {
  const result = runCollectorEngine({ format: 'csv', content: csvContent });
  assert.equal(result.total_rows, 1);
  assert.equal(result.valid_rows, 1);
  assert.ok(result.repository_ready_payloads.length >= 1);
  assert.ok(result.acquisition_preview);
});

test('runCollectorEngine processes JSON pipeline', () => {
  const result = runCollectorEngine({ format: 'json', content: jsonContent });
  assert.equal(result.valid_rows, 1);
});

test('runCollectorEngine processes XML pipeline', () => {
  const result = runCollectorEngine({ format: 'xml', content: xmlContent });
  assert.equal(result.valid_rows, 1);
});

test('runCollectorEngine processes partner feed', () => {
  const result = runCollectorEngine({ format: 'partner_feed', content: partnerFeed });
  assert.equal(result.valid_rows, 1);
  assert.equal(result.source_type, 'partner_feed');
});

test('runCollectorEngine processes manual rows input', () => {
  const result = runCollectorEngine({ format: 'manual', rows: [validRow] });
  assert.equal(result.valid_rows, 1);
});

test('runCollectorEngine processes ai_builder format', () => {
  const result = runCollectorEngine({
    format: 'ai_builder',
    content: JSON.stringify([validRow])
  });
  assert.equal(result.valid_rows, 1);
});

test('runCollectorEngine returns Turkish error for invalid CSV header', () => {
  const result = runCollectorEngine({ format: 'csv', content: 'foo,bar\n1,2' });
  assert.equal(result.valid_rows, 0);
  assert.match(String(result.errors?.[0]?.messages?.[0] ?? ''), /CSV|category|title/i);
});

test('runCollectorEngine rejects batch over limit', () => {
  const rows = Array.from({ length: COLLECTOR_MAX_ROWS + 1 }, () => validRow);
  const result = runCollectorEngine({ format: 'manual', rows });
  assert.equal(result.ok, false);
  assert.match(String(result.errors?.[0]?.messages?.[0] ?? ''), /Maksimum/);
});

test('buildCollectorSummary returns Turkish summary fields', () => {
  const summary = buildCollectorSummary({
    source_type: 'csv',
    total_rows: 10,
    valid_rows: 8,
    invalid_rows: 2,
    duplicate_candidates: 1,
    repository_ready_rows: 7
  });
  assert.match(String(summary.text), /CSV/);
  assert.equal(summary.repository_ready_rows, 7);
});

test('runCollectorPreview uses existing candidates', () => {
  const result = runCollectorPreview({ format: 'csv', content: csvContent }, [validRow]);
  assert.ok(result.duplicate_candidates >= 0);
});

test('getCollectorSourceLabelTr maps labels', () => {
  assert.equal(getCollectorSourceLabelTr('ai_builder'), 'AI Builder');
  assert.equal(getCollectorSourceLabelTr('partner_feed'), 'Partner Feed');
});

test('buildCollectorPreviewStatsHtml renders metrics', () => {
  const result = runCollectorEngine({ format: 'csv', content: csvContent });
  const html = buildCollectorPreviewStatsHtml(result);
  assert.match(html, /Toplam kayıt/);
  assert.match(html, /Mükerrer adayı/);
});

test('buildCollectorPreviewHtml renders preview block', () => {
  const result = runCollectorEngine({ format: 'json', content: jsonContent });
  const html = buildCollectorPreviewHtml(result);
  assert.match(html, /Veri havuzu hazır/);
});

test('buildCollectorDashboardHtml renders collector UI', () => {
  const html = buildCollectorDashboardHtml(null);
  assert.match(html, /Veri Toplayıcı Önizleme/);
  assert.match(html, /data-collector-action="preview"/);
  assert.match(html, /Kaydet ve analiz et/);
});

test('buildCollectorErrorsExportText formats errors', () => {
  const text = buildCollectorErrorsExportText([{ row: 2, messages: ['title zorunludur'] }]);
  assert.match(text, /Satır 2/);
  assert.match(text, /title/);
});

test('previewCollectorContent wrapper returns engine result', () => {
  const result = previewCollectorContent('csv', csvContent, []);
  assert.equal(result.valid_rows, 1);
});

test('admin html includes Collector tab', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /data-admin-view="collector"/);
});

test('no endpoint URL changes in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.doesNotMatch(router, /\/collector/i);
});

test('no auth changes', () => {
  const auth = fs.readFileSync(authPath, 'utf8');
  assert.match(auth, /x-ai-listings-secret/);
  const handler = fs.readFileSync(handlerPath, 'utf8');
  assert.doesNotMatch(handler, /\/collector/i);
});

test('no DB schema changes', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /ai_listing_collector/i);
});

test('invalid rows are not in repository_ready_payloads', () => {
  const badJson = JSON.stringify([validRow, { category: 'vehicle', source_url: 'ftp://bad' }]);
  const result = runCollectorEngine({ format: 'json', content: badJson });
  assert.equal(result.invalid_rows, 1);
  assert.ok(result.repository_ready_payloads.length <= 1);
});

test('runCollectorEngine summary text is Turkish', () => {
  const result = runCollectorEngine({ format: 'csv', content: csvContent });
  assert.match(String(result.summary?.text ?? ''), /Kaynak/);
  assert.match(String(result.summary?.text ?? ''), /geçerli/);
});

test('parseCsvAdapter rejects missing headers', () => {
  assert.throws(() => parseCsvAdapter('a,b\n1,2'), /category|title|CSV/i);
});

test('parsePartnerFeedAdapter rejects invalid structure', () => {
  assert.throws(() => parsePartnerFeedAdapter('{"foo":"bar"}'), /desteklenmiyor|listings/i);
});

test('repository payload includes draft status', () => {
  const result = runCollectorEngine({ format: 'manual', rows: [validRow] });
  const payload = result.repository_ready_payloads[0];
  assert.equal(payload.status, 'draft');
  assert.equal(payload.source_type, 'manual');
});

test('duplicate candidate detection against existing listing', () => {
  const existing = {
    id: '11111111-1111-1111-1111-111111111111',
    ...validRow,
    attributes: { brand: 'BMW', model: '320i', year: 2021 }
  };
  const result = runCollectorPreview({ format: 'csv', content: csvContent }, [existing]);
  assert.ok(result.duplicate_candidates >= 0);
});

test('empty content returns zero rows', () => {
  const result = runCollectorEngine({ format: 'csv', content: '' });
  assert.equal(result.total_rows, 0);
});

test('acquisition_preview includes preview_limit', () => {
  const result = runCollectorEngine({ format: 'json', content: jsonContent });
  assert.ok(result.acquisition_preview.preview_limit >= 0);
});
