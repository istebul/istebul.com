import test from 'node:test';
import assert from 'node:assert/strict';

const { DEMO_RESTAURANT_ID } = await import('../../js/restoran/admin-management.js');

const {
  loadAiProductionConfig,
  validateAiProductionEnvironment,
  getActivePrompt,
  getPromptByVersion,
  getPromptHistory,
  listPromptDefinitions,
  validateParsedMessage,
  validateJsonSchema,
  PARSED_MESSAGE_JSON_SCHEMA,
  applyStructuredOutputFallback,
  normalizeStructuredOutput,
  withAiTimeout,
  withAiRetry,
  computeAiBackoffMs,
  isRetryableAiError,
  runReliableAiOperation,
  buildAiFallbackResult,
  isUnknownIntent,
  calculateConfidenceScore,
  buildConfidenceMetadata,
  recordAiRequest,
  recordAiSuccess,
  recordAiFallback,
  recordAiRetry,
  recordAiTimeout,
  recordAiInvalidJson,
  getAiProductionMetrics,
  resetAiProductionMetrics,
  estimateTokenCount,
  recordAiCostUsage,
  getAiCostSummary,
  resetAiCostTracking,
  runGarsonAiProductionPipeline,
  PARSER_VERSION
} = await import('../../js/restoran/ai/production/index.js');

const TEST_ENV = {
  AI_PROVIDER: 'groq',
  GROQ_API_KEY: 'test-groq-key',
  GARSON_AI_MODEL: 'llama-3.3-70b-versatile',
  GARSON_AI_TIMEOUT_MS: '1500',
  GARSON_AI_MAX_RETRIES: '2'
};

const DEMO_MENU = [
  {
    id: 'cat-main',
    restaurant_id: DEMO_RESTAURANT_ID,
    name: 'Ana yemekler',
    items: [
      {
        id: 'item-kebap',
        restaurant_id: DEMO_RESTAURANT_ID,
        name: 'Adana kebap',
        price: 360,
        active: true
      }
    ]
  }
];

test('validateAiProductionEnvironment checks provider secrets', () => {
  const ok = validateAiProductionEnvironment({ env: TEST_ENV });
  assert.equal(ok.ok, true);

  const missing = validateAiProductionEnvironment({ env: {} });
  assert.equal(missing.ok, false);
  assert.ok(missing.missing.includes('GROQ_API_KEY'));
});

test('loadAiProductionConfig reads model timeout retry and temperature', () => {
  const config = loadAiProductionConfig({ env: TEST_ENV });
  assert.equal(config.provider, 'groq');
  assert.equal(config.model, 'llama-3.3-70b-versatile');
  assert.equal(config.timeoutMs, 1500);
  assert.equal(config.maxRetries, 2);
  assert.equal(config.parserVersion, PARSER_VERSION);
});

test('prompt registry exposes active and historical prompts', () => {
  const active = getActivePrompt('garson-whatsapp-order');
  assert.ok(active);
  assert.equal(active?.id, 'garson-whatsapp-order');
  assert.equal(active?.active, true);

  const history = getPromptHistory('garson-whatsapp-order');
  assert.ok(history.length >= 2);
  assert.ok(listPromptDefinitions().length >= 2);

  const old = getPromptByVersion('garson-whatsapp-order', '0.9.0');
  assert.equal(old?.active, false);
});

test('schema validation accepts valid parsed message', () => {
  const parsed = {
    intent: 'new_order',
    raw: '2 adana kebap gönder',
    items: [{ name: 'Adana kebap', quantity: 2 }]
  };

  const json = validateJsonSchema(PARSED_MESSAGE_JSON_SCHEMA, parsed);
  const zod = validateParsedMessage(parsed);

  assert.equal(json.ok, true);
  assert.equal(zod.ok, true);
  assert.equal(zod.data?.intent, 'new_order');
});

test('structured output fallback handles invalid AI payload safely', () => {
  const invalid = { intent: 'not-real', raw: '', items: [{ name: '', quantity: 0 }] };
  const result = applyStructuredOutputFallback(invalid);

  assert.equal(result.ok, false);
  assert.equal(result.data.intent, 'unknown');
  assert.deepEqual(result.data.items, []);
  assert.ok(result.fallbackReason);
});

test('normalizeStructuredOutput completes missing fields', () => {
  const result = normalizeStructuredOutput({ intent: 'new_order', items: [{ name: 'Lahmacun' }] });
  assert.equal(result.data.intent, 'new_order');
  assert.equal(result.data.items[0].quantity, 1);
});

test('withAiTimeout rejects long running operations', async () => {
  await assert.rejects(
    () =>
      withAiTimeout(
        () => new Promise((resolve) => setTimeout(resolve, 80)),
        20
      ),
    (error) => error instanceof Error && String(error.message).includes('zaman aşım')
  );
});

