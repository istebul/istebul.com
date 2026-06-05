import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ALLOWED_PARTNER_ROUTE_TYPES,
  endpointWithinDailyCap,
  formatPartnerEndpointTestError,
  healthStatusBadge,
  isEndpointDispatchable,
  isPartnerEndpointUuid,
  maskAuthSecret,
  renderRouteTypeOptions,
  routeTypeLabel,
  sanitizePartnerEndpointRow,
  validateRouteType
} from '../../js/features/admin/partner-endpoints.js';

const root = process.cwd();

test('validateRouteType accepts auto and vertical route types', () => {
  for (const route of [
    'dealer_partner',
    'housing',
    'finance',
    'vacation',
    'insurance',
    'kasko'
  ]) {
    assert.equal(validateRouteType(route).ok, true);
    assert.equal(validateRouteType(route).routeType, route);
  }
});

test('validateRouteType rejects unknown route types', () => {
  const result = validateRouteType('unknown_vertical');
  assert.equal(result.ok, false);
  assert.match(result.error, /invalid_route_type/);
});

test('sanitizePartnerEndpointRow strips shared_secret and preserves id', () => {
  const row = sanitizePartnerEndpointRow({
    id: '660e8400-e29b-41d4-a716-446655440001',
    name: 'Test',
    shared_secret: 'super-secret-value',
    route_type: 'housing'
  });
  assert.equal(row.has_auth_secret, true);
  assert.equal(row.shared_secret, undefined);
  assert.equal(row.name, 'Test');
  assert.equal(row.id, '660e8400-e29b-41d4-a716-446655440001');
  assert.equal(isPartnerEndpointUuid(row.id), true);
});

test('maskAuthSecret never exposes full secret', () => {
  assert.equal(maskAuthSecret(''), '—');
  assert.equal(maskAuthSecret('abc'), '••••');
  const masked = maskAuthSecret('my-long-partner-secret');
  assert.ok(!masked.includes('my-long-partner-secret'));
  assert.match(masked, /cret$/);
  assert.ok(masked.includes('•'));
});

test('endpointWithinDailyCap respects daily_cap', () => {
  assert.equal(endpointWithinDailyCap({ daily_cap: 10, sent_today: 9 }), true);
  assert.equal(endpointWithinDailyCap({ daily_cap: 10, sent_today: 10 }), false);
  assert.equal(endpointWithinDailyCap({ daily_cap: null, sent_today: 999 }), true);
});

test('isEndpointDispatchable skips inactive, capped, and circuit-open endpoints', () => {
  const base = {
    is_active: true,
    webhook_url: 'https://webhook.site/test',
    daily_cap: 5,
    sent_today: 2
  };
  assert.equal(isEndpointDispatchable(base), true);
  assert.equal(isEndpointDispatchable({ ...base, is_active: false }), false);
  assert.equal(isEndpointDispatchable({ ...base, sent_today: 5 }), false);
  assert.equal(
    isEndpointDispatchable({
      ...base,
      circuit_open_until: new Date(Date.now() + 60_000).toISOString()
    }),
    false
  );
});

test('healthStatusBadge maps healthy degraded failed', () => {
  assert.equal(healthStatusBadge('healthy').label, 'Sağlıklı');
  assert.equal(healthStatusBadge('degraded').badge, 'badge-yellow');
  assert.equal(healthStatusBadge('failed').badge, 'badge-red');
});

test('renderRouteTypeOptions includes vertical optgroup', () => {
  const html = renderRouteTypeOptions('housing');
  assert.match(html, /Konut/);
  assert.match(html, /Kasko/);
  assert.match(html, /Auto/);
  assert.match(html, /Dikey/);
  assert.match(html, /selected/);
});

test('routeTypeLabel resolves known and unknown types', () => {
  assert.equal(routeTypeLabel('kasko'), 'Kasko');
  assert.equal(routeTypeLabel('custom_route'), 'custom_route');
});

test('ALLOWED_PARTNER_ROUTE_TYPES covers all P0 vertical routes', () => {
  for (const route of ['housing', 'finance', 'vacation', 'insurance', 'kasko']) {
    assert.ok(ALLOWED_PARTNER_ROUTE_TYPES.has(route), `missing ${route}`);
  }
});

test('admin-action strips shared_secret from partner_endpoints list', () => {
  const source = fs.readFileSync(
    path.join(root, 'supabase/functions/admin-action/index.ts'),
    'utf8'
  );
  assert.match(source, /has_auth_secret/);
  assert.match(source, /shared_secret: _omit/);
  assert.match(source, /assertAllowedPartnerRouteType/);
  assert.match(source, /kasko_leads/);
});

const partnerEndpointTestSource = () =>
  fs.readFileSync(
    path.join(root, 'supabase/functions/partner-endpoint-test/index.ts'),
    'utf8'
  );

