import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const { DEMO_RESTAURANT_ID } = await import('../../js/restoran/admin-management.js');

const {
  WEBHOOK_GATEWAY_VERSION,
  WEBHOOK_GATEWAY_REQUIRED_ENV,
  validateWebhookGatewayEnvironment,
  handleWebhookGatewayVerification,
  processWebhookGatewayPost,
  handleWebhookGatewayRequest,
  buildWebhookGatewayHealthResponse,
  classifyWebhookPayload,
  extractInboundMessageKeys,
  runWebhookGatewayPipeline,
  resetWebhookGatewayMetrics,
  WhatsAppWebhookGatewayError
} = await import('../../js/restoran/whatsapp/production/webhook-gateway.js');

const { resetDuplicateEventStore } = await import(
  '../../js/restoran/whatsapp/production/dedupe.js'
);

const { resolveRestaurantFromPhoneNumberId } = await import(
  '../../js/restoran/whatsapp/production/restaurant-routing.js'
);

const TEST_ENV = {
  WHATSAPP_ACCESS_TOKEN: 'test-access-token',
  WHATSAPP_VERIFY_TOKEN: 'garson-verify-token',
  WHATSAPP_PHONE_NUMBER_ID: '100200300',
  WHATSAPP_BUSINESS_ACCOUNT_ID: 'waba-9001',
  META_APP_SECRET: 'super-secret-app-key',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
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

function buildStatusPayload(status = 'delivered', messageId = 'wamid-status-1') {
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
              statuses: [
                {
                  id: messageId,
                  status,
                  timestamp: '1720000001',
                  recipient_id: '905551110001'
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

function buildTemplateStatusPayload() {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'entry-1',
        changes: [
          {
            field: 'message_template_status_update',
            value: {
              metadata: {
                phone_number_id: 'phone-tenant-1',
                restaurant_id: DEMO_RESTAURANT_ID
              },
              message_template_id: 'tpl-100',
              event: 'APPROVED',
              reason: 'NONE'
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

test('WEBHOOK_GATEWAY_REQUIRED_ENV lists all production gateway secrets', () => {
  assert.deepEqual(WEBHOOK_GATEWAY_REQUIRED_ENV, [
    'WHATSAPP_VERIFY_TOKEN',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_BUSINESS_ACCOUNT_ID',
    'META_APP_SECRET',
    'SUPABASE_URL'
  ]);
});

test('validateWebhookGatewayEnvironment checks required production secrets', () => {
  const ok = validateWebhookGatewayEnvironment({ env: TEST_ENV });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.missing, []);

  const missing = validateWebhookGatewayEnvironment({ env: {} });
  assert.equal(missing.ok, false);
  assert.ok(missing.missing.includes('META_APP_SECRET'));
  assert.ok(missing.missing.includes('WHATSAPP_BUSINESS_ACCOUNT_ID'));
  assert.ok(missing.missing.includes('SUPABASE_URL'));
});

test('handleWebhookGatewayVerification validates Meta subscription handshake', () => {
  const ok = handleWebhookGatewayVerification(
    {
      mode: 'subscribe',
      verifyToken: 'garson-verify-token',
      challenge: 'challenge-123'
    },
    TEST_ENV
  );
  assert.equal(ok.status, 200);
  assert.equal(ok.body, 'challenge-123');
});

test('handleWebhookGatewayVerification rejects invalid verify token with 403', () => {
  assert.throws(
    () =>
      handleWebhookGatewayVerification(
        {
          mode: 'subscribe',
          verifyToken: 'wrong-token',
          challenge: 'challenge-123'
        },
        TEST_ENV
      ),
    (error) =>
      error instanceof WhatsAppWebhookGatewayError &&
      error.status === 403 &&
      error.code === 'forbidden'
  );
});

test('handleWebhookGatewayVerification returns 500 when env is missing', () => {
  assert.throws(
    () =>
      handleWebhookGatewayVerification(
        {
          mode: 'subscribe',
          verifyToken: 'garson-verify-token',
          challenge: 'challenge-123'
        },
        {}
      ),
    (error) =>
      error instanceof WhatsAppWebhookGatewayError &&
      error.status === 500 &&
      error.code === 'server_misconfigured'
  );
});

test('processWebhookGatewayPost rejects invalid signatures with 403', async () => {
  resetDuplicateEventStore();
  const payload = buildWebhookPayload('merhaba');
  const rawBody = JSON.stringify(payload);

  await assert.rejects(
    () => processWebhookGatewayPost(rawBody, 'sha256=invalid', { env: TEST_ENV, sendReply: false }),
    (error) =>
      error instanceof WhatsAppWebhookGatewayError &&
      error.status === 403 &&
      error.code === 'forbidden'
  );
});

test('processWebhookGatewayPost returns 500 when required env is missing', async () => {
  const payload = buildWebhookPayload('merhaba');
  const rawBody = JSON.stringify(payload);
  const signature = signBody(rawBody, TEST_ENV.META_APP_SECRET);

  await assert.rejects(
    () => processWebhookGatewayPost(rawBody, signature, { env: {}, sendReply: false }),
    (error) =>
      error instanceof WhatsAppWebhookGatewayError &&
      error.status === 500 &&
      error.code === 'server_misconfigured'
  );
});

test('buildWebhookGatewayHealthResponse exposes status without secrets', () => {
  resetWebhookGatewayMetrics();

  const healthy = buildWebhookGatewayHealthResponse(TEST_ENV);
  assert.equal(healthy.status, 'ok');
  assert.equal(healthy.configured, true);
  assert.deepEqual(healthy.missing, []);
  assert.equal(healthy.version, WEBHOOK_GATEWAY_VERSION);
  assert.equal(typeof healthy.uptime, 'number');
  assert.equal(healthy.messageCount, 0);
  assert.equal(healthy.successCount, 0);
  assert.equal(healthy.failureCount, 0);
  assert.equal(healthy.latency, 0);
  assert.equal(healthy.accessToken, undefined);
  assert.equal(healthy.metaAppSecret, undefined);

  const degraded = buildWebhookGatewayHealthResponse({});
  assert.equal(degraded.status, 'degraded');
  assert.equal(degraded.configured, false);
  assert.ok(degraded.missing.length > 0);
});

test('classifyWebhookPayload parses messages, statuses and template updates', () => {
  const statusPayload = buildStatusPayload('read', 'wamid-read-1');
  const classified = classifyWebhookPayload(statusPayload, {
    'phone-tenant-1': DEMO_RESTAURANT_ID
  });

  assert.equal(classified.statuses.length, 1);
  assert.equal(classified.statuses[0].status, 'read');
  assert.equal(classified.statuses[0].messageId, 'wamid-read-1');
  assert.equal(classified.statuses[0].restaurantId, DEMO_RESTAURANT_ID);

  const templatePayload = buildTemplateStatusPayload();
  const templateClassified = classifyWebhookPayload(templatePayload, {
    'phone-tenant-1': DEMO_RESTAURANT_ID
  });
  assert.equal(templateClassified.templateUpdates.length, 1);
  assert.equal(templateClassified.templateUpdates[0].event, 'APPROVED');
  assert.equal(templateClassified.templateUpdates[0].restaurantId, DEMO_RESTAURANT_ID);
});

test('extractInboundMessageKeys and restaurant routing resolve phone_number_id', () => {
  const payload = buildWebhookPayload('2 adana kebap', 'wamid-route-1');
  const keys = extractInboundMessageKeys(payload);
  assert.equal(keys.length, 1);

  const restaurantId = resolveRestaurantFromPhoneNumberId({
    phoneNumberId: 'phone-tenant-1',
    restaurantMap: { 'phone-tenant-1': DEMO_RESTAURANT_ID }
  });
  assert.equal(restaurantId, DEMO_RESTAURANT_ID);
});

test('processWebhookGatewayPost processes inbound webhook with valid signature and returns 200', async () => {
  resetDuplicateEventStore();
  resetWebhookGatewayMetrics();

  const payload = buildWebhookPayload('2 adana kebap gönder', 'wamid-process-1');
  const rawBody = JSON.stringify(payload);
  const signature = signBody(rawBody, TEST_ENV.META_APP_SECRET);

  const result = await processWebhookGatewayPost(rawBody, signature, {
    env: TEST_ENV,
    useSupabase: false,
    persist: false,
    sendReply: false
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.processed, 1);
  assert.equal(result.body.duplicate, false);

  const duplicate = await processWebhookGatewayPost(rawBody, signature, {
    env: TEST_ENV,
    useSupabase: false,
    persist: false,
    sendReply: false
  });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.duplicate, true);
  assert.equal(duplicate.body.processed, 0);
});

test('runWebhookGatewayPipeline invokes AI production pipeline and builds order DTO', async () => {
  resetWebhookGatewayMetrics();

  const sentMessages = [];
  const apiClient = {
    async sendTypingIndicator() {},
    async markAsRead() {},
    async sendTextMessage(to, text) {
      sentMessages.push({ to, text });
      return { messages: [{ id: 'wamid-reply-1' }] };
    }
  };

  const pipeline = await runWebhookGatewayPipeline(
    buildWebhookPayload('2 adana kebap gönder', 'wamid-order-1'),
    {
      env: TEST_ENV,
      useSupabase: false,
      persist: false,
      sendReply: true,
      apiClient: /** @type {import('../../js/restoran/whatsapp/production/cloud-api-client.js').WhatsAppCloudApiClient} */ (
        apiClient
      )
    }
  );

  assert.equal(pipeline.processed, 1);
  assert.equal(pipeline.messages.length, 1);
  assert.equal(pipeline.messages[0].restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(pipeline.messages[0].result, 'processed');
  assert.equal(pipeline.messages[0].orderCreated, true);
  assert.ok(pipeline.messages[0].orderDto);
  assert.equal(pipeline.messages[0].orderDto.items[0].name, 'Adana kebap');
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0].text, /alındı/i);

  const health = buildWebhookGatewayHealthResponse(TEST_ENV);
  assert.equal(health.messageCount, 1);
  assert.equal(health.successCount, 1);
  assert.equal(health.failureCount, 0);
  assert.ok(health.latency >= 0);
});

test('runWebhookGatewayPipeline acknowledges delivery and read status events', async () => {
  resetWebhookGatewayMetrics();

  const pipeline = await runWebhookGatewayPipeline(buildStatusPayload('delivered', 'wamid-delivered-1'), {
    env: TEST_ENV,
    useSupabase: false,
    persist: false,
    sendReply: false
  });

  assert.equal(pipeline.processed, 1);
  assert.equal(pipeline.statuses.length, 1);
  assert.equal(pipeline.statuses[0].status, 'delivered');
  assert.equal(pipeline.messages.length, 0);

  const readPipeline = await runWebhookGatewayPipeline(buildStatusPayload('read', 'wamid-read-2'), {
    env: TEST_ENV,
    useSupabase: false,
    persist: false,
    sendReply: false
  });
  assert.equal(readPipeline.statuses[0].status, 'read');
});

test('handleWebhookGatewayRequest supports GET verification and POST webhook', async () => {
  resetDuplicateEventStore();

  const verifyRequest = new Request(
    'https://example.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=garson-verify-token&hub.challenge=challenge-abc',
    { method: 'GET' }
  );
  const verifyResponse = await handleWebhookGatewayRequest(verifyRequest, { env: TEST_ENV });
  assert.equal(verifyResponse.status, 200);
  assert.equal(await verifyResponse.text(), 'challenge-abc');

  const payload = buildWebhookPayload('merhaba', 'wamid-http-1');
  const rawBody = JSON.stringify(payload);
  const postRequest = new Request('https://example.com/api/whatsapp/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signBody(rawBody, TEST_ENV.META_APP_SECRET)
    },
    body: rawBody
  });

  const postResponse = await handleWebhookGatewayRequest(postRequest, {
    env: TEST_ENV,
    useSupabase: false,
    persist: false,
    sendReply: false
  });
  assert.equal(postResponse.status, 200);
  const body = await postResponse.json();
  assert.equal(body.ok, true);
  assert.equal(body.processed, 1);
});
