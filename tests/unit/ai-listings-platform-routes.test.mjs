import test from 'node:test';
import assert from 'node:assert/strict';

const { parseAiListingsRoute } = await import('../../supabase/functions/_shared/ai-listings/router.js');
const {
  isListingPubliclyVisible,
  isPublicPublishEnabled,
  resolveStatusTransition,
  QA_ACTIONS
} = await import('../../supabase/functions/_shared/ai-listings/status-workflow.js');
const {
  validateLearningEventsBody,
  validateDataPoolBatchBody,
  validatePersonalizationBody
} = await import('../../supabase/functions/_shared/ai-listings/validation.js');
const { handleAiListingsRequest } = await import('../../supabase/functions/_shared/ai-listings/handler.js');
const { SECRET_HEADER } = await import('../../supabase/functions/_shared/ai-listings/auth.js');

const SECRET = 'platform-test-secret';

function baseEnv(overrides = {}) {
  return {
    AI_LISTINGS_SUPABASE_ENABLED: 'true',
    AI_LISTINGS_EDGE_SECRET: SECRET,
    AI_LISTINGS_PUBLIC_PUBLISH_ENABLED: 'true',
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

test('router parses learning, data-pool, and personalization resources', () => {
  assert.deepEqual(parseAiListingsRoute('/learning/events'), {
    resource: 'learning',
    id: 'events',
    action: null
  });
  assert.deepEqual(parseAiListingsRoute('/data-pool/batch'), {
    resource: 'data-pool',
    id: 'batch',
    action: null
  });
  assert.deepEqual(parseAiListingsRoute('/personalization/profile'), {
    resource: 'personalization',
    id: 'profile',
    action: null
  });
});

test('publish workflow transitions are explicit and separate from approval', () => {
  assert.deepEqual(resolveStatusTransition('approved', QA_ACTIONS.PUBLISH), {
    ok: true,
    nextStatus: 'published'
  });
  assert.deepEqual(resolveStatusTransition('published', QA_ACTIONS.UNPUBLISH), {
    ok: true,
    nextStatus: 'approved'
  });
  assert.equal(resolveStatusTransition('draft', QA_ACTIONS.PUBLISH).ok, false);
});

test('public visibility requires published status and feature flag', () => {
  assert.equal(isListingPubliclyVisible('approved', { AI_LISTINGS_PUBLIC_PUBLISH_ENABLED: 'true' }), false);
  assert.equal(isListingPubliclyVisible('published', { AI_LISTINGS_PUBLIC_PUBLISH_ENABLED: 'true' }), true);
  assert.equal(isListingPubliclyVisible('published', { AI_LISTINGS_PUBLIC_PUBLISH_ENABLED: 'false' }), false);
  assert.equal(isPublicPublishEnabled({ AI_LISTINGS_PUBLIC_PUBLISH_ENABLED: '1' }), true);
});

test('platform validators accept learning, data pool, and personalization payloads', () => {
  const learning = validateLearningEventsBody({
    events: [{ event_type: 'decision_center_viewed', module: 'decision_center' }]
  });
  assert.equal(learning.ok, true);

  const pool = validateDataPoolBatchBody({
    listings: [{ id: '1', title: 'Test', category: 'vehicle' }]
  });
  assert.equal(pool.ok, true);

  const personalization = validatePersonalizationBody({
    recommendation: { score: 80 },
    decisionResult: { label: 'buy' }
  });
  assert.equal(personalization.ok, true);
});

test('handler serves learning insights and personalization profile routes', async () => {
  const learningEvents = [];

  const repos = {
    async createLearningEvent(event) {
      const saved = { id: 'le-1', ...event, created_at: '2026-06-07T10:00:00.000Z' };
      learningEvents.push(saved);
      return saved;
    },
    async listLearningEvents() {
      return learningEvents;
    },
    async listListings() {
      return [];
    }
  };

  const ingest = await handleAiListingsRequest(request('POST', '/learning/events', {
    body: {
      events: [{ event_type: 'report_viewed', module: 'report' }]
    }
  }), {
    env: baseEnv(),
    createServiceClient: () => ({}),
    createRepositories: () => repos
  });
  assert.equal(ingest.status, 201);

  const insights = await handleAiListingsRequest(request('GET', '/learning/insights'), {
    env: baseEnv(),
    createServiceClient: () => ({}),
    createRepositories: () => repos
  });
  assert.equal(insights.status, 200);

  const personalization = await handleAiListingsRequest(request('POST', '/personalization/profile', {
    body: {
      recommendation: { factors: [{ key: 'risk', weight: 0.5 }] },
      decisionResult: { purchaseDecision: { score: 72 } }
    }
  }), {
    env: baseEnv(),
    createServiceClient: () => ({}),
    createRepositories: () => repos
  });
  assert.equal(personalization.status, 200);
});

test('public listings route works without secret when publish flag is enabled', async () => {
  const repos = {
    async listListings() {
      return [
        {
          id: 'pub-1',
          category: 'vehicle',
          title: 'Published Car',
          description: '',
          location: 'İstanbul',
          price: 1000000,
          currency: 'TRY',
          images: [],
          attributes: {},
          status: 'published',
          source_type: 'manual',
          source_url: null,
          owner_user_id: null,
          created_at: '2026-06-07T10:00:00.000Z',
          updated_at: '2026-06-07T10:00:00.000Z'
        }
      ];
    },
    async getLatestAnalysis() {
      return { ai_score: 80, summary: 'Good' };
    }
  };

  const response = await handleAiListingsRequest(request('GET', '/listings/public', { secret: null }), {
    env: baseEnv(),
    createServiceClient: () => ({}),
    createRepositories: () => repos
  });

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.data.count, 1);
  assert.equal(json.data.listings[0].status, 'published');
});
