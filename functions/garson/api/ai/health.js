/**
 * GarsonAI production AI health endpoint.
 * GET /garson/api/ai/health
 */
import {
  getActivePrompt,
  getAiCostSummary,
  getAiProductionMetrics,
  loadAiProductionConfig,
  PARSER_VERSION,
  validateAiProductionEnvironment
} from '../../../../js/restoran/ai/production/index.js';

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
  const configValidation = validateAiProductionEnvironment({ env });
  const config = loadAiProductionConfig({ env });
  const prompt = getActivePrompt('garson-whatsapp-order');
  const { metrics, summary } = getAiProductionMetrics();
  const cost = getAiCostSummary();

  const healthy = configValidation.ok;

  return json(
    {
      ok: healthy,
      service: 'garson-ai-production',
      ts: new Date().toISOString(),
      model: config.model,
      provider: config.provider,
      status: healthy ? 'ready' : 'degraded',
      latency: {
        averageMs: summary.averageLatencyMs,
        timeoutMs: config.timeoutMs
      },
      promptVersion: prompt?.version || '1.0.0',
      parserVersion: PARSER_VERSION,
      promptId: prompt?.id || 'garson-whatsapp-order',
      config: {
        maxRetries: config.maxRetries,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        missing: configValidation.missing
      },
      monitoring: {
        metrics,
        summary
      },
      cost
    },
    healthy ? 200 : 503
  );
}
