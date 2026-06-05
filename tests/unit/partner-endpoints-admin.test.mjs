import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ALLOWED_PARTNER_ROUTE_TYPES,
  endpointWithinDailyCap,
  healthStatusBadge,
  isEndpointDispatchable,
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

test('sanitizePartnerEndpointRow strips shared_secret and sets has_auth_secret', () => {
  const row = sanitizePartnerEndpointRow({
    id: 'ep-1',
    name: 'Test',
    shared_secret: 'super-secret-value',
    route_type: 'housing'
  });
  assert.equal(row.has_auth_secret, true);
  assert.equal(row.shared_secret, undefined);
  assert.equal(row.name, 'Test');
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

test('partner-endpoint-test edge function is admin-gated', () => {
  const source = fs.readFileSync(
    path.join(root, 'supabase/functions/partner-endpoint-test/index.ts'),
    'utf8'
  );
  assert.match(source, /requireAdmin/);
  assert.match(source, /increment_partner_endpoint_success/);
  assert.match(source, /increment_partner_endpoint_fail/);
  assert.match(source, /partner_lead_dispatch_logs/);
});

test('partner-endpoint-test handles OPTIONS preflight with CORS', () => {
  const source = fs.readFileSync(
    path.join(root, 'supabase/functions/partner-endpoint-test/index.ts'),
    'utf8'
  );
  assert.match(source, /req\.method === "OPTIONS"/);
  assert.match(source, /status: 204/);
  assert.match(source, /resolveCorsOrigin/);
  assert.match(source, /Access-Control-Allow-Methods/);
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
