/**
 * isteBul AI Listings Edge API — deterministic analysis pipeline (Sprint-6).
 */

import { buildListingAnalysis, computeListingScores } from './scoring-engine.js';

/**
 * @param {{ listing: Record<string, unknown> }} input
 */
export async function runListingAnalysisPipeline(input) {
  const { listing } = input;
  if (!listing?.id) {
    return { ok: false, errors: ['listing.id is required'] };
  }

  const scores = computeListingScores({ listing });
  const analysis = buildListingAnalysis(listing, scores);

  const recommendation = {
    rank_score: Math.round(scores.ai_score * 0.5 + scores.market_score * 0.25 + scores.price_score * 0.25),
    reasons: scores.ai_score >= 70 ? ['High overall quality score'] : ['Rules-based ranking']
  };

  return {
    ok: true,
    analysis,
    context: {
      market: { has_live_data: false, note: 'Rules-based market context (stub adapters not connected)' },
      pricing: { has_benchmark: false, listing_price: Number(listing.price ?? 0) },
      scoring: {
        version: scores.scoring_version,
        factor_scores: scores.factor_scores ?? {}
      },
      recommendation
    }
  };
}
