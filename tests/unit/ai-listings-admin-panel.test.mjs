import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  ADMIN_ENABLE_KEY,
  ADMIN_SECRET_KEY,
  STATUS_LABELS_TR,
  CATEGORY_LABELS_TR,
  STATUS_FILTER_CHIPS_TR,
  isAdminPanelEnabled,
  getAdminPanelState,
  getEdgeSecret,
  getSupabaseAnonKey,
  buildEdgeRequestHeaders,
  buildListingBadgesHtml,
  buildStatusFilterChipsHtml,
  buildQualityChecklistHtml,
  buildQaActionsHtml,
  buildImportPreviewHtml,
  buildAnalysisScoresHtml,
  previewImportContent,
  getAvailableQaActions,
  resolveActiveStatusFilter,
  isListingPubliclyVisible,
  formatAnalysisDate,
  extractLatestAnalysis,
  getStatusLabelTr,
  getCategoryLabelTr,
  validateSourceUrl,
  validateAttributesJson,
  safeRenderText,
  mapEdgeResponse,
  translateAdminErrorMessage,
  resolveEdgeBaseUrl,
  EDGE_SECRET_HEADER
} = await import('../../js/admin/ai-listings-admin-core.js');

const adminHtmlPath = path.join(process.cwd(), 'admin/ai-listings.html');

function mockStorage(values = {}) {
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    }
  };
}

test('admin panel disabled by default', () => {
  assert.equal(isAdminPanelEnabled(mockStorage()), false);
  assert.equal(getAdminPanelState(mockStorage()), 'disabled');
});

test('admin panel enabled with on flag', () => {
  const storage = mockStorage({ [ADMIN_ENABLE_KEY]: 'on' });
  assert.equal(isAdminPanelEnabled(storage), true);
  assert.equal(getAdminPanelState(storage), 'no-secret');
});

test('missing secret state when enabled without secret', () => {
  const storage = mockStorage({ [ADMIN_ENABLE_KEY]: 'on' });
  assert.equal(getEdgeSecret(storage), '');
  assert.equal(getAdminPanelState(storage), 'no-secret');
});

test('ready state when enabled with secret', () => {
  const storage = mockStorage({
    [ADMIN_ENABLE_KEY]: 'on',
    [ADMIN_SECRET_KEY]: 'test-secret'
  });
  assert.equal(getAdminPanelState(storage), 'ready');
});

test('buildEdgeRequestHeaders includes Authorization gateway header', () => {
  const headers = buildEdgeRequestHeaders({ secret: 'abc123', anonKey: 'anon-key' });
  assert.equal(headers.Authorization, 'Bearer anon-key');
});

test('buildEdgeRequestHeaders includes apikey gateway header', () => {
  const headers = buildEdgeRequestHeaders({ secret: 'abc123', anonKey: 'anon-key' });
  assert.equal(headers.apikey, 'anon-key');
});

test('buildEdgeRequestHeaders includes x-ai-listings-secret header', () => {
  const headers = buildEdgeRequestHeaders({ secret: 'abc123', anonKey: 'anon-key' });
  assert.equal(headers[EDGE_SECRET_HEADER], 'abc123');
});

test('buildEdgeRequestHeaders includes Content-Type only when body exists', () => {
  const withoutBody = buildEdgeRequestHeaders({ secret: 'abc123', anonKey: 'anon-key' });
  assert.equal(withoutBody['Content-Type'], undefined);

  const withBody = buildEdgeRequestHeaders({ secret: 'abc123', anonKey: 'anon-key', hasBody: true });
  assert.equal(withBody['Content-Type'], 'application/json');
});

test('buildEdgeRequestHeaders never hardcodes secret or anon key', () => {
  const headers = buildEdgeRequestHeaders({});
  assert.equal(headers[EDGE_SECRET_HEADER], undefined);
  assert.equal(headers.Authorization, undefined);
  assert.equal(headers.apikey, undefined);
});

test('getSupabaseAnonKey reads from env', () => {
  assert.equal(getSupabaseAnonKey({ SUPABASE_ANON_KEY: '  test-key  ' }), 'test-key');
  assert.equal(getSupabaseAnonKey({}), '');
});

test('validateAttributesJson accepts object and rejects invalid JSON', () => {
  assert.deepEqual(validateAttributesJson(''), { ok: true, value: {} });
  assert.deepEqual(validateAttributesJson('{"year":2020}'), { ok: true, value: { year: 2020 } });
  assert.equal(validateAttributesJson('[]').ok, false);
  assert.equal(validateAttributesJson('{bad}').ok, false);
  assert.equal(validateAttributesJson('{bad}').message, 'Geçersiz JSON');
});

