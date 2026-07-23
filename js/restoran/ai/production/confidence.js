/**
 * GarsonAI production AI güven skoru.
 */

/**
 * @typedef {Object} AiConfidenceMetadata
 * @property {number} confidence
 * @property {string} parserVersion
 * @property {string} promptVersion
 * @property {string} model
 * @property {string} provider
 */

/**
 * @param {{ intent?: string, matchedCount?: number, unmatchedCount?: number, itemCount?: number, fallback?: boolean }} input
 * @returns {number}
 */
export function calculateConfidenceScore(input = {}) {
  if (input.fallback) return 0.2;

  let score = 0.55;
  const intent = String(input.intent || 'unknown');
  if (intent === 'new_order') score += 0.15;
  else if (intent !== 'unknown') score += 0.1;

  const itemCount = Math.max(0, Number(input.itemCount || 0));
  const matchedCount = Math.max(0, Number(input.matchedCount || 0));
  const unmatchedCount = Math.max(0, Number(input.unmatchedCount || 0));

  if (itemCount > 0) score += Math.min(0.15, itemCount * 0.05);
  if (matchedCount > 0) score += Math.min(0.2, matchedCount * 0.08);
  if (unmatchedCount > 0) score -= Math.min(0.35, unmatchedCount * 0.12);

  return Number(Math.min(0.99, Math.max(0.05, score)).toFixed(3));
}

/**
 * @param {{ intent?: string, matchedCount?: number, unmatchedCount?: number, itemCount?: number, fallback?: boolean, parserVersion?: string, promptVersion?: string, model?: string, provider?: string }} input
 * @returns {AiConfidenceMetadata}
 */
export function buildConfidenceMetadata(input = {}) {
  return {
    confidence: calculateConfidenceScore(input),
    parserVersion: String(input.parserVersion || 'garson-parser-v1'),
    promptVersion: String(input.promptVersion || '1.0.0'),
    model: String(input.model || 'rule-based'),
    provider: String(input.provider || 'local')
  };
}
