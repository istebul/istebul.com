/**
 * isteBul AI Listings Engine v1 — analysis orchestration pipeline.
 */

import {
  buildAnalysisCons,
  buildAnalysisPros,
  buildAnalysisSummary,
  buildAnalysisTags
} from './analysis-output.js';
import { createEmptyAIAnalysis, normalizeAIAnalysis } from '../models/ai-analysis.js';
import { computeScores } from '../scoring/scoring-engine.js';
import { buildMarketContext } from '../market/market-context.js';
import { buildPricingContext } from '../pricing/pricing-context.js';
import { createStubMarketDataAdapter } from '../repository/adapters/stub-market-data-adapter.js';
import { createStubPricingDataAdapter } from '../repository/adapters/stub-pricing-data-adapter.js';

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../models/ai-analysis.js').AIAnalysis} AIAnalysis */

/**
 * @typedef {Object} AnalysisPipelineInput
 * @property {Listing} listing
 */

/**
 * @typedef {Object} AnalysisPipelineResult
 * @property {boolean} ok
 * @property {AIAnalysis} [analysis]
 * @property {Record<string, unknown>} [context]
 * @property {string[]} [errors]
 */

const defaultMarketAdapter = createStubMarketDataAdapter();
const defaultPricingAdapter = createStubPricingDataAdapter();

/**
 * Run the full deterministic analysis pipeline for a listing.
 * @param {AnalysisPipelineInput} input
 * @returns {Promise<AnalysisPipelineResult>}
 */
export async function runAnalysisPipeline(input) {
  const { listing } = input;

  if (!listing?.id) {
    return { ok: false, errors: ['listing.id is required'] };
  }

  const marketSnapshot = await defaultMarketAdapter.fetchSnapshot({
    category: listing.category,
    location: listing.location,
    currency: listing.currency
  });

  const benchmark = await defaultPricingAdapter.fetchBenchmark({
    category: listing.category,
    location: listing.location,
    attributes: listing.attributes
  });

  const marketContext = buildMarketContext({ listing, snapshot: marketSnapshot });
  const pricingContext = buildPricingContext({ listing, benchmark, marketSnapshot });

  const scores = computeScores({ listing });

  const analysis = normalizeAIAnalysis(
    createEmptyAIAnalysis({
      ai_score: scores.ai_score,
      risk_score: scores.risk_score,
      market_score: scores.market_score,
      price_score: scores.price_score,
      confidence: scores.confidence,
      summary: buildAnalysisSummary(listing, scores),
      pros: buildAnalysisPros(listing, scores),
      cons: buildAnalysisCons(listing, scores),
      tags: buildAnalysisTags(listing, scores)
    })
  );

  const recommendation = {
    rank_score: Math.round(scores.ai_score * 0.5 + scores.market_score * 0.25 + scores.price_score * 0.25),
    reasons: scores.ai_score >= 70 ? ['High overall quality score'] : ['Rules-based ranking']
  };

  return {
    ok: true,
    analysis,
    context: {
      market: marketContext,
      pricing: pricingContext,
      scoring: {
        version: scores.scoring_version,
        factor_scores: scores.factor_scores ?? {}
      },
      sources: {
        market: defaultMarketAdapter.getSourceId(),
        pricing: defaultPricingAdapter.getSourceId()
      },
      recommendation
    }
  };
}
