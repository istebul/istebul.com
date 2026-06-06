/**
 * isteBul AI Listings Engine v1 — AIAnalysisService (placeholder).
 */

import { isAiListingsEnabled } from '../core/config.js';
import { normalizeAIAnalysis, validateAIAnalysis } from '../models/ai-analysis.js';
import { runAnalysisPipeline } from '../analysis/analysis-pipeline.js';

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../models/ai-analysis.js').AIAnalysis} AIAnalysis */
/** @typedef {import('../repository/ai-analysis-repository.interface.js').AIAnalysisRepository} AIAnalysisRepository */
/** @typedef {import('../repository/adapters/ai-provider-adapter.interface.js').AIProviderAdapter} AIProviderAdapter */

/**
 * @typedef {Object} AIAnalysisServiceDeps
 * @property {AIAnalysisRepository} aiAnalysisRepository
 * @property {AIProviderAdapter} aiProviderAdapter
 */

/**
 * @param {AIAnalysisServiceDeps} deps
 */
export function createAIAnalysisService(deps) {
  const { aiAnalysisRepository, aiProviderAdapter } = deps;

  return {
    /**
     * @param {string} listingId
     * @returns {Promise<AIAnalysis|null>}
     */
    async getByListingId(listingId) {
      if (!isAiListingsEnabled()) return null;
      const record = await aiAnalysisRepository.findByListingId(listingId);
      return record?.analysis ?? null;
    },

    /**
     * Analyze a listing through the deterministic pipeline, then optional AI narration.
     * @param {Listing} listing
     * @param {{ skipAiNarration?: boolean }} [options]
     * @returns {Promise<{ ok: boolean, analysis?: AIAnalysis, errors?: string[] }>}
     */
    async analyze(listing, options = {}) {
      if (!isAiListingsEnabled()) {
        return { ok: false, errors: ['AI Listings Engine is inactive'] };
      }

      const pipelineResult = await runAnalysisPipeline({ listing });
      if (!pipelineResult.ok || !pipelineResult.analysis) {
        return { ok: false, errors: pipelineResult.errors ?? ['Analysis pipeline failed'] };
      }

      let analysis = pipelineResult.analysis;

      if (!options.skipAiNarration) {
        // TODO: Merge AI narration into summary/pros/cons only — never override scores
        const aiResponse = await aiProviderAdapter.generateAnalysis({ listing, context: pipelineResult.context });
        if (aiResponse?.analysis) {
          analysis = normalizeAIAnalysis({
            ...analysis,
            summary: aiResponse.analysis.summary || analysis.summary,
            pros: aiResponse.analysis.pros.length ? aiResponse.analysis.pros : analysis.pros,
            cons: aiResponse.analysis.cons.length ? aiResponse.analysis.cons : analysis.cons,
            tags: [...new Set([...analysis.tags, ...aiResponse.analysis.tags])]
          });
        }
      }

      const validation = validateAIAnalysis(analysis);
      if (!validation.valid) return { ok: false, errors: validation.errors };

      await aiAnalysisRepository.save({
        listing_id: listing.id,
        analysis,
        created_at: new Date().toISOString(),
        model_version: aiProviderAdapter.getProviderId()
      });

      return { ok: true, analysis };
    }
  };
}