test('validateSourceUrl accepts http/https and rejects javascript', () => {
  assert.equal(validateSourceUrl('https://example.com'), true);
  assert.equal(validateSourceUrl(''), true);
  assert.equal(validateSourceUrl('javascript:alert(1)'), false);
});

test('source URL input has no default https placeholder in admin HTML', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  const sourceInputMatch = html.match(
    /<input[^>]*id="ai-listings-create-source-url"[^>]*>/
  );
  assert.ok(sourceInputMatch, 'source URL input should exist');
  assert.doesNotMatch(sourceInputMatch[0], /placeholder="https:\/\//);
  assert.doesNotMatch(sourceInputMatch[0], /value="https:\/\//);
});

test('admin panel keeps localStorage gate in disabled state renderer', async () => {
  const adminJs = fs.readFileSync(
    path.join(process.cwd(), 'js/admin/ai-listings-admin.js'),
    'utf8'
  );
  assert.match(adminJs, /localStorage/);
  assert.match(adminJs, new RegExp(ADMIN_ENABLE_KEY));
  assert.match(adminJs, /renderDisabledState/);
});

test('safeRenderText escapes HTML', () => {
  assert.equal(safeRenderText('<script>'), '&lt;script&gt;');
  assert.equal(safeRenderText('Toyota & Corolla'), 'Toyota &amp; Corolla');
});

test('mapEdgeResponse maps 503 module disabled message', () => {
  const mapped = mapEdgeResponse(
    { status: 503 },
    { ok: false, error: { code: 'MODULE_DISABLED', message: 'AI Listings module is disabled' } }
  );
  assert.equal(mapped.ok, false);
  assert.equal(mapped.message, 'AI Listings modülü devre dışı.');
});

test('mapEdgeResponse maps 401 unauthorized to Turkish', () => {
  const mapped = mapEdgeResponse(
    { status: 401 },
    { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }
  );
  assert.equal(mapped.ok, false);
  assert.equal(mapped.status, 401);
  assert.equal(mapped.message, 'Yetkisiz erişim');
});

test('translateAdminErrorMessage maps common admin errors to Turkish', () => {
  assert.equal(translateAdminErrorMessage('Unauthorized'), 'Yetkisiz erişim');
  assert.equal(translateAdminErrorMessage('Edge secret missing'), 'Edge secret eksik');
  assert.equal(translateAdminErrorMessage('Supabase anon key missing.'), 'Supabase anon key eksik');
  assert.equal(translateAdminErrorMessage('Request failed (500)'), 'İstek başarısız');
  assert.equal(translateAdminErrorMessage('attributes JSON is invalid'), 'Geçersiz JSON');
  assert.equal(translateAdminErrorMessage('source_url must be http or https'), 'Geçersiz URL');
});

test('resolveEdgeBaseUrl builds functions path', () => {
  assert.equal(
    resolveEdgeBaseUrl({ SUPABASE_URL: 'https://abc.supabase.co/' }),
    'https://abc.supabase.co/functions/v1/ai-listings'
  );
});

test('Turkish status labels cover all workflow statuses', () => {
  assert.equal(getStatusLabelTr('draft'), 'Taslak');
  assert.equal(getStatusLabelTr('pending_review'), 'İncelemede');
  assert.equal(getStatusLabelTr('approved'), 'Onaylandı');
  assert.equal(getStatusLabelTr('rejected'), 'Reddedildi');
  assert.equal(getStatusLabelTr('archived'), 'Arşivlendi');
  assert.deepEqual(Object.keys(STATUS_LABELS_TR), [
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'archived'
  ]);
});

test('Turkish category labels map known categories', () => {
  assert.equal(getCategoryLabelTr('vehicle'), 'Araç');
  assert.equal(getCategoryLabelTr('housing'), 'Konut');
  assert.equal(getCategoryLabelTr('real_estate'), 'Konut');
  assert.equal(getCategoryLabelTr('vacation'), 'Tatil');
  assert.equal(getCategoryLabelTr('unknown_cat'), 'unknown_cat');
  assert.deepEqual(CATEGORY_LABELS_TR, {
    vehicle: 'Araç',
    housing: 'Konut',
    real_estate: 'Konut',
    vacation: 'Tatil'
  });
});

test('buildListingBadgesHtml renders Turkish category status scores date and source', () => {
  const html = buildListingBadgesHtml({
    category: 'vehicle',
    status: 'pending_review',
    source_type: 'admin_import',
    latest_analysis: {
      ai_score: 78,
      risk_score: 22,
      created_at: '2026-06-06T12:00:00.000Z'
    }
  });

  assert.match(html, /ai-listings-admin__badge--category/);
  assert.match(html, />Araç</);
  assert.match(html, />İncelemede</);
  assert.match(html, /AI Skoru 78/);
  assert.match(html, /Risk 22/);
  assert.match(html, /2026-06-06/);
  assert.match(html, /admin_import/);
  assert.doesNotMatch(html, />vehicle</);
  assert.doesNotMatch(html, />pending_review</);
});

test('buildListingBadgesHtml omits score badges when analysis missing', () => {
  const html = buildListingBadgesHtml({ category: 'housing', status: 'draft', source_type: 'manual' });
  assert.doesNotMatch(html, /AI Skoru/);
  assert.doesNotMatch(html, /Risk /);
  assert.match(html, />Konut</);
  assert.match(html, />Taslak</);
});

test('formatAnalysisDate returns dash when analysis missing', () => {
  assert.equal(formatAnalysisDate(null), '—');
  assert.equal(formatAnalysisDate({}), '—');
});

test('extractLatestAnalysis reads nested latest_analysis', () => {
  const analysis = { ai_score: 65, risk_score: 35 };
  assert.deepEqual(extractLatestAnalysis({ latest_analysis: analysis }), analysis);
  assert.equal(extractLatestAnalysis({}), null);
});

test('buildAnalysisScoresHtml renders Turkish score labels', () => {
  const html = buildAnalysisScoresHtml({
    ai_score: 78,
    risk_score: 22,
    market_score: 70,
    price_score: 65,
    confidence: 0.82,
    summary: 'İyi değer'
  });

  assert.match(html, /AI Skoru/);
  assert.match(html, /<strong>Risk:<\/strong>/);
  assert.match(html, /<strong>Piyasa:<\/strong>/);
  assert.match(html, /<strong>Fiyat:<\/strong>/);
  assert.match(html, /<strong>Güven:<\/strong>/);
  assert.match(html, /İyi değer/);
});

test('buildStatusFilterChipsHtml marks active chip with Turkish labels', () => {
  const html = buildStatusFilterChipsHtml('draft');
  assert.match(html, /ai-listings-admin__chip--active/);
  assert.match(html, /data-status-filter="draft"/);
  assert.match(html, />Tümü</);
  assert.match(html, />İncelemede</);
  assert.doesNotMatch(html, />Pending Review</);
  assert.equal(STATUS_FILTER_CHIPS_TR[0].label, 'Tümü');
});

test('resolveActiveStatusFilter normalizes chip selection', () => {
  assert.equal(resolveActiveStatusFilter(''), '');
  assert.equal(resolveActiveStatusFilter('approved'), 'approved');
  assert.equal(resolveActiveStatusFilter('bogus'), '');
});

test('buildQualityChecklistHtml renders Turkish pass and fail states', () => {
  const html = buildQualityChecklistHtml(
    { title: 'Car', price: 100, location: 'Ankara', description: 'Nice', attributes: { a: 1 }, images: [] },
    { ai_score: 70 }
  );
  assert.match(html, /ai-listings-admin__check--pass/);
  assert.match(html, /ai-listings-admin__check--fail/);
  assert.match(html, /6\/7 kontrol geçti/);
  assert.match(html, /Başlık var/);
  assert.match(html, /Görsel var/);
});

test('getAvailableQaActions exposes actions per status', () => {
  assert.deepEqual(getAvailableQaActions('draft'), ['submit-review', 'archive', 'reanalyze']);
  assert.deepEqual(getAvailableQaActions('pending_review'), ['approve', 'reject', 'archive', 'reanalyze']);
  assert.deepEqual(getAvailableQaActions('archived'), []);
});

test('buildQaActionsHtml renders Turkish workflow buttons for pending_review', () => {
  const html = buildQaActionsHtml('pending_review');
  assert.match(html, /data-qa-action="approve"/);
  assert.match(html, /data-qa-action="reject"/);
  assert.match(html, />Onayla</);
  assert.match(html, />Reddet</);
  assert.doesNotMatch(html, /data-qa-action="submit-review"/);
  assert.doesNotMatch(html, />Approve</);
});

test('approved does not imply public visibility in admin core', () => {
  assert.equal(isListingPubliclyVisible('approved'), false);
});

test('previewImportContent returns valid and invalid row counts', () => {
  const csv = `category,title
vehicle,Valid
,Invalid`;
  const result = previewImportContent('csv', csv);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.preview.total_count, 2);
    assert.equal(result.preview.valid_rows, 1);
    assert.equal(result.preview.invalid_rows, 1);
  }
});

test('buildImportPreviewHtml renders totals and row errors', () => {
  const html = buildImportPreviewHtml({
    total_count: 2,
    valid_rows: 1,
    invalid_rows: 1,
    row_errors: [{ row: 2, messages: ['title is required'] }],
    normalized_rows: [{ category: 'vehicle', title: 'Valid' }]
  });

  assert.match(html, /Total rows/);
  assert.match(html, /Valid rows/);
  assert.match(html, /Invalid rows/);
  assert.match(html, /Row 2/);
  assert.match(html, /title is required/);
});
