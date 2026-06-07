/**
 * AI Listings Repository Engine v1 — canonical record model (Sprint-11).
 * Derives repository records from existing listing + analysis objects; no DB schema change.
 */

import { normalizeCanonicalListing, parsePersistedAnalysisFields } from '../engine/canonical-engine.js';
import { parseExecutiveFromTags } from '../executive/executive-engine.js';
import { getExecutiveLabel } from '../executive/executive-recommendation.js';
import { buildListingFingerprint } from '../duplicate/fingerprint-engine.js';
import { runDuplicateEngine } from '../duplicate/duplicate-engine.js';
import { extractDuplicateFromEvents } from '../duplicate/duplicate-workflow.js';

/** @type {ReadonlyArray<string>} */
export const REPOSITORY_SOURCE_TYPES = Object.freeze([
  'manual',
  'ai_builder',
  'csv',
  'json',
  'partner_api',
  'future_partner'
]);

/** @type {Readonly<Record<string, string>>} */
export const REPOSITORY_SOURCE_ALIASES = Object.freeze({
  manual: 'manual',
  ai_builder: 'ai_builder',
  'ai-builder': 'ai_builder',
  builder: 'ai_builder',
  csv: 'csv',
  json: 'json',
  partner_api: 'partner_api',
  'partner-api': 'partner_api',
  partner: 'partner_api',
  future_partner: 'future_partner',
  'future-partner': 'future_partner'
});

/**
 * @param {unknown} sourceType
 * @returns {string}
 */
export function normalizeRepositorySource(sourceType) {
  const key = String(sourceType ?? 'manual')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return REPOSITORY_SOURCE_ALIASES[key] ?? 'manual';
}

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {{ quality_score: number|null, risk_score: number|null, decision_score: number|null, executive_label: string|null }}
 */
export function extractRepositoryScores(analysis) {
  if (!analysis || typeof analysis !== 'object') {
    return { quality_score: null, risk_score: null, decision_score: null, executive_label: null };
  }

  const parsed = parsePersistedAnalysisFields(analysis);
  const tags = Array.isArray(analysis.tags) ? analysis.tags.map(String) : [];
  const executive = parseExecutiveFromTags(tags);

  const quality_score = parsed.quality_score;
  const risk_score = Number.isFinite(Number(analysis.risk_score)) ? Number(analysis.risk_score) : null;
  const decision_score =
    parsed.decision_score ??
    (Number.isFinite(Number(analysis.ai_score)) ? Number(analysis.ai_score) : null);

  let executive_label = executive.executive_label ?? null;
  if (!executive_label && decision_score !== null) {
    executive_label = getExecutiveLabel(decision_score);
  }

  return { quality_score, risk_score, decision_score, executive_label };
}

/**
 * @param {Record<string, unknown>} listing
 * @param {{ analysis?: Record<string, unknown>|null, duplicateStatus?: string|null, events?: Array<Record<string, unknown>>|null }} [options]
 * @returns {Record<string, unknown>}
 */
export function deriveRepositoryRecord(listing, options = {}) {
  const canonical = normalizeCanonicalListing(listing);
  const fingerprint = buildListingFingerprint(listing).hash;
  const analysis = options.analysis ?? listing.latest_analysis ?? null;
  const scores = extractRepositoryScores(
    analysis && typeof analysis === 'object' ? /** @type {Record<string, unknown>} */ (analysis) : null
  );

  let duplicate_status = 'new';
  if (options.duplicateStatus) {
    duplicate_status = String(options.duplicateStatus);
  } else if (Array.isArray(options.events)) {
    const fromEvents = extractDuplicateFromEvents(options.events);
    if (fromEvents.status) duplicate_status = fromEvents.status;
  } else if (listing.duplicate_status) {
    duplicate_status = String(listing.duplicate_status);
  }

  return {
    id: String(canonical.id ?? listing.id ?? ''),
    fingerprint,
    category: String(canonical.category ?? 'general'),
    title: String(canonical.title ?? ''),
    brand: String(canonical.brand ?? ''),
    model: String(canonical.model ?? ''),
    year: canonical.year ?? null,
    price: canonical.price ?? null,
    currency: String(canonical.currency ?? 'TRY'),
    quality_score: scores.quality_score,
    risk_score: scores.risk_score,
    decision_score: scores.decision_score,
    executive_label: scores.executive_label,
    duplicate_status,
    source: normalizeRepositorySource(listing.source_type),
    status: String(listing.status ?? 'draft'),
    created_at: String(listing.created_at ?? canonical.created_at ?? ''),
    updated_at: String(listing.updated_at ?? canonical.updated_at ?? '')
  };
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ includeDuplicateDetection?: boolean }} [options]
 * @returns {Array<Record<string, unknown>>}
 */
export function buildRepositoryRecords(listings, options = {}) {
  const includeDuplicateDetection = options.includeDuplicateDetection !== false;

  /** @type {Map<string, string>} */
  const duplicateById = new Map();

  if (includeDuplicateDetection && listings.length > 1) {
    for (const listing of listings) {
      const duplicate = runDuplicateEngine(listing, listings, {
        excludeId: String(listing.id ?? '')
      });
      duplicateById.set(String(listing.id ?? ''), duplicate.status);
    }
  }

  return listings.map((listing) =>
    deriveRepositoryRecord(listing, {
      analysis: listing.latest_analysis ?? null,
      duplicateStatus: duplicateById.get(String(listing.id ?? '')) ?? listing.duplicate_status ?? null,
      events: Array.isArray(listing.events) ? listing.events : null
    })
  );
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {Map<string, Array<Record<string, unknown>>>}
 */
export function groupDuplicatesByFingerprint(records) {
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const groups = new Map();

  for (const record of records) {
    const fp = String(record.fingerprint ?? '');
    if (!fp) continue;
    const bucket = groups.get(fp) ?? [];
    bucket.push(record);
    groups.set(fp, bucket);
  }

  return groups;
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {boolean}
 */
export function isActiveRepositoryRecord(record) {
  return String(record.status ?? '') !== 'archived';
}
