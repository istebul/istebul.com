import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const { DEMO_RESTAURANT_ID } = await import('../../js/restoran/admin-management.js');

const {
  loadWhatsAppProductionConfig,
  validateWhatsAppProductionEnvironment,
  buildGraphEndpoint,
  computeExponentialBackoffMs,
  withRetry,
  isRetryableHttpStatus,
  verifyWebhookSignature,
  handleWebhookVerification,
  processWebhookPost,
  resolveRestaurantFromPhoneNumberId,
  extractRestaurantRoutesFromWebhook,
  buildWebhookEventKey,
  isDuplicateEvent,
  markEventProcessed,
  resetDuplicateEventStore,
  resetWhatsAppProductionMetrics,
  getWhatsAppProductionMetrics,
  WhatsAppCloudApiClient,
  runWhatsAppOrderPipeline,
  WhatsAppProductionWebhookError,
  WhatsAppWebhookError
} = await import('../../js/restoran/whatsapp/production/index.js');

const TEST_ENV = {
  WHATSAPP_ACCESS_TOKEN: 'test-access-token',
  WHATSAPP_VERIFY_TOKEN: 'garson-verify-token',
  WHATSAPP_PHONE_NUMBER_ID: '100200300',
  WHATSAPP_APP_SECRET: 'super-secret-app-key',
  GARSON_WHATSAPP_RESTAURANT_MAP: JSON.stringify({
    'phone-tenant-1': DEMO_RESTAURANT_ID
  })
};

