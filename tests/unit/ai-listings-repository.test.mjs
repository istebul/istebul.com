import test from 'node:test';
import assert from 'node:assert/strict';

const {
  isAiListingsSupabaseAdapterEnabled,
  setAiListingsSupabaseLocalOverride,
  clearAiListingsSupabaseLocalOverride,
  createAiListingsRepositories,
  createSupabaseAiListingsRepositories,
  resolveRepositoryBackend,
  createSupabaseAiListingRepository,
  createSupabaseAiAnalysisRepository,
  createSupabaseAiListingEventRepository,
  createEmptyListing,
  createEmptyAIAnalysis,
  AI_LISTINGS_REPOSITORY_DISABLED,
  AI_LISTINGS_SUPABASE_CONFIG_MISSING,
  AI_LISTINGS_RECORD_NOT_FOUND,
  AiListingsRepositoryError
} = await import('../../src/ai-listings/index.js');

/**
 * @param {Record<string, (state: MockQueryState) => { data: unknown, error: { code?: string, message?: string }|null }>} tableHandlers
 */
function createMockSupabaseClient(tableHandlers) {
  /** @type {MockQueryState[]} */
  const calls = [];

  /**
   * @param {string} table
   */
  function from(table) {
    /** @type {MockQueryState} */
    const state = {
      table,
      op: 'select',
      filters: [],
      order: null,
      limit: null,
      range: null,
      row: null,
      patch: null,
      maybeSingle: false
    };

    const builder = {
      select() {
        state.op = state.op === 'select' ? 'select' : state.op;
        return builder;
      },
      insert(row) {
        state.op = 'insert';
        state.row = row;
        return builder;
      },
      update(patch) {
        state.op = 'update';
        state.patch = patch;
        return builder;
      },
      delete() {
        state.op = 'delete';
        return builder;
      },
      eq(col, val) {
        state.filters.push({ col, val });
        return builder;
      },
      order(col, opts) {
        state.order = { col, ascending: opts?.ascending !== false };
        return builder;
      },
      limit(n) {
        state.limit = n;
        return builder;
      },
      range(fromIdx, toIdx) {
        state.range = { from: fromIdx, to: toIdx };
        return builder;
      },
      single() {
        return execute(state);
      },
      maybeSingle() {
        state.maybeSingle = true;
        return execute(state);
      },
      then(resolve, reject) {
        return execute(state).then(resolve, reject);
      }
    };

    /**
     * @param {MockQueryState} queryState
     */
    async function execute(queryState) {
      calls.push({ ...queryState, filters: [...queryState.filters] });
      const handler = tableHandlers[queryState.table];
      if (!handler) {
        return { data: null, error: { message: 'unknown table' } };
      }
      return handler(queryState);
    }

    return builder;
  }

  return { from, calls };
}

/** @typedef {Object} MockQueryState
 * @property {string} table
 * @property {string} op
 * @property {{ col: string, val: unknown }[]} filters
 * @property {{ col: string, ascending: boolean }|null} order
 * @property {number|null} limit
 * @property {{ from: number, to: number }|null} range
 * @property {unknown} row
 * @property {unknown} patch
 * @property {boolean} maybeSingle
 */

const LISTING_ROW = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  category: 'vehicle',
  title: 'Toyota Corolla',
  description: 'Clean car',
  location: { label: 'İstanbul' },
  price: 950000,
  currency: 'TRY',
  images: [],
  attributes: {},
  status: 'draft',
  source_type: 'manual',
  source_url: null,
  owner_user_id: null,
  created_at: '2026-06-06T10:00:00.000Z',
  updated_at: '2026-06-06T10:00:00.000Z'
};

const ANALYSIS_ROW = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  listing_id: LISTING_ROW.id,
  ai_score: 82,
  risk_score: 18,
  market_score: 70,
  price_score: 75,
  confidence: 0.9,
  summary: 'Strong listing',
  pros: ['Fair price'],
  cons: [],
  tags: ['vehicle'],
  analysis_version: 'v1',
  created_at: '2026-06-06T11:00:00.000Z'
};

test('factory returns in-memory backend by default', () => {
  clearAiListingsSupabaseLocalOverride();
  const repos = createAiListingsRepositories();
  assert.equal(repos.backend, 'in-memory');
  assert.equal(repos.eventRepository, null);
  assert.equal(resolveRepositoryBackend(), 'in-memory');
});

