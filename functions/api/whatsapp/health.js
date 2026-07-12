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

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context) {
  const env = /** @type {Record<string, string>} */ (context.env || {});
  const health = buildWebhookGatewayHealthResponse(env);
  return json(health, health.configured ? 200 : 503);
}
