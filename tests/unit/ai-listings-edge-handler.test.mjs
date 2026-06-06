import test from 'node:test';
import assert from 'node:assert/strict';

const { handleAiListingsRequest } = await import('../../supabase/functions/_shared/ai-listings/handler.js');
const { EDGE_ERROR_CODES } = await import('../../supabase/functions/_shared/ai-listings/errors.js');
const { SECRET_HEADER } = await import('../../supabase/functions/_shared/ai-listings/auth.js');

const SECRET = 'test-edge-secret';

function baseEnv(overrides = {}) {
  return {
    AI_LISTINGS_SUPABASE_ENABLED: 'true',
    AI_LISTINGS_EDGE_SECRET: SECRET,
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    ...overrides
  };
}

function request(method, path, { body, secret = SECRET } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (secret !== null) headers[SECRET_HEADER] = secret;
  return new Request(`https://example.supabase.co/functions/v1/ai-listings${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
}

function createMockRepos() {
  const listing = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    category: 'vehicle',
    title: 'Toyota',
    description: 'Clean',
    location: 'İstanbul',
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

  const events = [];
  const analyses = [];

  return {
    async createListing(input) {
      return { ...listing, ...input, id: listing.id };
    },
    async getListingById(id) {
      return id === listing.id ? listing : null;
    },
    async updateListing(id, patch) {
      if (id !== listing.id) throw { code: EDGE_ERROR_CODES.NOT_FOUND, message: 'Listing not found' };
      return { ...listing, ...patch };
    },
    async listListings() {
      return [listing];
    },
    async archiveListing(id) {
      if (id !== listing.id) throw { code: EDGE_ERROR_CODES.NOT_FOUND, message: 'Listing not found' };
      return { ...listing, status: 'archived' };
    },
    async createAnalysis(listingId, analysis) {
      const saved = {
        id: '660e8400-e29b-41d4-a716-446655440001',
        listing_id: listingId,
        ...analysis,
        analysis_version: 'v1-edge',
        created_at: '2026-06-06T11:00:00.000Z'
      };
      analyses.push(saved);
      return saved;
    },
    async getLatestAnalysis(listingId) {
      return analyses.filter((a) => a.listing_id === listingId).at(-1) ?? null;
    },
    async createEvent(input) {
      const event = {
        id: `evt-${events.length + 1}`,
        created_at: new Date().toISOString(),
        ...input
      };
      events.push(event);
      return event;
    },
    async listEventsByListingId(listingId) {
      return events.filter((e) => e.listing_id === listingId);
    },
    _events: events,
    _analyses: analyses,
    _listing: listing
  };
}

function handlerDeps(overrides = {}) {
  const repos = overrides.repos ?? createMockRepos();
  return {
    env: baseEnv(overrides.env),
    createServiceClient: () => ({}),
    createRepositories: () => repos,
    runAnalysis: overrides.runAnalysis,
    ...overrides
  };
}

test('unauthorized request returns 401', async () => {
  const res = await handleAiListingsRequest(request('GET', '/listings', { secret: 'wrong' }), handlerDeps());
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, EDGE_ERROR_CODES.UNAUTHORIZED);
});

test('disabled module returns 503', async () => {
  const res = await handleAiListingsRequest(
    request('GET', '/listings'),
    handlerDeps({ env: baseEnv({ AI_LISTINGS_SUPABASE_ENABLED: 'false' }) })
  );
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error.code, EDGE_ERROR_CODES.MODULE_DISABLED);
});

test('POST /listings rejects invalid URL in source_url', async () => {
  const res = await handleAiListingsRequest(
    request('POST', '/listings', {
      body: { category: 'vehicle', title: 'X', source_url: 'javascript:alert(1)' }
    }),
    handlerDeps()
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, EDGE_ERROR_CODES.INVALID_REQUEST);
});

test('POST /listings creates listing and listing_created event', async () => {
  const repos = createMockRepos();
  const res = await handleAiListingsRequest(
    request('POST', '/listings', {
      body: {
        category: 'vehicle',
        title: 'Toyota Corolla',
        price: 950000,
        source_url: 'https://example.com/car'
      }
    }),
    handlerDeps({ repos })
  );

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.listing.title, 'Toyota Corolla');
  assert.equal(repos._events.length, 1);
  assert.equal(repos._events[0].event_type, 'listing_created');
});

test('POST /listings/:id/analyze writes analysis and listing_analyzed event', async () => {
  const repos = createMockRepos();
  const listingId = repos._listing.id;

  const res = await handleAiListingsRequest(
    request('POST', `/listings/${listingId}/analyze`),
    handlerDeps({ repos })
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.data.analysis);
  assert.equal(repos._analyses.length, 1);
  assert.equal(repos._events.at(-1).event_type, 'listing_analyzed');
});

test('POST /listings/:id/archive sets archived status', async () => {
  const repos = createMockRepos();
  const listingId = repos._listing.id;

  const res = await handleAiListingsRequest(
    request('POST', `/listings/${listingId}/archive`),
    handlerDeps({ repos })
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.listing.status, 'archived');
  assert.equal(repos._events.at(-1).event_type, 'listing_archived');
});

test('GET /listings/:id returns listing with latest analysis', async () => {
  const repos = createMockRepos();
  const listingId = repos._listing.id;
  await repos.createAnalysis(listingId, {
    ai_score: 80,
    risk_score: 20,
    market_score: 0,
    price_score: 40,
    confidence: 0.7,
    summary: 'Test',
    pros: [],
    cons: [],
    tags: []
  });

  const res = await handleAiListingsRequest(
    request('GET', `/listings/${listingId}`),
    handlerDeps({ repos })
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.listing.id, listingId);
  assert.equal(body.data.latest_analysis.ai_score, 80);
});

test('GET /listings/:id/events lists events', async () => {
  const repos = createMockRepos();
  const listingId = repos._listing.id;
  await repos.createEvent({ listing_id: listingId, event_type: 'listing_created', payload: {} });

  const res = await handleAiListingsRequest(
    request('GET', `/listings/${listingId}/events`),
    handlerDeps({ repos })
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.events.length, 1);
});
