/**
 * Pure rollup helpers for operational health dashboards.
 */

/**
 * @param {Array<{ severity?: string, category?: string, event_name?: string }>} rows
 */
export function summarizeBySeverity(rows) {
  const out = { critical: 0, error: 0, warning: 0, info: 0 };
  for (const row of rows || []) {
    const key = String(row.severity || 'warning').toLowerCase();
    if (key in out) out[key] += 1;
  }
  return out;
}

/**
 * @param {Array<{ category?: string, event_name?: string }>} rows
 */
export function summarizeByCategory(rows) {
  const out = {};
  for (const row of rows || []) {
    const cat = row.category || 'unknown';
    out[cat] = (out[cat] || 0) + 1;
  }
  return out;
}

/**
 * @param {Array<{ event_name?: string }>} rows
 * @param {string} prefix
 */
export function countEventsWithPrefix(rows, prefix) {
  return (rows || []).filter((r) => String(r.event_name || '').startsWith(prefix)).length;
}

/** LCP regression threshold (ms) — align with Core Web Vitals "needs improvement". */
export const LCP_SLOW_MS = 4000;

export function isLcpRegression(valueMs) {
  return Number(valueMs) >= LCP_SLOW_MS;
}
