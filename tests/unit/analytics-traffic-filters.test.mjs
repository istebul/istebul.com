import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_DATA_MODES,
  filterAnalyticsRows,
  rowIsInternal
} from '../../js/admin/analytics-traffic-filters.js';

describe('analytics-traffic-filters', () => {
  const cleanStart = '2026-06-01T00:00:00.000Z';

  it('excludes internal rows in real mode', () => {
    const rows = [
      { event_name: 'page_view', is_internal: false, traffic_type: 'real_user', created_at: '2026-06-02T10:00:00.000Z' },
      { event_name: 'page_view', is_internal: true, traffic_type: 'internal', created_at: '2026-06-02T11:00:00.000Z' }
    ];
    const out = filterAnalyticsRows(rows, ANALYTICS_DATA_MODES.REAL, cleanStart);
    assert.equal(out.length, 1);
    assert.equal(out[0].is_internal, false);
  });

  it('returns only internal rows in internal mode', () => {
    const rows = [
      { event_name: 'a', is_internal: false, traffic_type: 'real_user', created_at: '2026-06-02T10:00:00.000Z' },
      { event_name: 'b', is_internal: true, traffic_type: 'internal', created_at: '2026-06-02T11:00:00.000Z' }
    ];
    const out = filterAnalyticsRows(rows, ANALYTICS_DATA_MODES.INTERNAL, cleanStart);
    assert.equal(out.length, 1);
    assert.equal(out[0].event_name, 'b');
  });

  it('returns all rows in all mode without clean-start cutoff', () => {
    const rows = [
      { event_name: 'old', is_internal: true, traffic_type: 'internal', created_at: '2020-01-01T00:00:00.000Z' },
      { event_name: 'new', is_internal: false, traffic_type: 'real_user', created_at: '2026-06-02T10:00:00.000Z' }
    ];
    const out = filterAnalyticsRows(rows, ANALYTICS_DATA_MODES.ALL, cleanStart);
    assert.equal(out.length, 2);
  });

  it('applies clean start only when provided', () => {
    const rows = [
      { event_name: 'before', is_internal: false, traffic_type: 'real_user', created_at: '2020-01-01T00:00:00.000Z' },
      { event_name: 'after', is_internal: false, traffic_type: 'real_user', created_at: '2026-06-02T10:00:00.000Z' }
    ];
    const out = filterAnalyticsRows(rows, ANALYTICS_DATA_MODES.REAL, cleanStart);
    assert.equal(out.length, 1);
    assert.equal(out[0].event_name, 'after');
  });

  it('rowIsInternal reads properties fallback', () => {
    assert.equal(rowIsInternal({ properties: { is_internal: true } }), true);
  });
});
