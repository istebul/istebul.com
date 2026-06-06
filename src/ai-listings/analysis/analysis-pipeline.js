/**
 * isteBul AI Listings Engine v1 — analysis orchestration pipeline.
 */

import { createEmptyAIAnalysis, normalizeAIAnalysis } from '../models/ai-analysis.js';
import { computeScores } from '../scoring/scoring-engine.js';
import { buildMarketContext } from '../market/market-context.js';
import { buildPricingContext } from '../pricing/pricing-context.js';
import { computePriceScore } from '../pricing/pricing-engine.js';
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

// Pipeline uses stub adapters internally until DI wiring is activated in production.
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

  const price_score = computePriceScore({ listing, benchmark });
  const market_score = marketSnapshot.has_data ? 50 : 0;

  const scores = computeScores({ listing, market_score, price_score });

  const analysis = normalizeAIAnalysis(
    createEmptyAIAnalysis({
      ...scores,
      summary: buildPlaceholderSummary(listing, scores),
      pros: buildPlaceholderPros(listing),
      cons: buildPlaceholderCons(listing),
      tags: [listing.category, marketSnapshot.has_data ? 'market-data' : 'no-market-data']
    })
  );

  return {
    ok: true,
    analysis,
    context: {
      market: marketContext,
      pricing: pricingContext,
      sources: {
        market: defaultMarketAdapter.getSourceId(),
        pricing: defaultPricingAdapter.getSourceId()
      }
    }
  };
}

/**
 * @param {Listing} listing
 * @param {import('../scoring/scoring-engine.js').ScoringResult} scores
 * @returns {string}
 */
function buildPlaceholderSummary(listing, scores) {
  return `Placeholder analysis for "${listing.title || listing.id}": overall score ${scores.ai_score}/100. Live AI narration not connected.`;
}

/**
 * @param {Listing} listing
 * @returns {string[]}
 */
function buildPlaceholderPros(listing) {
  const pros = [];
  if (listing.title) pros.push('Title provided');
  if (listing.description.length > 20) pros.push('Detailed description');
  if (listing.images.length > 0) pros.push(`${listing.images.length} image(s) attached`);
  return pros.length ? pros : ['Insufficient data for strengths'];
}

/**
 * @param {Listing} listing
 * @returns {string[]}
 */
function buildPlaceholderCons(listing) {
  const cons = [];
  if (!listing.description) cons.push('Missing description');
  if (!listing.location) cons.push('Missing location');
  if (listing.price <= 0) cons.push('Price not set');
  return cons.length ? cons : ['No critical gaps detected in placeholder check'];
}
