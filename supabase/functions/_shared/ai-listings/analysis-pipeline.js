/**
 * isteBul AI Listings Edge API — canonical analysis pipeline (Sprint-2).
 */

import { runCanonicalEngine, ANALYSIS_ENGINE_VERSION } from './engine/canonical-engine.js';

export { ANALYSIS_ENGINE_VERSION };

/**
 * @param {{ listing: Record<string, unknown> }} input
 */
export async function runListingAnalysisPipeline(input) {
  return runCanonicalEngine(input);
}
