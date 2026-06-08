/**
 * isteBul AI Listings Engine v1 — AI model provider adapter port.
 *
 * Future wiring targets:
 * - functions/ai-proxy.js
 * - External LLM providers
 * - On-device / edge models
 */

/** @typedef {import('../../models/listing.js').Listing} Listing */
/** @typedef {import('../../models/ai-analysis.js').AIAnalysis} AIAnalysis */

/**
 * @typedef {Object} AIProviderRequest
 * @property {Listing} listing
 * @property {Record<string, unknown>} [context]
 */

/**
 * @typedef {Object} AIProviderResponse
 * @property {AIAnalysis} analysis
 * @property {string} model_id
 * @property {string} generated_at
 */

/**
 * @typedef {Object} AIProviderAdapter
 * @property {(request: AIProviderRequest) => Promise<AIProviderResponse|null>} generateAnalysis
 * @property {() => string} getProviderId
 */

/**
 * @returns {AIProviderAdapter}
 */
export function createUnimplementedAIProviderAdapter() {
  const notReady = () => {
    throw new Error('AIProviderAdapter not implemented — wire ai-proxy in integration phase');
  };
  return {
    generateAnalysis: async () => notReady(),
    getProviderId: () => 'unimplemented'
  };
}
