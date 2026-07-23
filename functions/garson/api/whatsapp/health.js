/**
 * GarsonAI WhatsApp production health endpoint.
 * GET /garson/api/whatsapp/health
 */
import { createClient } from '@supabase/supabase-js';
import {
  getWhatsAppProductionMetrics,
  loadWhatsAppProductionConfig,
  validateWhatsAppProductionEnvironment
} from '../../../../js/restoran/whatsapp/production/index.js';

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
  const configValidation = validateWhatsAppProductionEnvironment({ env });
  const config = loadWhatsAppProductionConfig({ env });
  const { metrics, summary } = getWhatsAppProductionMetrics();

  const supabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  let supabaseReachable = false;

  if (supabaseConfigured) {
    try {
      const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      });
      const { error } = await client.from('restaurants').select('id').limit(1);
      supabaseReachable = !error;
    } catch {
      supabaseReachable = false;
    }
  }

  const healthy =
    configValidation.ok &&
    Boolean(config.accessToken) &&
    Boolean(config.verifyToken) &&
    Boolean(config.phoneNumberId);

  return json(
    {
      ok: healthy,
      service: 'garson-whatsapp-production',
      ts: new Date().toISOString(),
      config: {
        apiVersion: config.apiVersion,
        phoneNumberIdConfigured: Boolean(config.phoneNumberId),
        verifyTokenConfigured: Boolean(config.verifyToken),
        accessTokenConfigured: Boolean(config.accessToken),
        appSecretConfigured: Boolean(config.appSecret),
        restaurantMapSize: Object.keys(config.restaurantMap || {}).length,
        missing: configValidation.missing
      },
      dependencies: {
        supabaseConfigured,
        supabaseReachable
      },
      monitoring: {
        metrics,
        summary
      }
    },
    healthy ? 200 : 503
  );
}
