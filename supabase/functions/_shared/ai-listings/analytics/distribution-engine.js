/**
 * AI Listings Analytics — score & label distribution engine (Sprint-12).
 */

/** @type {ReadonlyArray<{ id: string, min: number, max: number, label: string }>} */
export const SCORE_BUCKETS = Object.freeze([
  { id: '0-20', min: 0, max: 20, label: '0-20' },
  { id: '20-40', min: 20, max: 40, label: '20-40' },
  { id: '40-60', min: 40, max: 60, label: '40-60' },
  { id: '60-80', min: 60, max: 80, label: '60-80' },
  { id: '80-100', min: 80, max: 100, label: '80-100' }
]);

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const RISK_TIER_BUCKETS = Object.freeze([
  { id: 'low', label: 'Düşük' },
  { id: 'medium', label: 'Orta' },
  { id: 'high', label: 'Yüksek' }
]);

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const EXECUTIVE_BUCKETS = Object.freeze([
  { id: 'buyable', label: 'Satın Alınabilir' },
  { id: 'reviewable', label: 'İncelenebilir' },
  { id: 'careful', label: 'Dikkatli' },
  { id: 'risky', label: 'Riskli' },
  { id: 'not_recommended', label: 'Önerilmez' }
]);

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const DUPLICATE_BUCKETS = Object.freeze([
  { id: 'exact', label: 'Exact' },
  { id: 'very_similar', label: 'Very Similar' },
  { id: 'similar', label: 'Similar' },
  { id: 'new', label: 'New' }
]);

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const SOURCE_BUCKETS = Object.freeze([
  { id: 'manual', label: 'Manual' },
  { id: 'ai_builder', label: 'AI Builder' },
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
  { id: 'partner_api', label: 'Partner' },
  { id: 'future_partner', label: 'Future Partner' }
]);

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const CATEGORY_BUCKETS = Object.freeze([
  { id: 'vehicle', label: 'Araç' },
  { id: 'housing', label: 'Konut' },
  { id: 'vacation', label: 'Tatil' }
]);

/**
 * @param {number|null|undefined} value
 * @param {ReadonlyArray<{ id: string, min: number, max: number }>} buckets
 * @returns {string|null}
 */
export function bucketScoreValue(value, buckets = SCORE_BUCKETS) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const clamped = Math.max(0, Math.min(100, num));
  for (const bucket of buckets) {
    if (clamped >= bucket.min && (clamped < bucket.max || (bucket.max === 100 && clamped <= 100))) {
      return bucket.id;
    }
  }
  return buckets[buckets.length - 1]?.id ?? null;
}

/**
 * @param {number|null|undefined} riskScore
 * @returns {'low'|'medium'|'high'|null}
 */
export function classifyRiskTier(riskScore) {
  const num = Number(riskScore);
  if (!Number.isFinite(num)) return null;
  if (num <= 30) return 'low';
  if (num <= 60) return 'medium';
  return 'high';
}

/**
 * @param {unknown} label
 * @returns {string|null}
 */
export function classifyExecutiveBucket(label) {
  const value = String(label ?? '').trim();
  if (!value) return null;
  if (value === 'Satın Alınabilir') return 'buyable';
  if (value === 'İncelenebilir') return 'reviewable';
  if (value === 'Dikkatli İncelenmeli' || value === 'Dikkatli') return 'careful';
  if (value === 'Riskli') return 'risky';
  if (value === 'Önerilmez') return 'not_recommended';
  return null;
}

/**
 * @param {unknown} status
 * @param {number|null|undefined} [similarity]
 * @returns {'exact'|'very_similar'|'similar'|'new'}
 */
export function classifyDuplicateBucket(status, similarity = null) {
  const sim = Number(similarity);
  if (Number.isFinite(sim)) {
    if (sim >= 95) return 'exact';
    if (sim >= 85) return 'very_similar';
    if (sim >= 60) return 'similar';
    return 'new';
  }
  const key = String(status ?? 'new').trim().toLowerCase();
  if (key === 'exact') return 'exact';
  if (key === 'similar') return 'similar';
  return 'new';
}

