/**
 * AI Listings Analytics — trend engine (Sprint-12).
 */

/** @type {Readonly<Record<string, number>>} */
export const TREND_WINDOWS_MS = Object.freeze({
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000
});

/** @type {Readonly<Record<string, number>>} */
export const TREND_BUCKET_COUNTS = Object.freeze({
  '24h': 24,
  '7d': 7,
  '30d': 30
});

/**
 * @param {unknown} rawDate
 * @returns {number|null}
 */
export function parseRecordTimestamp(rawDate) {
  const ts = Date.parse(String(rawDate ?? ''));
  return Number.isFinite(ts) ? ts : null;
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {number} sinceMs
 * @returns {Array<Record<string, unknown>>}
 */
export function filterRecordsSince(records, sinceMs) {
  return records.filter((record) => {
    const ts = parseRecordTimestamp(record.created_at);
    return ts !== null && ts >= sinceMs;
  });
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {'24h'|'7d'|'30d'} windowId
 * @param {number} [nowMs]
 * @returns {{ window: string, total: number, buckets: Array<{ label: string, count: number }> }}
 */
export function computeTrendSeries(records, windowId, nowMs = Date.now()) {
  const windowMs = TREND_WINDOWS_MS[windowId] ?? TREND_WINDOWS_MS['7d'];
  const bucketCount = TREND_BUCKET_COUNTS[windowId] ?? 7;
  const since = nowMs - windowMs;
  const windowRecords = filterRecordsSince(records, since);

  /** @type {number[]} */
  const bucketCounts = Array.from({ length: bucketCount }, () => 0);
  const bucketMs = windowMs / bucketCount;

  for (const record of windowRecords) {
    const ts = parseRecordTimestamp(record.created_at);
    if (ts === null) continue;
    const offset = ts - since;
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor(offset / bucketMs)));
    bucketCounts[index] += 1;
  }

  const buckets = bucketCounts.map((count, index) => ({
    label: formatTrendBucketLabel(windowId, index, bucketCount),
    count
  }));

  return { window: windowId, total: windowRecords.length, buckets };
}

/**
 * @param {'24h'|'7d'|'30d'} windowId
 * @param {number} index
 * @param {number} bucketCount
 * @returns {string}
 */
function formatTrendBucketLabel(windowId, index, bucketCount) {
  if (windowId === '24h') return `${index + 1}h`;
  if (windowId === '7d') return `G${index + 1}`;
  return `${index + 1}`;
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {number} [nowMs]
 * @returns {Record<'24h'|'7d'|'30d', ReturnType<typeof computeTrendSeries>>}
 */
export function computeAllTrends(records, nowMs = Date.now()) {
  return {
    '24h': computeTrendSeries(records, '24h', nowMs),
    '7d': computeTrendSeries(records, '7d', nowMs),
    '30d': computeTrendSeries(records, '30d', nowMs)
  };
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {number} days
 * @param {number} [nowMs]
 * @returns {number}
 */
export function countRecordsInDays(records, days, nowMs = Date.now()) {
  const since = nowMs - days * 24 * 60 * 60 * 1000;
  return filterRecordsSince(records, since).length;
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {number} [nowMs]
 * @returns {number}
 */
export function countRecordsToday(records, nowMs = Date.now()) {
  const today = new Date(nowMs).toISOString().slice(0, 10);
  return records.filter((record) => String(record.created_at ?? '').slice(0, 10) === today).length;
}
