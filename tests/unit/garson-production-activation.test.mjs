import test from 'node:test';
import assert from 'node:assert/strict';

const { DEMO_RESTAURANT_ID } = await import('../../js/restoran/admin-management.js');

const {
  validateSupabaseEnvironment,
  validateWhatsAppEnvironment,
  validateOpenAIEnvironment,
  resolveProductionEnv
} = await import('../../js/restoran/production/environment-validator.js');

const { runProductionChecklist } = await import(
  '../../js/restoran/production/activation-checklist.js'
);

const { getProductionHealth } = await import('../../js/restoran/production/health-service.js');

const { bootstrapProduction } = await import('../../js/restoran/production/production-bootstrap.js');

const { generateDeploymentReport } = await import(
  '../../js/restoran/production/deployment-report.js'
);

const { activateProduction } = await import('../../js/restoran/production/index.js');

const FULL_ENV = {
  SUPABASE_URL: 'https://demo.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key-demo',
  WHATSAPP_ACCESS_TOKEN: 'wa-token-demo',
  WHATSAPP_VERIFY_TOKEN: 'verify-token-demo',
  WHATSAPP_PHONE_NUMBER_ID: '1234567890',
  OPENAI_API_KEY: 'openai-key-demo',
  AI_PROVIDER: 'openai'
};

/**
 * @param {Record<string, { rows?: unknown[] }>} tables
 */
function createMockClient(tables = {}) {
  return {
    from(table) {
      const store = tables[table] || { rows: [] };
      const state = { filters: /** @type {Array<[string, string]>} */ ([]) };

      const applyFilters = (rows) =>
        rows.filter((row) => {
          const record = /** @type {Record<string, unknown>} */ (row);
          return state.filters.every(([column, value]) => String(record[column] ?? '') === value);
        });

      const query = {
        select() {
          return query;
        },
        eq(column, value) {
          state.filters.push([column, String(value)]);
          return query;
        },
        limit() {
          return query;
        },
        maybeSingle: async () => {
          const rows = applyFilters(store.rows);
          return { data: rows[0] ?? null, error: null };
        },
        then(resolve) {
          const rows = applyFilters(store.rows);
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        }
      };

      return query;
    },
    channel() {
      return {
        on() {
          return this;
        },
        subscribe(callback) {
          callback?.('SUBSCRIBED');
          return this;
        }
      };
    },
    removeChannel: async () => {}
  };
}

test('resolveProductionEnv merges overrides for tests', () => {
  const env = resolveProductionEnv({ env: { SUPABASE_URL: 'https://override.test' } });
  assert.equal(env.SUPABASE_URL, 'https://override.test');
});

test('validateSupabaseEnvironment reports missing keys', () => {
  const missing = validateSupabaseEnvironment({ env: {} });
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missing, ['SUPABASE_URL', 'SUPABASE_ANON_KEY']);

  const ok = validateSupabaseEnvironment({
    env: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'key' }
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.missing, []);
});

test('validateWhatsAppEnvironment reports missing WhatsApp keys', () => {
  const missing = validateWhatsAppEnvironment({ env: {} });
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missing, [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_VERIFY_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID'
  ]);

  const ok = validateWhatsAppEnvironment({
    env: {
      WHATSAPP_ACCESS_TOKEN: 'token',
      WHATSAPP_VERIFY_TOKEN: 'verify',
      WHATSAPP_PHONE_NUMBER_ID: '123'
    }
  });
  assert.equal(ok.ok, true);
});

test('validateOpenAIEnvironment accepts groq provider key', () => {
  const groqMissing = validateOpenAIEnvironment({ env: { AI_PROVIDER: 'groq' } });
  assert.equal(groqMissing.ok, false);
  assert.deepEqual(groqMissing.missing, ['GROQ_API_KEY']);

  const groqOk = validateOpenAIEnvironment({
    env: { AI_PROVIDER: 'groq', GROQ_API_KEY: 'groq-key' }
  });
  assert.equal(groqOk.ok, true);

  const openAiMissing = validateOpenAIEnvironment({ env: { AI_PROVIDER: 'openai' } });
  assert.equal(openAiMissing.ok, false);
  assert.deepEqual(openAiMissing.missing, ['OPENAI_API_KEY']);
});

test('runProductionChecklist validates all production gates', async () => {
  const client = createMockClient({
    restaurants: {
      rows: [
        {
          id: DEMO_RESTAURANT_ID,
          name: 'Demo Cafe',
          slug: 'demo-cafe',
          status: 'active',
          plan: 'starter'
        }
      ]
    }
  });

  const result = await runProductionChecklist({
    env: FULL_ENV,
    client,
    restaurantId: DEMO_RESTAURANT_ID,
    rlsEnabled: true
  });

  assert.equal(result.ok, true);
  assert.equal(result.checks.supabaseConnection.ok, true);
  assert.equal(result.checks.realtime.ok, true);
  assert.equal(result.checks.rls.ok, true);
  assert.equal(result.checks.whatsappToken.ok, true);
  assert.equal(result.checks.verifyToken.ok, true);
  assert.equal(result.checks.phoneNumberId.ok, true);
  assert.equal(result.checks.openAi.ok, true);
  assert.equal(result.checks.repositoryAccess.ok, true);
  assert.deepEqual(result.missing, []);
});