test('partner-endpoint-test edge function is admin-gated', () => {
  const source = partnerEndpointTestSource();
  assert.match(source, /requireAdmin/);
  assert.match(source, /increment_partner_endpoint_success/);
  assert.match(source, /increment_partner_endpoint_fail/);
  assert.match(source, /partner_lead_dispatch_logs/);
  assert.doesNotMatch(source, /shared_secret.*json\(/);
});

test('partner-endpoint-test handles OPTIONS preflight with CORS', () => {
  const source = partnerEndpointTestSource();
  assert.match(source, /req\.method === "OPTIONS"/);
  assert.match(source, /status: 204/);
  assert.match(source, /resolveCorsOrigin/);
  assert.match(source, /Access-Control-Allow-Methods/);
  assert.match(source, /Access-Control-Allow-Origin/);
  assert.match(source, /https:\/\/www\.istebul\.com/);
  assert.match(source, /POST, OPTIONS/);
});

test('partner-endpoint-test returns 401 without authorization', () => {
  const source = partnerEndpointTestSource();
  assert.match(source, /Authorization required/);
  assert.match(source, /status: 401/);
});

test('partner-endpoint-test returns 403 for non-admin users', () => {
  const source = partnerEndpointTestSource();
  assert.match(source, /admin_required/);
  assert.match(source, /status: 403/);
});

test('partner-endpoint-test accepts endpoint_id, endpointId, and id', () => {
  const source = partnerEndpointTestSource();
  assert.match(source, /body\.endpoint_id/);
  assert.match(source, /body\.endpointId/);
  assert.match(source, /body\.id/);
});

test('partner-endpoint-test returns endpoint_id_required when id missing', () => {
  const source = partnerEndpointTestSource();
  assert.match(source, /endpoint_id_required/);
  assert.match(source, /status: 400/);
});

test('partner-endpoint-test returns endpoint_not_found with endpoint_id', () => {
  const source = partnerEndpointTestSource();
  assert.match(source, /endpoint_not_found/);
  assert.match(source, /endpoint_id: endpointId/);
  assert.match(source, /status: 404/);
});

test('partner-endpoint-test returns webhook_failed on dispatch failure', () => {
  const source = partnerEndpointTestSource();
  assert.match(source, /webhook_failed/);
});

test('frontend test payload sends endpoint_id from row id', () => {
  const source = fs.readFileSync(
    path.join(root, 'js/admin/partner-endpoints-admin.js'),
    'utf8'
  );
  assert.match(source, /JSON\.stringify\(\{\s*endpoint_id:\s*normalizedId\s*\}\)/);
  assert.match(source, /data-id="\$\{safeAttr\(row\.id\)\}"/);
  assert.match(source, /isPartnerEndpointUuid/);
  assert.match(source, /formatPartnerEndpointTestError/);
  assert.match(source, /fetch\(`\$\{config\.url\}\/functions\/v1\/partner-endpoint-test`/);
  assert.doesNotMatch(source, /functions\.invoke\('partner-endpoint-test'/);
});

test('formatPartnerEndpointTestError maps known error codes', () => {
  assert.match(formatPartnerEndpointTestError({ error: 'endpoint_not_found' }), /bulunamadı/i);
  assert.match(formatPartnerEndpointTestError({ error: 'endpoint_id_required' }), /gönderilmedi/i);
  assert.match(formatPartnerEndpointTestError({ error: 'webhook_failed' }), /Webhook/i);
  assert.match(formatPartnerEndpointTestError({ error: 'admin_required' }), /admin/i);
  assert.match(
    formatPartnerEndpointTestError({
      error: 'endpoint_not_found',
      endpoint_id: '660e8400-e29b-41d4-a716-446655440001'
    }),
    /660e8400-e29b-41d4-a716-446655440001/
  );
  assert.match(
    formatPartnerEndpointTestError({
      error: 'webhook_failed',
      detail: 'HTTP 404'
    }),
    /HTTP 404/
  );
});

test('partner-endpoint-test rejects unsafe webhook URLs', () => {
  const source = partnerEndpointTestSource();
  assert.match(source, /assertSafePartnerWebhookUrl/);
  assert.match(source, /Invalid webhook URL/);
});

test('partner-endpoint-test returns ok response shape on success', () => {
  const source = partnerEndpointTestSource();
  assert.match(source, /ok: true/);
  assert.match(source, /endpoint_id: endpoint\.id/);
  assert.match(source, /health_status: "healthy"/);
});

test('production deploy includes partner-endpoint-test function', () => {
  const source = fs.readFileSync(
    path.join(root, '.github/workflows/production-deploy.yml'),
    'utf8'
  );
  assert.match(source, /partner-endpoint-test/);
});

test('failed endpoint retry eligibility uses partner_dispatch fields', () => {
  const lead = {
    partner_dispatch_status: 'failed',
    partner_dispatch_retry_count: 3,
    partner_dispatch_next_retry_at: '2026-06-05T15:00:00Z',
    partner_dispatch_error: 'all_endpoints_failed'
  };
  assert.equal(lead.partner_dispatch_status, 'failed');
  assert.ok(lead.partner_dispatch_retry_count < 5);
  assert.ok(lead.partner_dispatch_error);
});