/**
 * @param {string} category
 * @returns {string|null}
 */
export function normalizeCategoryBucket(category) {
  const key = String(category ?? '').trim().toLowerCase();
  if (key === 'vehicle') return 'vehicle';
  if (key === 'housing' || key === 'real_estate') return 'housing';
  if (key === 'vacation') return 'vacation';
  return null;
}

/**
 * @param {ReadonlyArray<{ id: string, label: string }>} bucketDefs
 * @returns {Record<string, number>}
 */
export function createEmptyBucketCounts(bucketDefs) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const bucket of bucketDefs) counts[bucket.id] = 0;
  return counts;
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} field
 * @param {ReadonlyArray<{ id: string, min: number, max: number, label: string }>} [buckets]
 * @returns {Array<{ id: string, label: string, count: number }>}
 */
export function computeScoreDistribution(records, field, buckets = SCORE_BUCKETS) {
  const counts = createEmptyBucketCounts(buckets);
  for (const record of records) {
    const bucketId = bucketScoreValue(record[field], buckets);
    if (bucketId) counts[bucketId] += 1;
  }
  return buckets.map((bucket) => ({ id: bucket.id, label: bucket.label, count: counts[bucket.id] ?? 0 }));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {Array<{ id: string, label: string, count: number }>}
 */
export function computeRiskTierDistribution(records) {
  const counts = createEmptyBucketCounts(RISK_TIER_BUCKETS);
  for (const record of records) {
    const tier = classifyRiskTier(record.risk_score);
    if (tier) counts[tier] += 1;
  }
  return RISK_TIER_BUCKETS.map((bucket) => ({ id: bucket.id, label: bucket.label, count: counts[bucket.id] ?? 0 }));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {Array<{ id: string, label: string, count: number }>}
 */
export function computeExecutiveDistribution(records) {
  const counts = createEmptyBucketCounts(EXECUTIVE_BUCKETS);
  for (const record of records) {
    const bucket = classifyExecutiveBucket(record.executive_label);
    if (bucket) counts[bucket] += 1;
  }
  return EXECUTIVE_BUCKETS.map((bucket) => ({ id: bucket.id, label: bucket.label, count: counts[bucket.id] ?? 0 }));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {Array<{ id: string, label: string, count: number }>}
 */
export function computeDuplicateDistribution(records) {
  const counts = createEmptyBucketCounts(DUPLICATE_BUCKETS);
  for (const record of records) {
    const bucket = classifyDuplicateBucket(record.duplicate_status, record.duplicate_similarity);
    counts[bucket] += 1;
  }
  return DUPLICATE_BUCKETS.map((bucket) => ({ id: bucket.id, label: bucket.label, count: counts[bucket.id] ?? 0 }));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {Array<{ id: string, label: string, count: number }>}
 */
export function computeSourceDistribution(records) {
  const counts = createEmptyBucketCounts(SOURCE_BUCKETS);
  for (const record of records) {
    const source = String(record.source ?? 'manual');
    if (counts[source] !== undefined) counts[source] += 1;
    else counts.manual += 1;
  }
  return SOURCE_BUCKETS.map((bucket) => ({ id: bucket.id, label: bucket.label, count: counts[bucket.id] ?? 0 }));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {Array<{ id: string, label: string, count: number }>}
 */
export function computeCategoryDistribution(records) {
  const counts = createEmptyBucketCounts(CATEGORY_BUCKETS);
  for (const record of records) {
    const bucket = normalizeCategoryBucket(record.category);
    if (bucket) counts[bucket] += 1;
  }
  return CATEGORY_BUCKETS.map((bucket) => ({ id: bucket.id, label: bucket.label, count: counts[bucket.id] ?? 0 }));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} field
 * @param {number} [limit]
 * @returns {Array<{ label: string, count: number }>}
 */
export function computeTopCounts(records, field, limit = 10) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const record of records) {
    const label = String(record[field] ?? '').trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'tr'))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

/**
 * @param {number[]} values
 * @returns {number|null}
 */
export function roundAverage(values) {
  if (!values.length) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
