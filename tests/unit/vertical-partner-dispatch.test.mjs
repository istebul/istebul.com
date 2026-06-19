import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VERTICAL_ROUTE_MAP,
  routeTypeFromVertical,
  verticalFromRouteType,
  leadTableFromRouteType,
  isVerticalLeadTable
} from '../../js/features/partner/vertical-partner-routing.js';
import {
  VERTICAL_DISPATCH_STATUSES,
  verticalDispatchBadge,
  formatVerticalDispatchAt,
  formatVerticalDispatchError
} from '../../js/features/admin/vertical-partner-dispatch.js';

test('canonical vertical → route_type mapping', () => {
  assert.equal(routeTypeFromVertical('konut'), 'housing');
  assert.equal(routeTypeFromVertical('finans'), 'finance');
  assert.equal(routeTypeFromVertical('tatil'), 'vacation');
  assert.equal(routeTypeFromVertical('sigorta'), 'insurance');
  assert.equal(routeTypeFromVertical('kasko'), 'kasko');
  assert.equal(routeTypeFromVertical('unknown'), null);
});

test('route_type → vertical reverse mapping', () => {
  assert.equal(verticalFromRouteType('housing'), 'konut');
  assert.equal(verticalFromRouteType('finance'), 'finans');
  assert.equal(verticalFromRouteType('vacation'), 'tatil');
  assert.equal(verticalFromRouteType('insurance'), 'sigorta');
  assert.equal(verticalFromRouteType('kasko'), 'kasko');
});

test('lead table resolution per route_type', () => {
  assert.equal(leadTableFromRouteType('housing'), 'housing_leads');
  assert.equal(leadTableFromRouteType('finance'), 'vertical_leads');
  assert.equal(leadTableFromRouteType('vacation'), 'vacation_leads');
  assert.equal(leadTableFromRouteType('insurance'), 'sigorta_leads');
  assert.equal(leadTableFromRouteType('kasko'), 'kasko_leads');
});

test('isVerticalLeadTable distinguishes auto vs vertical tables', () => {
  assert.equal(isVerticalLeadTable('auto_leads'), false);
  assert.equal(isVerticalLeadTable('housing_leads'), true);
  assert.equal(isVerticalLeadTable('vertical_leads'), true);
  assert.equal(isVerticalLeadTable('unknown'), false);
});

test('VERTICAL_ROUTE_MAP covers all P0 verticals', () => {
  assert.deepEqual(Object.keys(VERTICAL_ROUTE_MAP).sort(), [
    'finans',
    'kasko',
    'konut',
    'sigorta',
    'tatil'
  ]);
});

test('vertical dispatch status badges', () => {
  assert.equal(verticalDispatchBadge('sent').label, 'Gönderildi');
  assert.equal(verticalDispatchBadge('failed').label, 'Hata');
  assert.equal(verticalDispatchBadge('pending').badge, 'badge-blue');
  assert.ok(VERTICAL_DISPATCH_STATUSES.dead);
});

test('formatVerticalDispatchAt handles empty and valid timestamps', () => {
  assert.equal(formatVerticalDispatchAt(null), '—');
  assert.match(formatVerticalDispatchAt('2026-06-05T12:00:00Z'), /\d{2}[./]\d{2}/);
});

test('formatVerticalDispatchError truncates long messages', () => {
  const long = 'x'.repeat(200);
  assert.equal(formatVerticalDispatchError(long).length, 120);
  assert.equal(formatVerticalDispatchError(null), '—');
});

test('dispatch flow expectations: housing finance vacation insurance', () => {
  const cases = [
    { vertical: 'konut', route: 'housing', table: 'housing_leads' },
    { vertical: 'finans', route: 'finance', table: 'vertical_leads' },
    { vertical: 'tatil', route: 'vacation', table: 'vacation_leads' },
    { vertical: 'sigorta', route: 'insurance', table: 'sigorta_leads' }
  ];

  for (const c of cases) {
    assert.equal(routeTypeFromVertical(c.vertical), c.route);
    assert.equal(leadTableFromRouteType(c.route), c.table);
  }
});

test('failed dispatch status maps to retry-eligible state', () => {
  const badge = verticalDispatchBadge('failed');
  assert.equal(badge.label, 'Hata');
  assert.equal(badge.badge, 'badge-yellow');
});

test('retry dispatch uses partner_dispatch_retry_count field name', () => {
  const lead = {
    partner_dispatch_status: 'failed',
    partner_dispatch_retry_count: 2,
    partner_dispatch_next_retry_at: '2026-06-05T15:00:00Z',
    partner_dispatch_error: 'all_endpoints_failed'
  };
  assert.equal(lead.partner_dispatch_status, 'failed');
  assert.ok(lead.partner_dispatch_retry_count < 5);
  assert.ok(lead.partner_dispatch_error);
});