test('factory rejects Supabase mode without client when explicitly required', () => {
  setAiListingsSupabaseLocalOverride(true);
  assert.throws(
    () => createSupabaseAiListingsRepositories(),
    (err) => err instanceof AiListingsRepositoryError && err.code === AI_LISTINGS_SUPABASE_CONFIG_MISSING
  );
  clearAiListingsSupabaseLocalOverride();
});

test('factory rejects Supabase when adapter disabled', () => {
  clearAiListingsSupabaseLocalOverride();
  const mock = createMockSupabaseClient({});
  assert.throws(
    () => createSupabaseAiListingsRepositories({ client: mock }),
    (err) => err instanceof AiListingsRepositoryError && err.code === AI_LISTINGS_REPOSITORY_DISABLED
  );
});

test('factory returns Supabase repos when enabled with client', () => {
  setAiListingsSupabaseLocalOverride(true);
  const mock = createMockSupabaseClient({});
  const repos = createAiListingsRepositories({ mode: 'supabase', client: mock });
  assert.equal(repos.backend, 'supabase');
  assert.ok(repos.eventRepository);
  clearAiListingsSupabaseLocalOverride();
});

test('Supabase listing repository create inserts row', async () => {
  setAiListingsSupabaseLocalOverride(true);
  const mock = createMockSupabaseClient({
    ai_listings(state) {
      if (state.op === 'insert') {
        return { data: { ...LISTING_ROW, ...state.row, id: LISTING_ROW.id }, error: null };
      }
      return { data: null, error: { message: 'unexpected' } };
    }
  });

  const repo = createSupabaseAiListingRepository({ client: mock });
  const listing = await repo.create({
    category: 'vehicle',
    title: 'Toyota Corolla',
    location: 'İstanbul',
    price: 950000
  });

  assert.equal(listing.title, 'Toyota Corolla');
  assert.equal(listing.location, 'İstanbul');
  assert.equal(mock.calls[0].op, 'insert');
  clearAiListingsSupabaseLocalOverride();
});

test('Supabase listing repository getById returns null when not found', async () => {
  setAiListingsSupabaseLocalOverride(true);
  const mock = createMockSupabaseClient({
    ai_listings() {
      return { data: null, error: { code: 'PGRST116', message: 'not found' } };
    }
  });

  const repo = createSupabaseAiListingRepository({ client: mock });
  const result = await repo.getById('missing');
  assert.equal(result, null);
  clearAiListingsSupabaseLocalOverride();
});

test('Supabase listing repository list maps filters to query', async () => {
  setAiListingsSupabaseLocalOverride(true);
  const mock = createMockSupabaseClient({
    ai_listings(state) {
      return { data: [LISTING_ROW], error: null };
    }
  });

  const repo = createSupabaseAiListingRepository({ client: mock });
  const results = await repo.list({
    category: 'vehicle',
    status: 'draft',
    source_type: 'manual',
    owner_user_id: 'user-1',
    limit: 10,
    offset: 0
  });

  assert.equal(results.length, 1);
  const call = mock.calls[0];
  assert.deepEqual(
    call.filters,
    [
      { col: 'category', val: 'vehicle' },
      { col: 'status', val: 'draft' },
      { col: 'source_type', val: 'manual' },
      { col: 'owner_user_id', val: 'user-1' }
    ]
  );
  assert.equal(call.order?.col, 'created_at');
  assert.equal(call.order?.ascending, false);
  assert.deepEqual(call.range, { from: 0, to: 9 });
  clearAiListingsSupabaseLocalOverride();
});

test('Supabase listing repository archive sets status archived', async () => {
  setAiListingsSupabaseLocalOverride(true);
  const mock = createMockSupabaseClient({
    ai_listings(state) {
      if (state.op === 'update') {
        return {
          data: { ...LISTING_ROW, status: 'archived', updated_at: '2026-06-06T12:00:00.000Z' },
          error: null
        };
      }
      return { data: null, error: { message: 'unexpected' } };
    }
  });

  const repo = createSupabaseAiListingRepository({ client: mock });
  const archived = await repo.archive(LISTING_ROW.id);

  assert.equal(mock.calls[0].patch.status, 'archived');
  assert.ok(mock.calls[0].patch.updated_at);
  assert.equal(archived.id, LISTING_ROW.id);
  clearAiListingsSupabaseLocalOverride();
});

