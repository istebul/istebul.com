import test from 'node:test';
import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

const SUPABASE_URL = 'https://istebul-test.supabase.co';
const SUPABASE_ANON_KEY = 'test-anon-key';

globalThis.window = {
  __env: {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  },
  __ibAiListings: {
    aiListingsPublicEnabled: true,
    loaded: true
  }
};

const calls = [];
let scenario = 'normal';

const listings = [
  {
    id: 'pub-1',
    category: 'vehicle',
    title: 'Toyota',
    status: 'published',
    updated_at: '2026-11-06T12:00:00Z',
    ai_listing_analyses: [
      { ai_score: 91, summary: 'Latest', created_at: '2026-11-06T12:00:00Z' },
      { ai_score: 70, summary: 'Older', created_at: '2026-11-06T10:00:00Z' }
    ]
  },
  {
    id: 'pub-2',
    category: 'vehicle',
    title: 'Honda',
    status: 'published',
    updated_at: '2026-11-06T11:00:00Z',
    ai_listing_analyses: [
      { ai_score: 84, summary: 'Second listing', created_at: '2026-11-06T11:00:00Z' }
    ]
  }
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

globalThis.fetch = async (input) => {
  const rawUrl = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  const url = new URL(rawUrl);
  calls.push({ url });

  if (url.pathname.endsWith('/rest/v1/site_settings')) {
    return jsonResponse([{ key: 'ai_listings_public_enabled', value: 'true' }]);
  }

  if (url.pathname.endsWith('/rest/v1/ai_listings')) {
    if (scenario === 'direct-error') {
      return jsonResponse({ message: 'Direct read unavailable' }, 500);
    }
    return jsonResponse(scenario === 'empty' ? [] : listings);
  }

  if (url.pathname.endsWith('/functions/v1/ai-listings/listings/public')) {
    return jsonResponse({
      data: {
        listings: [
          { id: 'edge-1', title: 'Edge fallback listing', category: 'vehicle', status: 'published' }
        ],
        count: 1
      }
    });
  }

  return jsonResponse({ message: `Unexpected request: ${url.pathname}` }, 500);
};

const { loadPublicAiListings } = await import('../../js/core/ai-listings-public-api.js');

test.after(() => {
  globalThis.fetch = originalFetch;

  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

test('public listings reads analyses in one batch query and selects the latest per listing', async () => {
  scenario = 'normal';
  calls.length = 0;

  globalThis.window.__ibAiListings = {
    aiListingsPublicEnabled: true,
    loaded: true
  };

  const result = await loadPublicAiListings();

  const listingCalls = calls.filter(({ url }) =>
    url.pathname.endsWith('/rest/v1/ai_listings')
  );

  assert.equal(listingCalls.length, 1);
  assert.equal(
    listingCalls[0].url.searchParams.get('ai_listing_analyses.limit'),
    '1'
  );
  assert.match(
    listingCalls[0].url.searchParams.get('select'),
    /ai_listing_analyses/
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].latest_analysis.ai_score, 91);
  assert.equal(result[0].latest_analysis.summary, 'Latest');
  assert.equal(result[1].latest_analysis.ai_score, 84);
});

test('successful empty direct result does not call the Edge fallback', async () => {
  scenario = 'empty';
  calls.length = 0;

  globalThis.window.__ibAiListings = {
    aiListingsPublicEnabled: true,
    loaded: true
  };

  const result = await loadPublicAiListings({
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  });

  assert.deepEqual(result, []);

  assert.equal(
    calls.filter(({ url }) =>
      url.pathname.endsWith('/functions/v1/ai-listings/listings/public')
    ).length,
    0
  );

  assert.equal(
    calls.filter(({ url }) =>
      url.pathname.endsWith('/rest/v1/ai_listings')
    ).length,
    1
  );
});

test('direct listing query error falls back to the public Edge route', async () => {
  scenario = 'direct-error';
  calls.length = 0;

  globalThis.window.__ibAiListings = {
    aiListingsPublicEnabled: true,
    loaded: true
  };

  const result = await loadPublicAiListings({
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'edge-1');

  assert.equal(
    calls.filter(({ url }) =>
      url.pathname.endsWith('/functions/v1/ai-listings/listings/public')
    ).length,
    1
  );
});

test('loaded false bootstrap setting is reused without another settings request', async () => {
  scenario = 'normal';
  calls.length = 0;

  globalThis.window.__ibAiListings = {
    aiListingsPublicEnabled: false,
    loaded: true
  };

  const result = await loadPublicAiListings();

  assert.deepEqual(result, []);

  assert.equal(
    calls.filter(({ url }) =>
      url.pathname.endsWith('/rest/v1/site_settings')
    ).length,
    0
  );

  assert.equal(calls.length, 0);
});
