/**
 * isteBul AI Listings Engine v1 — stub AI provider adapter (placeholder).
 *
 * AI narration must NOT override deterministic scores in production integration.
 */

import { DATA_SOURCE_IDS } from '../../core/constants.js';
import { createEmptyAIAnalysis } from '../../models/ai-analysis.js';

/** @typedef {import('./ai-provider-adapter.interface.js').AIProviderAdapter} AIProviderAdapter */

/**
 * @returns {AIProviderAdapter}
 */
export function createStubAIProviderAdapter() {
  return {
    getProviderId() {
      return DATA_SOURCE_IDS.AI_MODEL;
    },

    async generateAnalysis(request) {
      // TODO: Wire functions/ai-proxy.js with server-side key management
      // TODO: Ensure AI output is narration-only; canonical scores come from scoring engine
      const analysis = createEmptyAIAnalysis({
        summary: `Placeholder analysis for "${request.listing.title || 'listing'}". AI provider not connected.`,
        tags: ['placeholder', 'inactive']
      });

      return {
        analysis,
        model_id: 'stub-v1',
        generated_at: new Date().toISOString()
      };
    }
  };
}
