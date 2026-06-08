/**
 * Client-side Price Intelligence — re-exports server canonical module.
 */

export {
  runPriceIntelligence,
  mapPricePosition,
  buildPriceIntelligenceTags,
  parsePriceIntelligenceFromTags,
  PRICE_POSITION_THRESHOLDS
} from '../../../supabase/functions/_shared/ai-listings/price/price-intelligence.js';

export { buildPriceSummary, getPricePositionLabelTr, PRICE_POSITION_LABELS_TR } from '../../../supabase/functions/_shared/ai-listings/price/price-summary.js';
