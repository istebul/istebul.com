/**
 * GarsonAI production AI güvenli loglama.
 * Kullanıcı mesajı, API key ve prompt içeriği loglanmaz.
 */

/**
 * @param {string} event
 * @param {Record<string, unknown>} [fields]
 */
function writeAiLog(event, fields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    service: 'garson-ai-production',
    event,
    ...fields
  };
  console.warn(JSON.stringify(payload));
}

/**
 * @param {string} event
 * @param {{ promptId?: string, promptVersion?: string, parserVersion?: string, latencyMs?: number, inputTokens?: number, outputTokens?: number, confidence?: number, model?: string, provider?: string, fallbackReason?: string }} [fields]
 */
export function logAiAudit(event, fields = {}) {
  writeAiLog(event, {
    promptId: fields.promptId,
    promptVersion: fields.promptVersion,
    parserVersion: fields.parserVersion,
    latencyMs: fields.latencyMs,
    inputTokens: fields.inputTokens,
    outputTokens: fields.outputTokens,
    confidence: fields.confidence,
    model: fields.model,
    provider: fields.provider,
    fallbackReason: fields.fallbackReason
  });
}

/**
 * @param {string} event
 * @param {{ message?: string, code?: string }} [fields]
 */
export function logAiError(event, fields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    service: 'garson-ai-production',
    level: 'error',
    event,
    message: fields.message,
    code: fields.code
  };
  console.error(JSON.stringify(payload));
}