test('Supabase analysis repository getLatestByListingId orders desc limit 1', async () => {
  setAiListingsSupabaseLocalOverride(true);
  const mock = createMockSupabaseClient({
    ai_listing_analyses(state) {
      return { data: ANALYSIS_ROW, error: null };
    }
  });

  const repo = createSupabaseAiAnalysisRepository({ client: mock });
  const latest = await repo.getLatestByListingId(LISTING_ROW.id);

  assert.equal(latest?.analysis.ai_score, 82);
  const call = mock.calls[0];
  assert.equal(call.order?.col, 'created_at');
  assert.equal(call.order?.ascending, false);
  assert.equal(call.limit, 1);
  assert.equal(call.maybeSingle, true);
  clearAiListingsSupabaseLocalOverride();
});

test('Supabase analysis repository create and listByListingId', async () => {
  setAiListingsSupabaseLocalOverride(true);
  const mock = createMockSupabaseClient({
    ai_listing_analyses(state) {
      if (state.op === 'insert') {
        return { data: ANALYSIS_ROW, error: null };
      }
      if (state.op === 'select') {
        return { data: [ANALYSIS_ROW], error: null };
      }
      return { data: null, error: { message: 'unexpected' } };
    }
  });

  const repo = createSupabaseAiAnalysisRepository({ client: mock });
  const analysis = createEmptyAIAnalysis({ ai_score: 82, summary: 'Strong listing' });
  const created = await repo.create({ listing_id: LISTING_ROW.id, analysis });
  assert.equal(created.analysis.ai_score, 82);

  const list = await repo.listByListingId(LISTING_ROW.id);
  assert.equal(list.length, 1);
  clearAiListingsSupabaseLocalOverride();
});

test('Supabase event repository creates and lists events', async () => {
  setAiListingsSupabaseLocalOverride(true);
  const eventRow = {
    id: '770e8400-e29b-41d4-a716-446655440002',
    listing_id: LISTING_ROW.id,
    event_type: 'created',
    payload: { source: 'test' },
    created_at: '2026-06-06T10:05:00.000Z'
  };

  const mock = createMockSupabaseClient({
    ai_listing_events(state) {
      if (state.op === 'insert') {
        return { data: eventRow, error: null };
      }
      if (state.op === 'select' && state.filters.some((f) => f.col === 'listing_id')) {
        return { data: [eventRow], error: null };
      }
      if (state.op === 'select' && state.filters.some((f) => f.col === 'event_type')) {
        return { data: [eventRow], error: null };
      }
      return { data: [], error: null };
    }
  });

  const repo = createSupabaseAiListingEventRepository({ client: mock });
  const created = await repo.create({
    listing_id: LISTING_ROW.id,
    event_type: 'created',
    payload: { source: 'test' }
  });
  assert.equal(created.event_type, 'created');

  const byListing = await repo.listByListingId(LISTING_ROW.id);
  assert.equal(byListing.length, 1);

  const byType = await repo.listByType('created');
  assert.equal(byType.length, 1);
  clearAiListingsSupabaseLocalOverride();
});

test('repository maps DB errors without leaking raw Supabase messages as primary code', async () => {
  setAiListingsSupabaseLocalOverride(true);
  const mock = createMockSupabaseClient({
    ai_listings() {
      return { data: null, error: { code: 'XX000', message: 'raw internal db failure' } };
    }
  });

  const repo = createSupabaseAiListingRepository({ client: mock });
  await assert.rejects(repo.getById(LISTING_ROW.id), (err) => {
    assert.ok(err instanceof AiListingsRepositoryError);
    assert.equal(err.code, 'AI_LISTINGS_DB_ERROR');
    assert.equal(err.message, 'Database operation failed');
    return true;
  });
  clearAiListingsSupabaseLocalOverride();
});

test('repository throws RECORD_NOT_FOUND for missing update target', async () => {
  setAiListingsSupabaseLocalOverride(true);
  const mock = createMockSupabaseClient({
    ai_listings(state) {
      if (state.op === 'update') {
        return { data: null, error: { code: 'PGRST116', message: 'not found' } };
      }
      return { data: null, error: { code: 'PGRST116' } };
    }
  });

  const repo = createSupabaseAiListingRepository({ client: mock });
  await assert.rejects(repo.update(LISTING_ROW.id, { title: 'New title' }), (err) => {
    assert.equal(err.code, AI_LISTINGS_RECORD_NOT_FOUND);
    return true;
  });
  clearAiListingsSupabaseLocalOverride();
});

test('Supabase adapter disabled by default', () => {
  clearAiListingsSupabaseLocalOverride();
  assert.equal(isAiListingsSupabaseAdapterEnabled(), false);
});
