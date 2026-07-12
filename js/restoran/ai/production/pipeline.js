/**
 * GarsonAI production AI pipeline.
 * WhatsApp → Parser → Validation → Order DTO → Kitchen handoff
 */
import { processWhatsAppOrderMessage } from '../../whatsapp/index.js';
import { buildKitchenQueue } from '../../kitchen/kitchen-queue.js';
import { createCustomerNotification } from '../../kitchen/notification-engine.js';
import { loadAiProductionConfig } from './config.js';
import { buildConfidenceMetadata } from './confidence.js';
import { recordAiCostUsage } from './cost-tracking.js';
import { logAiAudit, logAiError } from './logging.js';
import {
  recordAiInvalidJson,
  recordAiRequest,
  recordAiSuccess
} from './monitoring.js';
import { getActivePrompt } from './prompt-registry.js';
import { buildOrderDtoFromPipeline, buildKitchenHandoff } from './order-dto.js';
import {
  buildAiFallbackResult,
  isUnknownIntent,
  runReliableAiOperation
} from './reliability.js';
import { applyStructuredOutputFallback, normalizeStructuredOutput } from './structured-output.js';

/**
 * @typedef {Object} AiProductionPipelineInput
 * @property {string} message
 * @property {string} restaurantId
 * @property {unknown} [menu]
 * @property {{ phone?: string, name?: string, whatsappId?: string }} [customer]
 * @property {Record<string, string>} [env]
 */

/**
 * @param {AiProductionPipelineInput} input
 * @param {{ config?: import('./config.js').AiProductionConfig, promptId?: string }} [options]
 */
export async function runGarsonAiProductionPipeline(input = {}, options = {}) {
  const startedAt = Date.now();
  recordAiRequest();

  const config = options.config || loadAiProductionConfig({ env: input.env });
  const prompt = getActivePrompt(options.promptId || 'garson-whatsapp-order');
  const message = String(input.message || '').trim();
  const restaurantId = String(input.restaurantId || '').trim();

  if (!message) {
    const fallback = buildAiFallbackResult('empty_response', {
      intent: 'unknown',
      raw: '',
      items: []
    });
    return finalizePipelineResult({
      ok: false,
      fallback,
      config,
      prompt,
      startedAt,
      pipeline: null,
      orderDto: null,
      kitchen: { queue: [], notification: null }
    });
  }

  try {
    const pipeline = await runReliableAiOperation(
      () =>
        Promise.resolve().then(() => {
          const result = processWhatsAppOrderMessage({
            message,
            restaurantId,
            menu: input.menu,
            customer: input.customer
          });

          const structured = applyStructuredOutputFallback(result.parsed);
          if (!structured.ok) {
            recordAiInvalidJson();
          }

          return {
            ...result,
            parsed: structured.data
          };
        }),
      {
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries
      }
    );

    if (isUnknownIntent(pipeline.intent) && !pipeline.order) {
      const fallback = buildAiFallbackResult('unknown_intent', pipeline.parsed);
      return finalizePipelineResult({
        ok: false,
        fallback,
        config,
        prompt,
        startedAt,
        pipeline,
        orderDto: null,
        kitchen: { queue: [], notification: null }
      });
    }

    const orderDto = buildOrderDtoFromPipeline(pipeline);
    const handoff = buildKitchenHandoff(orderDto, restaurantId);

    const kitchenQueue = orderDto
      ? buildKitchenQueue([handoff.orderRecord], { restaurantId })
      : [];

    const notification = orderDto
      ? createCustomerNotification(
          {
            ...handoff.orderRecord,
            source: 'whatsapp',
            customer: orderDto.customer
          },
          orderDto.status
        )
      : null;

    return finalizePipelineResult({
      ok: Boolean(orderDto),
      fallback: null,
      config,
      prompt,
      startedAt,
      pipeline,
      orderDto,
      kitchen: {
        queue: kitchenQueue,
        notification,
        handoff
      }
    });
  } catch (error) {
    logAiError('ai_pipeline_failed', {
      message: error instanceof Error ? error.message : String(error),
      code: error && typeof error === 'object' ? String(/** @type {Record<string, unknown>} */ (error).code || '') : ''
    });

    const structured = applyStructuredOutputFallback(
      normalizeStructuredOutput({ intent: 'unknown', raw: message, items: [] }).data
    );

    const fallback = buildAiFallbackResult(
      error && typeof error === 'object' && String(/** @type {Record<string, unknown>} */ (error).code || '') === 'AI_TIMEOUT'
        ? 'timeout'
        : 'unknown_intent',
      structured.data
    );

    return finalizePipelineResult({
      ok: false,
      fallback,
      config,
      prompt,
      startedAt,
      pipeline: {
        intent: 'unknown',
        parsed: structured.data,
        matchedItems: [],
        unmatchedItems: [],
        order: null
      },
      orderDto: null,
      kitchen: { queue: [], notification: null }
    });
  }
}

/**
 * @param {Record<string, unknown>} state
 */
function finalizePipelineResult(state) {
  const latencyMs = Date.now() - Number(state.startedAt || Date.now());
  const pipeline = /** @type {import('../../whatsapp/index.js').ProcessWhatsAppMessageResult|null} */ (
    state.pipeline || null
  );
  const config = /** @type {import('./config.js').AiProductionConfig} */ (state.config);
  const prompt = /** @type {import('./prompt-registry.js').PromptDefinition|null} */ (state.prompt || null);

  const confidence = buildConfidenceMetadata({
    intent: pipeline?.intent,
    itemCount: pipeline?.parsed?.items?.length || 0,
    matchedCount: pipeline?.matchedItems?.length || 0,
    unmatchedCount: pipeline?.unmatchedItems?.length || 0,
    fallback: Boolean(state.fallback),
    parserVersion: config.parserVersion,
    promptVersion: prompt?.version || '1.0.0',
    model: config.model,
    provider: config.provider
  });

  const cost = recordAiCostUsage({
    model: pipeline?.order ? 'rule-based' : config.model,
    inputText: pipeline?.parsed?.raw || '',
    outputText: JSON.stringify({
      intent: pipeline?.intent || 'unknown',
      itemCount: pipeline?.parsed?.items?.length || 0
    })
  });

  if (state.ok) {
    recordAiSuccess(latencyMs);
  }

  logAiAudit('ai_pipeline_completed', {
    promptId: prompt?.id,
    promptVersion: prompt?.version,
    parserVersion: config.parserVersion,
    latencyMs,
    inputTokens: cost.inputTokens,
    outputTokens: cost.outputTokens,
    confidence: confidence.confidence,
    model: confidence.model,
    provider: confidence.provider,
    fallbackReason: state.fallback
      ? String(/** @type {Record<string, unknown>} */ (state.fallback).fallbackReason || '')
      : undefined
  });

  return {
    ok: Boolean(state.ok),
    fallback: state.fallback,
    pipeline,
    orderDto: state.orderDto || null,
    kitchen: state.kitchen || { queue: [], notification: null },
    metadata: {
      ...confidence,
      latencyMs,
      cost
    }
  };
}
