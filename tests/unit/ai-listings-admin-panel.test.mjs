import test from 'node:test';
import assert from 'node:assert/strict';

const {
  ADMIN_ENABLE_KEY,
  ADMIN_SECRET_KEY,
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
  previewImportContent,
  getAvailableQaActions,
  resolveActiveStatusFilter,
  isListingPubliclyVisible,
  formatAnalysisDate,
  extractLatestAnalysis,
  validateSourceUrl,
  validateAttributesJson,
  safeRenderText,
  mapEdgeResponse,
  resolveEdgeBaseUrl,
  EDGE_SECRET_HEADER
} = await import('../../js/admin/ai-listings-admin-core.js');

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
});

test('validateSourceUrl accepts http/https and rejects javascript', () => {
  assert.equal(validateSourceUrl('https://example.com'), true);
  assert.equal(validateSourceUrl(''), true);
  assert.equal(validateSourceUrl('javascript:alert(1)'), false);
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
  assert.equal(mapped.message, 'AI Listings module is disabled.');
});

test('mapEdgeResponse maps 401 unauthorized', () => {
  const mapped = mapEdgeResponse(
    { status: 401 },
    { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid secret' } }
  );
  assert.equal(mapped.ok, false);
  assert.equal(mapped.status, 401);
});

test('resolveEdgeBaseUrl builds functions path', () => {
  assert.equal(
    resolveEdgeBaseUrl({ SUPABASE_URL: 'https://abc.supabase.co/' }),
    'https://abc.supabase.co/functions/v1/ai-listings'
  );
});

test('buildListingBadgesHtml renders category ai risk and date badges', () => {
  const html = buildListingBadgesHtml({
    category: 'vehicle',
    latest_analysis: {
      ai_score: 78,
      risk_score: 22,
      created_at: '2026-06-06T12:00:00.000Z'
    }
  });

  assert.match(html, /ai-listings-admin__badge--category/);
  assert.match(html, /vehicle/);
  assert.match(html, /AI 78/);
  assert.match(html, /Risk 22/);
  assert.match(html, /2026-06-06/);
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

test('buildStatusFilterChipsHtml marks active chip', () => {
  const html = buildStatusFilterChipsHtml('draft');
  assert.match(html, /ai-listings-admin__chip--active/);
  assert.match(html, /data-status-filter="draft"/);
  assert.match(html, />All</);
  assert.match(html, />Pending Review</);
});

test('resolveActiveStatusFilter normalizes chip selection', () => {
  assert.equal(resolveActiveStatusFilter(''), '');
  assert.equal(resolveActiveStatusFilter('approved'), 'approved');
  assert.equal(resolveActiveStatusFilter('bogus'), '');
});

test('buildQualityChecklistHtml renders pass and fail states', () => {
  const html = buildQualityChecklistHtml(
    { title: 'Car', price: 100, location: 'Ankara', description: 'Nice', attributes: { a: 1 }, images: [] },
    { ai_score: 70 }
  );
  assert.match(html, /ai-listings-admin__check--pass/);
  assert.match(html, /ai-listings-admin__check--fail/);
  assert.match(html, /6\/7 checks passed/);
});

test('getAvailableQaActions exposes actions per status', () => {
  assert.deepEqual(getAvailableQaActions('draft'), ['submit-review', 'archive', 'reanalyze']);
  assert.deepEqual(getAvailableQaActions('pending_review'), ['approve', 'reject', 'archive', 'reanalyze']);
  assert.deepEqual(getAvailableQaActions('archived'), []);
});

test('buildQaActionsHtml renders workflow buttons for pending_review', () => {
  const html = buildQaActionsHtml('pending_review');
  assert.match(html, /data-qa-action="approve"/);
  assert.match(html, /data-qa-action="reject"/);
  assert.doesNotMatch(html, /data-qa-action="submit-review"/);
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
