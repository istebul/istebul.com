/**
 * AI Listings Admin — normalized KPI dataset (Sprint-29).
 */

import { normalizeAdminDataset } from './ai-listings-dataset.js';

/**
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>|null}
 */
function extractLatestAnalysis(listing) {
  const analysis = listing?.latest_analysis;
  if (analysis && typeof analysis === 'object') return /** @type {Record<string, unknown>} */ (analysis);
  return null;
}

/** @type {number} */
export const HIGH_RISK_THRESHOLD = 61;

/**
 * @param {Array<Record<string, unknown>>} listings
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeListingsDataset(listings) {
  return normalizeAdminDataset(listings);
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {string} [searchQuery]
 * @returns {Array<Record<string, unknown>>}
 */
export function filterListingsForDisplay(listings, searchQuery = '') {
  const normalized = normalizeListingsDataset(listings);
  const query = String(searchQuery ?? '').trim().toLowerCase();
  if (!query) return normalized;

  return normalized.filter((listing) => {
    const haystack = [
      listing.title,
      listing.category,
      listing.status,
      listing.source_type,
      listing.location,
      listing.id
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ');
    return haystack.includes(query);
  });
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {boolean}
 */
export function isArchivedListing(listing) {
  return String(listing?.status ?? '').toLowerCase() === 'archived';
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {boolean}
 */
export function isDuplicateListing(listing) {
  const dup = String(listing?.duplicate_status ?? listing?.duplicate_label ?? '').toLowerCase();
  if (dup === 'duplicate' || dup === 'mukerrer' || dup === 'exact' || dup === 'similar') return true;
  if (listing?.is_duplicate === true) return true;
  return false;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function safeScore(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ searchQuery?: string }} [options]
 * @returns {Record<string, unknown>}
 */
export function computeNormalizedKpiStats(listings, options = {}) {
  const dataset = filterListingsForDisplay(listings, options.searchQuery);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let active = 0;
  let archived = 0;
  let duplicate = 0;
  let highRisk = 0;
  let pendingReview = 0;
  let todayAdded = 0;
  let last7Days = 0;
  let last30Days = 0;
  let analyzedToday = 0;
  let analyzedYesterday = 0;

  /** @type {number[]} */
  const aiScores = [];
  /** @type {number[]} */
  const riskScores = [];
  /** @type {number[]} */
  const qualityScores = [];

  for (const listing of dataset) {
    if (isArchivedListing(listing)) {
      archived += 1;
    } else {
      active += 1;
    }

    if (isDuplicateListing(listing)) duplicate += 1;

    const status = String(listing.status ?? '');
    if (status === 'pending_review' || status === 'review') pendingReview += 1;

    const createdAt = String(listing.created_at ?? '').slice(0, 10);
    if (createdAt === today) todayAdded += 1;
    if (createdAt >= weekAgo) last7Days += 1;
    if (createdAt >= monthAgo) last30Days += 1;

    const analysis = extractLatestAnalysis(listing);
    const risk = safeScore(analysis?.risk_score);
    const quality = safeScore(analysis?.quality_score);
    const ai = safeScore(analysis?.ai_score ?? analysis?.decision_score);

    if (risk != null) {
      riskScores.push(risk);
      if (risk >= HIGH_RISK_THRESHOLD) highRisk += 1;
    }
    if (quality != null) qualityScores.push(quality);
    if (ai != null) aiScores.push(ai);

    const analyzedAt = String(analysis?.created_at ?? '').slice(0, 10);
    if (analyzedAt === today) analyzedToday += 1;
    if (analyzedAt === yesterday) analyzedYesterday += 1;
  }

  const total = dataset.length;
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
  const analyzedDelta = analyzedToday - analyzedYesterday;
  const weekPct = total > 0 ? Math.round((last7Days / total) * 100) : 0;

  return {
    total,
    active,
    archived,
    duplicate,
    highRisk,
    pendingReview,
    todayAdded,
    last7Days,
    last30Days,
    analyzedToday,
    averageAi: avg(aiScores),
    averageRisk: avg(riskScores),
    averageQuality: avg(qualityScores),
    trends: {
      total: {
        label: weekPct > 0 ? `+${weekPct}%` : '0%',
        hint: 'son 7 gün',
        positive: weekPct >= 0
      },
      'analyzed-today': {
        label: analyzedDelta >= 0 ? `+${analyzedDelta}` : String(analyzedDelta),
        hint: 'düne göre',
        positive: analyzedDelta >= 0
      },
      'high-risk': {
        label: String(highRisk),
        hint: 'risk eşiği',
        positive: highRisk === 0
      },
      pending: {
        label: String(pendingReview),
        hint: 'inceleme kuyruğu',
        positive: pendingReview === 0
      }
    }
  };
}
