/**
 * Duplicate detection orchestrator — Sprint-3.
 */

import { normalizeCanonicalListing } from '../engine/canonical-engine.js';
import { buildListingFingerprint } from './fingerprint-engine.js';
import { computeListingSimilarity } from './similarity-engine.js';

/** @type {Readonly<{ exact: number, similar: number }>} */
export const DUPLICATE_THRESHOLDS = Object.freeze({
  exact: 95,
  similar: 60
});

/**
 * @param {number} similarity
 * @returns {'exact'|'similar'|'new'}
 */
export function resolveDuplicateStatus(similarity) {
  if (similarity >= DUPLICATE_THRESHOLDS.exact) return 'exact';
  if (similarity >= DUPLICATE_THRESHOLDS.similar) return 'similar';
  return 'new';
}

/**
 * @param {'exact'|'similar'|'new'} status
 * @param {number} similarity
 * @param {Record<string, unknown>} [matchedListing]
 * @returns {string}
 */
export function buildDuplicateSummary(status, similarity, matchedListing) {
  const title = String(matchedListing?.title ?? 'mevcut ilan').trim() || 'mevcut ilan';

  if (status === 'exact') {
    return `%${similarity} eşleşme ile aynı ilan bulundu: ${title}.`;
  }
  if (status === 'similar') {
    return `%${similarity} benzerlik ile yakın eşleşme bulundu: ${title}.`;
  }
  return 'Benzer ilan bulunamadı; yeni kayıt oluşturulabilir.';
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} candidate
 * @returns {{ listing: Record<string, unknown>, similarity: number, fingerprint: string }}
 */
export function scoreCandidateMatch(listing, candidate) {
  const fingerprint = buildListingFingerprint(candidate).hash;
  return {
    listing: candidate,
    similarity: computeListingSimilarity(listing, candidate),
    fingerprint
  };
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Array<Record<string, unknown>>} candidates
 * @param {{ excludeId?: string, limit?: number }} [options]
 * @returns {{
 *   status: 'exact'|'similar'|'new',
 *   similarity: number,
 *   matched_listing_id: string|null,
 *   matched_listing: Record<string, unknown>|null,
 *   summary: string,
 *   fingerprint: string,
 *   matches: Array<{ listing_id: string, similarity: number, title: string }>
 * }}
 */
export function runDuplicateEngine(listing, candidates = [], options = {}) {
  const excludeId = String(options.excludeId ?? listing.id ?? '').trim();
  const limit = options.limit ?? 5;
  const fingerprint = buildListingFingerprint(listing).hash;

  const scored = candidates
    .filter((candidate) => {
      const candidateId = String(candidate.id ?? '').trim();
      return candidateId && candidateId !== excludeId;
    })
    .map((candidate) => scoreCandidateMatch(listing, candidate))
    .sort((left, right) => right.similarity - left.similarity);

  const best = scored[0] ?? null;
  const similarity = best?.similarity ?? 0;
  const status = resolveDuplicateStatus(similarity);
  const matchedListing = status === 'new' ? null : best?.listing ?? null;

  return {
    status,
    similarity,
    matched_listing_id: matchedListing ? String(matchedListing.id ?? '') || null : null,
    matched_listing: matchedListing,
    summary: buildDuplicateSummary(status, similarity, matchedListing ?? undefined),
    fingerprint,
    matches: scored.slice(0, limit).map((match) => ({
      listing_id: String(match.listing.id ?? ''),
      similarity: match.similarity,
      title: String(match.listing.title ?? '')
    }))
  };
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>}
 */
export function toDuplicateCandidate(listing) {
  return normalizeCanonicalListing(listing);
}
