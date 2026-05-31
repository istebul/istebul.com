import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateFunnelDailyFromEvents,
  buildEventCategoryCounts
} from '../../js/admin/platform-analytics-screen.js';

describe('platform-analytics-screen', () => {
  it('aggregates funnel daily buckets from events', () => {
    const rows = [
      {
        created_at: '2026-05-01T10:00:00Z',
        funnel: 'auto',
        funnel_step: 'view',
        session_id: 's1'
      },
      {
        created_at: '2026-05-01T11:00:00Z',
        funnel: 'auto',
        funnel_step: 'view',
        session_id: 's2'
      },
      {
        created_at: '2026-05-02T09:00:00Z',
        funnel: 'auto',
        funnel_step: 'submit',
        session_id: 's1'
      }
    ];
    const out = aggregateFunnelDailyFromEvents(rows);
    assert.equal(out.length, 2);
    const viewDay = out.find((r) => r.funnel_step === 'view');
    assert.equal(viewDay.events, 2);
    assert.equal(viewDay.sessions, 2);
  });

  it('builds event_category distribution', () => {
    const counts = buildEventCategoryCounts([
      { event_category: 'growth' },
      { event_category: 'growth' },
      { event_category: 'auth' }
    ]);
    assert.deepEqual(counts, [
      ['growth', 2],
      ['auth', 1]
    ]);
  });
});
