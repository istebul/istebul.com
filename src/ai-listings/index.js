/**
 * isteBul AI Listings Engine v1 — public module surface.
 *
 * ISOLATED MODULE — not imported by production code.
 * Feature flag defaults to inactive; safe to ship as architecture scaffold.
 */

export {
  isAiListingsEnabled,
  setAiListingsLocalOverride,
  clearAiListingsLocalOverride,
  isAiListingsSupabaseAdapterEnabled,
  setAiListingsSupabaseLocalOverride,
  clearAiListingsSupabaseLocalOverride,
  AI_LISTINGS_MODULE_VERSION,
  AI_LISTINGS_MODULE_ID
} from './core/config.js';
export { DATA_SOURCE_IDS, LISTING_CATEGORIES, DEFAULT_CURRENCY } from './core/constants.js';
export { createAiListingsContainer } from './core/di-container.js';

export { createEmptyListing, validateListing } from './models/listing.js';
export { createEmptyAIAnalysis, normalizeAIAnalysis, validateAIAnalysis } from './models/ai-analysis.js';

export { createListingService } from './services/listing-service.js';
export { createAIAnalysisService } from './services/ai-analysis-service.js';
export { createMarketAnalysisService } from './services/market-analysis-service.js';
export { createPricingService } from './services/pricing-service.js';
export { createRecommendationService } from './services/recommendation-service.js';

export { processListing } from './engine/listing-engine.js';
export { runAnalysisPipeline } from './analysis/analysis-pipeline.js';
export { computeScores } from './scoring/scoring-engine.js';

export { createSupabaseAiListingRepository, isSupabaseAiListingRepositoryAvailable } from './repository/supabase/supabase-ai-listing-repository.js';
export { createSupabaseAiAnalysisRepository, isSupabaseAiAnalysisRepositoryAvailable } from './repository/supabase/supabase-ai-analysis-repository.js';
export { SUPABASE_TABLES, SUPABASE_ADAPTER_INACTIVE_ERROR } from './repository/supabase/supabase-adapter-guard.js';
