import test from 'node:test';
import assert from 'node:assert/strict';

const { createEdgeRepositories } = await import(
  '../../supabase/functions/_shared/ai-listings/repositories.js'
);

test('public listing repository embeds only the latest analysis in one query', async () => {
  const calls = {
    orders: [],
    limits: []
  };

  const rows = [
    {
      id: 'pub-1',
      category: 'vehicle',
      title: 'Published Car',
      description: '',
      location: { label: 'İstanbul' },
      price: 1000000,
      currency: 'TRY',
      images: [],
      attributes: {},
      status: 'published',
      source_type: 'manual',
      source_url: null,
      owner_user_id: null,
      created_at: '2026-06-07T10:00:00.000Z',
      updated_at: '2026-06-07T10:00:00.000Z',
      ai_listing_analyses: [
        {
          id: 'analysis-1',
          listing_id: 'pub-1',
          ai_score: 88,
          risk_score: 12,
          market_score: 70,
          price_score: 90,
          confidence: 0.9,
          summary: 'Latest analysis',
          pros: [],
          cons: [],
          tags: [],
          analysis_version: 'v1',
          created_at: '2026-06-07T12:00:00.000Z'
        }
      ]
    }
  ];

  const query = {
    select(columns) {
      calls.select = columns;
      return this;
    },
    eq(column, value) {
      calls.filter = [column, value];
      return this;
    },
    order(column, options) {
      calls.orders.push([column, options]);
      return this;
    },
    range(from, to) {
      calls.range = [from, to];
      return this;
    },
    limit(count, options) {
      calls.limits.push([count, options]);
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    }
  };

  const client = {
    from(table) {
      calls.table = table;
      calls.fromCount = (calls.fromCount ?? 0) + 1;
      return query;
    }
  };

  const repos = createEdgeRepositories(client);
  const result = await repos.listPublishedListingsWithLatestAnalyses(100);

  assert.equal(calls.fromCount, 1);
  assert.equal(calls.table, 'ai_listings');
  assert.match(calls.select, /ai_listing_analyses\(/);
  assert.deepEqual(calls.filter, ['status', 'published']);
  assert.deepEqual(calls.range, [0, 99]);
  assert.deepEqual(calls.orders[1], [
    'created_at',
    { ascending: false, referencedTable: 'ai_listing_analyses' }
  ]);
  assert.deepEqual(calls.limits, [
    [1, { referencedTable: 'ai_listing_analyses' }]
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'pub-1');
  assert.equal(result[0].location, 'İstanbul');
  assert.equal(result[0].latest_analysis.ai_score, 88);
  assert.equal(result[0].latest_analysis.summary, 'Latest analysis');
});
