/**
 * Market Intelligence — client re-exports (Sprint-7).
 */

export {
  runMarketIntelligence,
  computeMarketContextScore,
  buildMarketIntelligenceTags,
  parseMarketTagString,
  parseMarketIntelligenceFromTags
} from '../../../supabase/functions/_shared/ai-listings/market-intelligence/market-intelligence.js';

export {
  SEGMENT_LABELS_TR,
  getDemandLabel,
  getLiquidityLabel,
  getMarketTrend,
  getSegmentLabel,
  FORBIDDEN_MARKET_PHRASES
} from '../../../supabase/functions/_shared/ai-listings/market-intelligence/market-model.js';

export { detectVehicleSegment } from '../../../supabase/functions/_shared/ai-listings/market-intelligence/segment-model.js';
