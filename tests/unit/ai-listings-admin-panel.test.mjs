import test from 'node:test';
import assert from 'node:assert/strict';

const {
  ADMIN_ENABLE_KEY,
  ADMIN_SECRET_KEY,
  isAdminPanelEnabled,
  getAdminPanelState,
  getEdgeSecret,
  buildEdgeRequestHeaders,
  buildListingBadgesHtml,
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

test('buildEdgeRequestHeaders includes secret header', () => {
  const headers = buildEdgeRequestHeaders('abc123');
  assert.equal(headers[EDGE_SECRET_HEADER], 'abc123');
  assert.equal(headers['Content-Type'], 'application/json');
});

test('buildEdgeRequestHeaders never hardcodes secret', () => {
  const headers = buildEdgeRequestHeaders('');
  assert.equal(headers[EDGE_SECRET_HEADER], undefined);
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
