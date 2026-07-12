/**
 * GarsonAI P6-E WhatsApp Webhook Gateway health endpoint.
 * GET /api/whatsapp/health
 */
import { buildWebhookGatewayHealthResponse } from '../../../js/restoran/whatsapp/production/webhook-gateway.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

/** @param {Record<string, string>} env @param {string} key */
const envPresent = (env, key) => Boolean(String(env[key] || '').trim());

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context) {
  const env = /** @type {Record<string, string>} */ (context.env || {});
  const health = buildWebhookGatewayHealthResponse(env);
  const supabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  return json(
    {
      ...health,
      supabaseConfigured,
      debug: {
        verifyTokenPresent: envPresent(env, 'WHATSAPP_VERIFY_TOKEN'),
        accessTokenPresent: envPresent(env, 'WHATSAPP_ACCESS_TOKEN'),
        businessAccountPresent: envPresent(env, 'WHATSAPP_BUSINESS_ACCOUNT_ID'),
        metaSecretPresent: envPresent(env, 'META_APP_SECRET')
      }
    },
    health.configured ? 200 : 503
  );
}
