/**
 * Listing Data Pool — shared barrel (Sprint-31 / Faz C).
 */

import { runListingNormalizationEngine } from './listing-normalization-engine.js';
import { runDuplicateClusterEngine } from './duplicate-cluster-engine.js';
import { runListingQualityEnrichment } from './listing-quality-enrichment.js';
import { runEntityResolutionEngine } from './entity-resolution-engine.js';

export {
  SUPPORTED_LISTING_CATEGORIES,
  CATEGORY_CRITICAL_FIELDS,
  clearListingNormalizationMemoCache,
  buildListingNormalizationCacheKey,
  isSupportedListingCategory,
  detectMissingCategoryFields,
  normalizeListingRecord,
  runListingNormalizationEngine
} from './listing-normalization-engine.js';

export {
  clearDuplicateClusterMemoCache,
  buildDuplicateClusterCacheKey,
  buildDuplicateClusterForListing,
  runDuplicateClusterEngine
} from './duplicate-cluster-engine.js';

export {
  ENRICHMENT_SIGNALS,
  clearListingQualityEnrichmentMemoCache,
  computeListingDataCompleteness,
  resolveCompletenessLevel,
  enrichListingQuality,
  runListingQualityEnrichment
} from './listing-quality-enrichment.js';

export {
  clearEntityResolutionMemoCache,
  buildEntityResolutionCacheKey,
  buildEntityFingerprint,
  computeEntityConfidence,
  resolveEntityConfidenceLevel,
  resolveListingEntity,
  runEntityResolutionEngine
} from './entity-resolution-engine.js';

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runListingDataPoolEngine(listings, options = {}) {
  const normalization = runListingNormalizationEngine(listings, options);
  const normalizedListings = /** @type {Array<Record<string, unknown>>} */ (
    normalization.normalizedListings ?? []
  );
  const duplicateClusters = runDuplicateClusterEngine(normalizedListings, options);
  const qualityEnrichment = runListingQualityEnrichment(normalizedListings, options);
  const entityResolution = runEntityResolutionEngine(normalizedListings, options);

  return {
    normalization,
    duplicateClusters,
    qualityEnrichment,
    entityResolution,
    avgDataCompleteness: normalization.avgDataCompleteness,
    avgEntityConfidence: entityResolution.avgEntityConfidence
  };
}