test('runProductionChecklist collects missing items when env incomplete', async () => {
  const client = createMockClient({ restaurants: { rows: [] } });

  const result = await runProductionChecklist({
    env: { SUPABASE_URL: 'https://demo.supabase.co' },
    client,
    restaurantId: DEMO_RESTAURANT_ID
  });

  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('SUPABASE_ANON_KEY'));
  assert.ok(result.missing.includes('WHATSAPP_ACCESS_TOKEN'));
  assert.ok(result.missing.includes('OPENAI_API_KEY') || result.missing.includes('GROQ_API_KEY'));
});

test('getProductionHealth returns overallStatus healthy when all systems pass', async () => {
  const client = createMockClient({
    restaurants: {
      rows: [{ id: DEMO_RESTAURANT_ID, name: 'Demo', slug: 'demo', status: 'active', plan: 'starter' }]
    }
  });

  const health = await getProductionHealth({
    env: FULL_ENV,
    client,
    restaurantId: DEMO_RESTAURANT_ID,
    rlsEnabled: true
  });

  assert.equal(health.database.status, 'healthy');
  assert.equal(health.realtime.status, 'healthy');
  assert.equal(health.whatsapp.status, 'healthy');
  assert.equal(health.ai.status, 'healthy');
  assert.equal(health.overallStatus, 'healthy');
});

test('getProductionHealth returns warning when optional systems are missing', async () => {
  const client = createMockClient({
    restaurants: {
      rows: [{ id: DEMO_RESTAURANT_ID, name: 'Demo', slug: 'demo', status: 'active', plan: 'starter' }]
    }
  });

  const health = await getProductionHealth({
    env: {
      SUPABASE_URL: 'https://demo.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      AI_PROVIDER: 'openai'
    },
    client,
    restaurantId: DEMO_RESTAURANT_ID,
    rlsEnabled: true
  });

  assert.equal(health.database.status, 'healthy');
  assert.equal(health.whatsapp.status, 'warning');
  assert.equal(health.ai.status, 'warning');
  assert.equal(health.overallStatus, 'warning');
});

test('getProductionHealth returns critical when database is unavailable', async () => {
  const health = await getProductionHealth({
    env: {},
    client: { from: () => ({ select: () => ({ limit: () => ({ then: (r) => r({ data: null, error: { message: 'fail' } }) }) }) }) },
    restaurantId: DEMO_RESTAURANT_ID
  });

  assert.equal(health.database.status, 'critical');
  assert.equal(health.overallStatus, 'critical');
});

test('bootstrapProduction runs steps in order', async () => {
  const client = createMockClient({
    restaurants: {
      rows: [{ id: DEMO_RESTAURANT_ID, name: 'Demo', slug: 'demo', status: 'active', plan: 'starter' }]
    },
    orders: { rows: [] },
    menu_items: { rows: [] },
    customers: { rows: [] }
  });

  const result = await bootstrapProduction({
    env: FULL_ENV,
    client,
    restaurantId: DEMO_RESTAURANT_ID,
    rlsEnabled: true
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.steps.map((step) => step.name),
    ['environment', 'database', 'realtime', 'whatsapp', 'ai', 'dashboard']
  );
  assert.ok(result.steps.every((step) => step.ok));
});

test('generateDeploymentReport produces Turkish checklist output', () => {
  const report = generateDeploymentReport({
    checklist: {
      ok: false,
      missing: ['OPENAI_API_KEY'],
      checks: {
        supabaseConnection: { ok: true, label: 'Supabase bağlantısı' },
        realtime: { ok: true, label: 'Realtime' },
        rls: { ok: true, label: 'RLS' },
        whatsappToken: { ok: true, label: 'WhatsApp token' },
        verifyToken: { ok: true, label: 'Verify token' },
        phoneNumberId: { ok: true, label: 'Phone Number ID' },
        openAi: { ok: false, label: 'OpenAI API' },
        repositoryAccess: { ok: true, label: 'Repository erişimi' }
      }
    },
    health: {
      overallStatus: 'warning',
      database: { status: 'healthy' },
      realtime: { status: 'healthy' },
      whatsapp: { status: 'healthy' },
      ai: { status: 'warning' }
    }
  });

  assert.match(report, /✓ Supabase bağlantısı başarılı/);
  assert.match(report, /✓ WhatsApp hazır/);
  assert.match(report, /✓ Realtime aktif/);
  assert.match(report, /⚠ OpenAI anahtarı eksik/);
});

test('activateProduction orchestrates checklist, health, bootstrap and report', async () => {
  const client = createMockClient({
    restaurants: {
      rows: [{ id: DEMO_RESTAURANT_ID, name: 'Demo', slug: 'demo', status: 'active', plan: 'starter' }]
    },
    orders: { rows: [] },
    menu_items: { rows: [] },
    customers: { rows: [] }
  });

  const activation = await activateProduction({
    env: FULL_ENV,
    client,
    restaurantId: DEMO_RESTAURANT_ID,
    rlsEnabled: true
  });

  assert.equal(activation.ok, true);
  assert.ok(activation.checklist);
  assert.ok(activation.health);
  assert.ok(activation.bootstrap);
  assert.match(activation.report, /GarsonAI Production Activation/);
});
