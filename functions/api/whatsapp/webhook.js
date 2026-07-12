/**
 * GarsonAI P6-E Production WhatsApp Webhook Gateway.
 * GET/POST /api/whatsapp/webhook
 */
import { createClient } from '@supabase/supabase-js';
import {
  handleWebhookGatewayRequest,
  WhatsAppWebhookGatewayError
} from '../../../js/restoran/whatsapp/production/webhook-gateway.js';
import { jsonApiResponse, logApiEvent } from '../../_shared/api-response.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Hub-Signature-256'
};

/**
 * @param {Record<string, string>} env
 */
function getSupabaseClient(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequest(context) {
  const env = /** @type {Record<string, string>} */ (context.env || {});
  const client = getSupabaseClient(env);

  try {
    const response = await handleWebhookGatewayRequest(context.request, {
      env,
      client: client || undefined,
      useSupabase: Boolean(client),
      persist: true,
      sendReply: true
    });

    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      headers
    });
  } catch (error) {
    const status = error instanceof WhatsAppWebhookGatewayError ? error.status : 500;
    const code =
      error instanceof WhatsAppWebhookGatewayError ? error.code : 'internal_error';
    const message = error instanceof Error ? error.message : 'Webhook işlenemedi.';

    if (status !== 500 || code !== 'server_misconfigured') {
      logApiEvent('warn', 'whatsapp_webhook_gateway_failed', {
        status,
        code
      });
    }

    return jsonApiResponse(
      {
        ok: false,
        error: {
          code,
          message
        }
      },
      status,
      corsHeaders
    );
  }
}