test('withAiRetry retries retryable AI errors', async () => {
  let attempts = 0;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => originalSetTimeout(fn, 0);

  try {
    const value = await withAiRetry(
      async () => {
        attempts += 1;
        if (attempts < 2) {
          const error = new Error('rate limit');
          /** @type {Record<string, unknown>} */ (error).code = 'rate_limit';
          throw error;
        }
        return 'ok';
      },
      { maxAttempts: 3 }
    );

    assert.equal(value, 'ok');
    assert.equal(attempts, 2);
    assert.equal(computeAiBackoffMs(2), 400);
    assert.equal(isRetryableAiError({ code: 'rate_limit' }), true);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('confidence metadata includes parser prompt and model versions', () => {
  const score = calculateConfidenceScore({
    intent: 'new_order',
    itemCount: 2,
    matchedCount: 2,
    unmatchedCount: 0
  });
  assert.ok(score > 0.7);

  const meta = buildConfidenceMetadata({
    intent: 'new_order',
    itemCount: 1,
    matchedCount: 1,
    parserVersion: PARSER_VERSION,
    promptVersion: '1.0.0',
    model: 'rule-based',
    provider: 'local'
  });

  assert.equal(meta.parserVersion, PARSER_VERSION);
  assert.equal(meta.promptVersion, '1.0.0');
  assert.equal(meta.model, 'rule-based');
});

test('monitoring tracks latency success fallback retry invalid json and timeout', () => {
  resetAiProductionMetrics();
  recordAiRequest();
  recordAiSuccess(120);
  recordAiFallback('unknown_intent');
  recordAiRetry();
  recordAiInvalidJson();
  recordAiTimeout();

  const { metrics, summary } = getAiProductionMetrics();
  assert.equal(metrics.totalRequests, 1);
  assert.equal(metrics.retryCount, 1);
  assert.equal(metrics.invalidJsonCount, 1);
  assert.equal(metrics.timeoutCount, 1);
  assert.equal(summary.averageLatencyMs, 120);
});

test('cost tracking estimates tokens and model usage', () => {
  resetAiCostTracking();
  const usage = recordAiCostUsage({
    model: 'rule-based',
    inputText: '2 adana kebap gönder',
    outputText: '{"intent":"new_order"}'
  });

  assert.ok(usage.inputTokens > 0);
  assert.ok(usage.outputTokens > 0);
  assert.equal(usage.totalTokens, usage.inputTokens + usage.outputTokens);
  assert.equal(estimateTokenCount('abcd'), 1);

  const summary = getAiCostSummary();
  assert.equal(summary.totalTokens, usage.totalTokens);
  assert.ok(summary.byModel['rule-based']);
});

test('runGarsonAiProductionPipeline builds order dto and kitchen handoff', async () => {
  resetAiProductionMetrics();
  resetAiCostTracking();

  const result = await runGarsonAiProductionPipeline(
    {
      message: '2 adana kebap gönder',
      restaurantId: DEMO_RESTAURANT_ID,
      menu: DEMO_MENU,
      customer: { phone: '+905551110001', name: 'Ayşe Demir' },
      env: TEST_ENV
    },
    { config: loadAiProductionConfig({ env: TEST_ENV }) }
  );

  assert.equal(result.ok, true);
  assert.equal(result.pipeline?.intent, 'new_order');
  assert.ok(result.orderDto);
  assert.equal(result.orderDto?.items[0]?.name, 'Adana kebap');
  assert.equal(result.orderDto?.total, 720);
  assert.ok(result.kitchen.queue.length >= 0);
  assert.ok(result.metadata.confidence > 0);
  assert.equal(result.metadata.parserVersion, PARSER_VERSION);
});

test('runGarsonAiProductionPipeline returns unknown intent fallback for empty message', async () => {
  const result = await runGarsonAiProductionPipeline({
    message: '   ',
    restaurantId: DEMO_RESTAURANT_ID,
    env: TEST_ENV
  });

  assert.equal(result.ok, false);
  assert.ok(result.fallback);
  assert.equal(isUnknownIntent(result.pipeline?.intent || 'unknown'), true);
});

test('buildAiFallbackResult marks fallback reason', () => {
  const fallback = buildAiFallbackResult('invalid_json', { intent: 'unknown', items: [] });
  assert.equal(fallback.fallback, true);
  assert.equal(fallback.fallbackReason, 'invalid_json');
});

test('runReliableAiOperation wraps parser execution with timeout budget', async () => {
  const value = await runReliableAiOperation(() => ({ intent: 'new_order' }), {
    timeoutMs: 1_000,
    maxRetries: 1
  });
  assert.equal(value.intent, 'new_order');
});
