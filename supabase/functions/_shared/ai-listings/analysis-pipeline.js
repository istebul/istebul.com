/**
 * isteBul AI Listings Edge API — placeholder analysis pipeline.
 * Mirrors src/ai-listings/analysis/analysis-pipeline.js behavior.
 */

function clampScore(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

/**
 * @param {{ listing: Record<string, unknown> }} input
 */
export async function runListingAnalysisPipeline(input) {
  const { listing } = input;
  if (!listing?.id) {
    return { ok: false, errors: ['listing.id is required'] };
  }

  const title = String(listing.title ?? '').trim();
  const description = String(listing.description ?? '').trim();
  const price = Number(listing.price ?? 0);
  const location = String(listing.location ?? '').trim();

  const completeness =
    (title ? 25 : 0) + (description.length > 10 ? 25 : 0) + (price > 0 ? 25 : 0) + (location ? 25 : 0);

  const market_score = 0;
  const price_score = price > 0 ? 40 : 0;
  const ai_score = clampScore(completeness * 0.4 + market_score * 0.3 + price_score * 0.3);
  const risk_score = clampScore(100 - ai_score);
  const confidence = Math.min(1, (title && price > 0 ? 0.6 : 0.3));

  const pros = [];
  if (title) pros.push('Title provided');
  if (description.length > 20) pros.push('Detailed description');
  if (Array.isArray(listing.images) && listing.images.length > 0) {
    pros.push(`${listing.images.length} image(s) attached`);
  }

  const cons = [];
  if (!description) cons.push('Missing description');
  if (!location) cons.push('Missing location');
  if (price <= 0) cons.push('Price not set');

  const analysis = {
    ai_score,
    risk_score,
    market_score,
    price_score,
    confidence,
    summary: `Placeholder analysis for "${title || listing.id}": overall score ${ai_score}/100.`,
    pros: pros.length ? pros : ['Insufficient data for strengths'],
    cons: cons.length ? cons : ['No critical gaps detected in placeholder check'],
    tags: [String(listing.category ?? 'general'), 'edge-pipeline', 'placeholder']
  };

  const recommendation = {
    rank_score: clampScore(ai_score * 0.5 + market_score * 0.25 + price_score * 0.25),
    reasons: ai_score >= 70 ? ['High overall quality score'] : ['Placeholder ranking']
  };

  return {
    ok: true,
    analysis,
    context: {
      market: { has_live_data: false, note: 'Stub market context in edge pipeline' },
      pricing: { has_benchmark: false, listing_price: price },
      recommendation
    }
  };
}
