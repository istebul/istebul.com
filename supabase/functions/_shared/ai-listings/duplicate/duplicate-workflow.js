/**
 * Duplicate detection workflow helpers — Sprint-3.
 * Invoked from handler hooks; does not modify analyze pipeline.
 */

import { runDuplicateEngine } from './duplicate-engine.js';

/**
 * @param {Record<string, unknown>} listing
 * @param {Array<Record<string, unknown>>} candidates
 * @param {{ excludeId?: string }} [options]
 */
export function detectListingDuplicate(listing, candidates, options = {}) {
  return runDuplicateEngine(listing, candidates, options);
}

/**
 * @param {Awaited<ReturnType<import('../repositories.js').createEdgeRepositories>>} repos
 * @param {string} listingId
 * @param {Record<string, unknown>} duplicate
 */
export async function emitDuplicateEvents(repos, listingId, duplicate) {
  await repos.createEvent({
    listing_id: listingId,
    event_type: 'duplicate_checked',
    payload: {
      status: duplicate.status,
      similarity: duplicate.similarity,
      fingerprint: duplicate.fingerprint
    }
  });

  if (duplicate.status !== 'new') {
    await repos.createEvent({
      listing_id: listingId,
      event_type: 'duplicate_detected',
      payload: {
        status: duplicate.status,
        similarity: duplicate.similarity,
        matched_listing_id: duplicate.matched_listing_id,
        summary: duplicate.summary
      }
    });
  }
}

/**
 * @param {Awaited<ReturnType<import('../repositories.js').createEdgeRepositories>>} repos
 * @param {Record<string, unknown>} listing
 * @param {{ excludeSelf?: boolean }} [options]
 */
export async function runDuplicateWorkflow(repos, listing, options = {}) {
  const excludeSelf = options.excludeSelf !== false;
  const candidates = await repos.listListings({ limit: 500 });
  const duplicate = detectListingDuplicate(listing, candidates, {
    excludeId: excludeSelf ? String(listing.id ?? '') : ''
  });

  if (listing.id) {
    await emitDuplicateEvents(repos, String(listing.id), duplicate);
  }

  return duplicate;
}

/**
 * @param {Array<Record<string, unknown>>|null|undefined} events
 * @returns {{ status: string|null, similarity: number|null, matched_listing_id: string|null, summary: string|null }}
 */
export function extractDuplicateFromEvents(events) {
  const detected = events?.find((event) => event.event_type === 'duplicate_detected');
  if (detected?.payload && typeof detected.payload === 'object') {
    const payload = /** @type {Record<string, unknown>} */ (detected.payload);
    return {
      status: payload.status ? String(payload.status) : null,
      similarity: Number.isFinite(Number(payload.similarity)) ? Number(payload.similarity) : null,
      matched_listing_id: payload.matched_listing_id ? String(payload.matched_listing_id) : null,
      summary: payload.summary ? String(payload.summary) : null
    };
  }

  const checked = events?.find((event) => event.event_type === 'duplicate_checked');
  if (checked?.payload && typeof checked.payload === 'object') {
    const payload = /** @type {Record<string, unknown>} */ (checked.payload);
    return {
      status: payload.status ? String(payload.status) : null,
      similarity: Number.isFinite(Number(payload.similarity)) ? Number(payload.similarity) : null,
      matched_listing_id: null,
      summary: null
    };
  }

  return {
    status: null,
    similarity: null,
    matched_listing_id: null,
    summary: null
  };
}

/**
 * @param {ReturnType<typeof runDuplicateEngine>} duplicate
 * @returns {{ status: 'exact'|'similar'|'new', similarity: number, matched_listing_id: string|null, summary: string }}
 */
export function toDuplicateOutput(duplicate) {
  return {
    status: duplicate.status,
    similarity: duplicate.similarity,
    matched_listing_id: duplicate.matched_listing_id,
    summary: duplicate.summary
  };
}