function buildWebhookPayload(messageBody, messageId = 'wamid-100') {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'entry-1',
        changes: [
          {
            field: 'messages',
            value: {
              metadata: {
                phone_number_id: 'phone-tenant-1',
                restaurant_id: DEMO_RESTAURANT_ID
              },
              contacts: [
                {
                  wa_id: '905551110001',
                  profile: { name: 'Ayşe Demir' }
                }
              ],
              messages: [
                {
                  id: messageId,
                  from: '905551110001',
                  timestamp: '1720000000',
                  type: 'text',
                  text: { body: messageBody }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

function signBody(rawBody, secret) {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

test('validateWhatsAppProductionEnvironment checks required production secrets', () => {
  const ok = validateWhatsAppProductionEnvironment({ env: TEST_ENV });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.missing, []);

  const missing = validateWhatsAppProductionEnvironment({ env: {} });
  assert.equal(missing.ok, false);
  assert.ok(missing.missing.includes('WHATSAPP_APP_SECRET'));
});

test('loadWhatsAppProductionConfig reads token, phone id and restaurant map', () => {
  const config = loadWhatsAppProductionConfig({ env: TEST_ENV });
  assert.equal(config.accessToken, 'test-access-token');
  assert.equal(config.verifyToken, 'garson-verify-token');
  assert.equal(config.phoneNumberId, '100200300');
  assert.equal(config.restaurantMap['phone-tenant-1'], DEMO_RESTAURANT_ID);
  assert.match(buildGraphEndpoint('messages', config), /graph\.facebook\.com\/v[\d.]+\/100200300\/messages/);
});

test('handleWebhookVerification validates Meta subscription handshake', () => {
  const config = loadWhatsAppProductionConfig({ env: TEST_ENV });
  const ok = handleWebhookVerification(
    {
      mode: 'subscribe',
      verifyToken: 'garson-verify-token',
      challenge: 'challenge-123'
    },
    config
  );
  assert.equal(ok.status, 200);
  assert.equal(ok.body, 'challenge-123');

  assert.throws(
    () =>
      handleWebhookVerification(
        {
          mode: 'subscribe',
          verifyToken: 'wrong',
          challenge: 'challenge-123'
        },
        config
      ),
    (error) => error instanceof WhatsAppProductionWebhookError
  );
});

test('verifyWebhookSignature validates X-Hub-Signature-256', async () => {
  const body = JSON.stringify({ hello: 'dünya' });
  const signature = signBody(body, TEST_ENV.WHATSAPP_APP_SECRET);

  assert.equal(await verifyWebhookSignature(body, signature, TEST_ENV.WHATSAPP_APP_SECRET), true);
  assert.equal(await verifyWebhookSignature(body, 'sha256=deadbeef', TEST_ENV.WHATSAPP_APP_SECRET), false);
});

test('duplicate event protection skips already processed webhook messages', () => {
  resetDuplicateEventStore();
  const key = buildWebhookEventKey('wamid-dup', 'phone-tenant-1');

  assert.equal(isDuplicateEvent(key), false);
  assert.equal(markEventProcessed(key), true);
  assert.equal(isDuplicateEvent(key), true);
  assert.equal(markEventProcessed(key), false);
});

test('processWebhookPost rejects invalid signatures', async () => {
  resetDuplicateEventStore();
  const payload = buildWebhookPayload('merhaba');
  const rawBody = JSON.stringify(payload);

  await assert.rejects(
    () => processWebhookPost(rawBody, 'sha256=invalid', { env: TEST_ENV, skipSignature: false, sendReply: false }),
    (error) => error instanceof WhatsAppProductionWebhookError && error.status === 401
  );
});

test('processWebhookPost processes inbound webhook with valid signature', async () => {
  resetDuplicateEventStore();
  resetWhatsAppProductionMetrics();

  const payload = buildWebhookPayload('2 adana kebap gönder', 'wamid-process-1');
  const rawBody = JSON.stringify(payload);
  const signature = signBody(rawBody, TEST_ENV.WHATSAPP_APP_SECRET);

  const result = await processWebhookPost(rawBody, signature, {
    env: TEST_ENV,
    useSupabase: false,
    persist: false,
    sendReply: false
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.processed, 1);

  const duplicate = await processWebhookPost(rawBody, signature, {
    env: TEST_ENV,
    useSupabase: false,
    persist: false,
    sendReply: false
  });
  assert.equal(duplicate.body.duplicate, true);
  assert.equal(duplicate.body.processed, 0);

  const { summary } = getWhatsAppProductionMetrics();
  assert.equal(summary.messageThroughput, 1);
  assert.equal(summary.duplicatesSkipped, 1);
});

test('resolveRestaurantFromPhoneNumberId maps phone_number_id to tenant restaurant', () => {
  const config = loadWhatsAppProductionConfig({ env: TEST_ENV });
  const restaurantId = resolveRestaurantFromPhoneNumberId({
    phoneNumberId: 'phone-tenant-1',
    restaurantMap: config.restaurantMap
  });
  assert.equal(restaurantId, DEMO_RESTAURANT_ID);

  const routes = extractRestaurantRoutesFromWebhook(buildWebhookPayload('test'), {
    restaurantMap: config.restaurantMap
  });
  assert.equal(routes.length, 1);
  assert.equal(routes[0].restaurantId, DEMO_RESTAURANT_ID);
});

test('resolveRestaurantFromPhoneNumberId enforces tenant isolation', () => {
  assert.throws(
    () =>
      resolveRestaurantFromPhoneNumberId({
        phoneNumberId: 'phone-tenant-1',
        metadata: { restaurant_id: 'other-restaurant' },
        restaurantId: DEMO_RESTAURANT_ID,
        restaurantMap: { 'phone-tenant-1': 'other-restaurant' }
      }),
    (error) => error instanceof WhatsAppWebhookError
  );
});

test('withRetry retries retryable network failures with exponential backoff', async () => {
  let attempts = 0;
  const delays = [];
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.setTimeout = (fn, ms) => originalSetTimeout(fn, 0);

  try {
    const value = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          const error = new Error('network timeout');
          /** @type {Record<string, unknown>} */ (error).code = 'ETIMEDOUT';
          throw error;
        }
        return 'ok';
      },
      {
        maxAttempts: 4,
        onRetry: (_error, attempt) => {
          delays.push(computeExponentialBackoffMs(attempt));
        }
      }
    );

    assert.equal(value, 'ok');
    assert.equal(attempts, 3);
    assert.deepEqual(delays, [250, 500]);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('isRetryableHttpStatus handles 429 and 5xx responses', () => {
  assert.equal(isRetryableHttpStatus(429), true);
  assert.equal(isRetryableHttpStatus(503), true);
  assert.equal(isRetryableHttpStatus(400), false);
});

test('WhatsAppCloudApiClient sends text messages through Graph API', async () => {
  /** @type {Array<{ url: string, init: RequestInit }>} */
  const calls = [];

  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init: /** @type {RequestInit} */ (init) });
    return new Response(JSON.stringify({ messages: [{ id: 'wamid-sent-1' }] }), { status: 200 });
  };

  const client = new WhatsAppCloudApiClient(loadWhatsAppProductionConfig({ env: TEST_ENV }), {
    fetchImpl
  });

  const response = await client.sendTextMessage('905551110001', 'Siparişiniz alındı.', 'phone-tenant-1');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/phone-tenant-1\/messages$/);
  assert.equal(calls[0].init.method, 'POST');
  assert.match(String(calls[0].init.headers?.Authorization), /Bearer test-access-token/);

  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.type, 'text');
  assert.equal(body.to, '905551110001');
  assert.match(body.text.body, /alındı/i);
  assert.ok(response.messages);
});

test('runWhatsAppOrderPipeline creates order via AI parser without Supabase', async () => {
  resetWhatsAppProductionMetrics();

  const sentMessages = [];
  const apiClient = {
    async sendTypingIndicator() {},
    async markAsRead() {},
    async sendTextMessage(to, text) {
      sentMessages.push({ to, text });
      return { messages: [{ id: 'wamid-reply-1' }] };
    }
  };

  const pipeline = await runWhatsAppOrderPipeline(buildWebhookPayload('2 adana kebap gönder', 'wamid-order-1'), {
    env: TEST_ENV,
    useSupabase: false,
    persist: false,
    sendReply: true,
    apiClient: /** @type {import('../../js/restoran/whatsapp/production/cloud-api-client.js').WhatsAppCloudApiClient} */ (
      apiClient
    )
  });

  assert.equal(pipeline.processed, 1);
  assert.equal(pipeline.results[0].restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(pipeline.results[0].pipeline.intent, 'new_order');
  assert.ok(pipeline.results[0].pipeline.order);
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0].text, /alındı/i);
});

test('runWhatsAppOrderPipeline matches menu items and builds order total', async () => {
  const pipeline = await runWhatsAppOrderPipeline(buildWebhookPayload('2 adana kebap gönder', 'wamid-order-2'), {
    env: TEST_ENV,
    useSupabase: false,
    persist: false,
    sendReply: false
  });

  assert.equal(pipeline.results[0].pipeline.matchedItems.length, 1);
  assert.equal(pipeline.results[0].pipeline.order?.items?.[0]?.name, 'Adana kebap');
  assert.equal(pipeline.results[0].pipeline.order?.total, 720);
});
