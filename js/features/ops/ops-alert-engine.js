/**
 * P9 — Threshold-based operational alerts from command center metrics.
 */

/**
 * @param {object} obj
 * @param {string} path dot.path
 */
export function getMetricValue(obj, path) {
  if (!path || !obj) return undefined;
  return path.split('.').reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, obj);
}

/**
 * @param {number|boolean} value
 * @param {string} op gte|gt|lte|lt|eq
 * @param {number} threshold
 */
export function compareMetric(value, op, threshold) {
  const n = Number(value);
  const t = Number(threshold);
  if (Number.isNaN(n) && op !== 'eq') return false;

  switch (op) {
    case 'gte':
      return n >= t;
    case 'gt':
      return n > t;
    case 'lte':
      return n <= t;
    case 'lt':
      return n < t;
    case 'eq':
      return Number(value) === t || value === threshold;
    default:
      return false;
  }
}

/**
 * @param {object} metrics flat-ish tree (ops.*, partner.*, …)
 * @param {Array<object>} rules from data/ops/alert-rules.json
 */
export function evaluateAlertRules(metrics, rules = []) {
  const triggered = [];
  const evaluated = [];

  for (const rule of rules) {
    const value = getMetricValue(metrics, rule.metric);
    const fired =
      value !== undefined && compareMetric(value, rule.op, rule.threshold);

    evaluated.push({
      id: rule.id,
      domain: rule.domain,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      op: rule.op,
      fired
    });

    if (fired) {
      triggered.push({
        id: rule.id,
        domain: rule.domain,
        severity: rule.severity || 'warning',
        message: rule.message || `Rule ${rule.id} triggered`,
        metric: rule.metric,
        value,
        threshold: rule.threshold
      });
    }
  }

  const overallSeverity = triggered.some((a) => a.severity === 'critical')
    ? 'critical'
    : triggered.some((a) => a.severity === 'error')
      ? 'error'
      : triggered.length
        ? 'warning'
        : 'ok';

  return {
    overallSeverity,
    triggered,
    evaluated,
    triggeredCount: triggered.length
  };
}
