/**
 * isteBul AI Listings Engine v1 — lightweight dependency container.
 *
 * Wires repositories and adapters without coupling to production modules.
 * Production code must NOT import this container until integration phase.
 */

import { isAiListingsEnabled } from './config.js';
import { createListingService } from '../services/listing-service.js';
import { createAIAnalysisService } from '../services/ai-analysis-service.js';
import { createMarketAnalysisService } from '../services/market-analysis-service.js';
import { createPricingService } from '../services/pricing-service.js';
import { createRecommendationService } from '../services/recommendation-service.js';
import { createInMemoryListingRepository } from '../repository/in-memory/in-memory-listing-repository.js';
import { createInMemoryAIAnalysisRepository } from '../repository/in-memory/in-memory-ai-analysis-repository.js';
import { createStubMarketDataAdapter } from '../repository/adapters/stub-market-data-adapter.js';
import { createStubPricingDataAdapter } from '../repository/adapters/stub-pricing-data-adapter.js';
import { createStubAIProviderAdapter } from '../repository/adapters/stub-ai-provider-adapter.js';

/** @typedef {import('../repository/listing-repository.interface.js').ListingRepository} ListingRepository */
/** @typedef {import('../repository/ai-analysis-repository.interface.js').AIAnalysisRepository} AIAnalysisRepository */
/** @typedef {import('../repository/adapters/market-data-adapter.interface.js').MarketDataAdapter} MarketDataAdapter */
/** @typedef {import('../repository/adapters/pricing-data-adapter.interface.js').PricingDataAdapter} PricingDataAdapter */
/** @typedef {import('../repository/adapters/ai-provider-adapter.interface.js').AIProviderAdapter} AIProviderAdapter */

/**
 * @typedef {Object} AiListingsDependencies
 * @property {ListingRepository} listingRepository
 * @property {AIAnalysisRepository} aiAnalysisRepository
 * @property {MarketDataAdapter} marketDataAdapter
 * @property {PricingDataAdapter} pricingDataAdapter
 * @property {AIProviderAdapter} aiProviderAdapter
 */

/**
 * @typedef {Object} AiListingsServices
 * @property {ReturnType<typeof createListingService>} listingService
 * @property {ReturnType<typeof createAIAnalysisService>} aiAnalysisService
 * @property {ReturnType<typeof createMarketAnalysisService>} marketAnalysisService
 * @property {ReturnType<typeof createPricingService>} pricingService
 * @property {ReturnType<typeof createRecommendationService>} recommendationService
 */

/**
 * @typedef {Object} AiListingsContainer
 * @property {AiListingsDependencies} deps
 * @property {AiListingsServices} services
 * @property {boolean} enabled
 */

/**
 * Create the default placeholder container (in-memory + stub adapters).
 *
 * Supabase repositories are NOT used by default.
 * Use createAiListingsRepositories({ mode: 'supabase', client }) in server context when enabled.
 *
 * @param {Partial<AiListingsDependencies>} [overrides]
 * @returns {AiListingsContainer}
 */
export function createAiListingsContainer(overrides = {}) {
  const deps = {
    listingRepository: overrides.listingRepository ?? createInMemoryListingRepository(),
    aiAnalysisRepository: overrides.aiAnalysisRepository ?? createInMemoryAIAnalysisRepository(),
    marketDataAdapter: overrides.marketDataAdapter ?? createStubMarketDataAdapter(),
    pricingDataAdapter: overrides.pricingDataAdapter ?? createStubPricingDataAdapter(),
    aiProviderAdapter: overrides.aiProviderAdapter ?? createStubAIProviderAdapter()
  };

  const listingService = createListingService({ listingRepository: deps.listingRepository });
  const aiAnalysisService = createAIAnalysisService({
    aiAnalysisRepository: deps.aiAnalysisRepository,
    aiProviderAdapter: deps.aiProviderAdapter
  });
  const marketAnalysisService = createMarketAnalysisService({
    marketDataAdapter: deps.marketDataAdapter
  });
  const pricingService = createPricingService({
    pricingDataAdapter: deps.pricingDataAdapter,
    marketDataAdapter: deps.marketDataAdapter
  });
  const recommendationService = createRecommendationService({
    listingService,
    aiAnalysisService,
    marketAnalysisService,
    pricingService
  });

  return {
    deps,
    services: {
      listingService,
      aiAnalysisService,
      marketAnalysisService,
      pricingService,
      recommendationService
    },
    enabled: isAiListingsEnabled()
  };
}
