/**
 * isteBul AI Listings Engine v1 — RecommendationService (placeholder).
 */

import { isAiListingsEnabled } from '../core/config.js';
import { generateRecommendations } from '../recommendation/recommendation-engine.js';

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../models/ai-analysis.js').AIAnalysis} AIAnalysis */
/** @typedef {import('./listing-service.js').createListingService} ListingServiceFactory */
/** @typedef {import('./ai-analysis-service.js').createAIAnalysisService} AIAnalysisServiceFactory */
/** @typedef {import('./market-analysis-service.js').createMarketAnalysisService} MarketAnalysisServiceFactory */
/** @typedef {import('./pricing-service.js').createPricingService} PricingServiceFactory */

/**
 * @typedef {Object} RecommendationServiceDeps
 * @property {ReturnType<ListingServiceFactory>} listingService
 * @property {ReturnType<AIAnalysisServiceFactory>} aiAnalysisService
 * @property {ReturnType<MarketAnalysisServiceFactory>} marketAnalysisService
 * @property {ReturnType<PricingServiceFactory>} pricingService
 */

/**
 * @typedef {Object} ListingRecommendation
 * @property {Listing} listing
 * @property {AIAnalysis|null} analysis
 * @property {number} rank_score
 * @property {string[]} reasons
 */

/**
 * @param {RecommendationServiceDeps} deps
 */
export function createRecommendationService(deps) {
  const { listingService, aiAnalysisService, marketAnalysisService, pricingService } = deps;

  return {
    /**
     * @param {{ category?: string, location?: string, limit?: number }} [criteria]
     * @returns {Promise<ListingRecommendation[]>}
     */
    async recommend(criteria = {}) {
      if (!isAiListingsEnabled()) return [];

      const listings = await listingService.list({
        category: criteria.category,
        location: criteria.location,
        limit: criteria.limit ?? 10
      });

      const recommendations = [];

      for (const listing of listings) {
        const [analysis, market, pricing] = await Promise.all([
          aiAnalysisService.getByListingId(listing.id),
          marketAnalysisService.analyzeListing(listing),
          pricingService.analyzeListing(listing)
        ]);

        const rec = generateRecommendations({
          listing,
          analysis,
          market_score: market?.market_score ?? 0,
          price_score: pricing?.price_score ?? 0
        });

        recommendations.push(rec);
      }

      return recommendations
        .sort((a, b) => b.rank_score - a.rank_score)
        .slice(0, criteria.limit ?? 10);
    }
  };
}
