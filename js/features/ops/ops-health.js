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

/**
 * Client-side replacement for ops_severity_24h view.
 * @param {Array<{ severity?: string, created_at?: string }>} rows
 * @param {number} [windowMs]
 */
export function rollupSeverity24h(rows, windowMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  const counts = { critical: 0, error: 0, warning: 0, info: 0 };

  for (const row of rows || []) {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (ts < cutoff) continue;
    const key = String(row.severity || 'warning').toLowerCase();
    if (key in counts) counts[key] += 1;
  }

  return Object.entries(counts).map(([severity, events]) => ({ severity, events }));
}

/**
 * Client-side replacement for ops_health_24h view.
 */
export function rollupHealth24h(rows, windowMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  const map = new Map();

  for (const row of rows || []) {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (ts < cutoff) continue;

    const key = `${row.category}|${row.event_name}|${row.severity}`;
    const entry = map.get(key) || {
      category: row.category || 'unknown',
      event_name: row.event_name || 'unknown',
      severity: row.severity || 'warning',
      events: 0,
      errors: 0,
      last_seen: row.created_at
    };
    entry.events += 1;
    if (['critical', 'error'].includes(String(row.severity || '').toLowerCase())) {
      entry.errors += 1;
    }
    if (row.created_at && new Date(row.created_at) > new Date(entry.last_seen)) {
      entry.last_seen = row.created_at;
    }
    map.set(key, entry);
  }

  return [...map.values()].sort((a, b) => b.errors - a.errors || b.events - a.events);
}
