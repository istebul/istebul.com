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

const WEBHOOK_BRANCH_HEADER = 'X-Garson-Webhook-Branch';
const WEBHOOK_AUDIT_HEADER = 'X-Garson-Webhook-Audit';

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

/**
 * @param {Record<string, string>} env
 * @returns {boolean}
 */
function isWebhookResponseDebugEnabled(env) {
  return env.DEBUG_WEBHOOK_RESPONSE === 'true';
}

/**
 * @param {unknown} error
 * @returns {string|null}
 */
function resolveWebhookErrorBranch(error) {
  if (!(error instanceof WhatsAppWebhookGatewayError)) {
    return null;
  }
  if (error.status === 403 && error.code === 'forbidden') {
    return 'signature_failed';
  }
  if (error.status === 400 && error.code === 'bad_request') {
    return 'invalid_json';
  }
  return null;
}

/**
 * @param {Response} response
 * @param {Request} request
 * @param {Record<string, string>} env
 * @returns {Promise<Response>}
 */
async function maybeAttachWebhookPostDebug(response, request, env) {
  if (request.method !== 'POST' || !isWebhookResponseDebugEnabled(env)) {
    return response;
  }

  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  const branch = headers.get(WEBHOOK_BRANCH_HEADER);
  const auditRaw = headers.get(WEBHOOK_AUDIT_HEADER);
  headers.delete(WEBHOOK_BRANCH_HEADER);
  headers.delete(WEBHOOK_AUDIT_HEADER);

  let audit = null;
  if (auditRaw) {
    try {
      audit = JSON.parse(auditRaw);
    } catch {
      audit = null;
    }
  }

  try {
    const body = await response.json();
    return new Response(
      JSON.stringify({
        ...body,
        debug: {
          branch: audit?.branch ?? branch ?? null,
          eventType: audit?.eventType ?? null,
          messageId: audit?.messageId ?? null,
          restaurantId: audit?.restaurantId ?? null,
          processed: body.processed ?? audit?.processed ?? null
        }
      }),
      {
        status: response.status,
        headers
      }
    );
  } catch {
    return new Response(response.body, {
      status: response.status,
      headers
    });
  }
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

    return maybeAttachWebhookPostDebug(response, context.request, env);
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

    const errorBody = {
      ok: false,
      error: {
        code,
        message
      }
    };

    if (code === 'server_misconfigured') {
      errorBody.debug = {
        envKeys: Object.keys(env).sort(),
        verifyTokenPresent: Boolean(env.WHATSAPP_VERIFY_TOKEN),
        accessTokenPresent: Boolean(env.WHATSAPP_ACCESS_TOKEN),
        phoneNumberPresent: Boolean(env.WHATSAPP_PHONE_NUMBER_ID),
        businessAccountPresent: Boolean(env.WHATSAPP_BUSINESS_ACCOUNT_ID),
        metaSecretPresent: Boolean(env.META_APP_SECRET),
        supabaseUrlPresent: Boolean(env.SUPABASE_URL)
      };
    } else if (
      context.request.method === 'POST' &&
      isWebhookResponseDebugEnabled(env)
    ) {
      const branch = resolveWebhookErrorBranch(error);
      if (branch) {
        errorBody.debug = {
          status,
          processed: null,
          duplicate: false,
          ok: false,
          branch
        };
      }
    }

    return jsonApiResponse(errorBody, status, corsHeaders);
  }
}
