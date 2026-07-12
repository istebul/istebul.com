/**
 * GarsonAI WhatsApp Cloud API webhook endpoint.
 * GET/POST /garson/api/whatsapp/webhook
 */
import { createClient } from '@supabase/supabase-js';
import {
  handleWebhookRequest,
  WhatsAppProductionWebhookError
} from '../../../../js/restoran/whatsapp/production/index.js';
import { jsonApiResponse, logApiEvent } from '../../../_shared/api-response.js';

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
    const response = await handleWebhookRequest(context.request, {
      env,
      client: client || undefined,
      useSupabase: Boolean(client),
      persist: true,
      sendReply: true,
      skipSignature: env.GARSON_WHATSAPP_SKIP_SIGNATURE === 'true'
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
    const status = error instanceof WhatsAppProductionWebhookError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Webhook işlenemedi.';

    logApiEvent('error', 'garson_whatsapp_webhook_failed', {
      status,
      message
    });

    return jsonApiResponse(
      {
        ok: false,
        error: {
          code: status === 401 || status === 403 ? 'unauthorized' : 'internal_error',
          message
        }
      },
      status,
      corsHeaders
    );
  }
}
