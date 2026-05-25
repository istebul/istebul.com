/**
 * P5.2 — CRO experimentation framework (zones, variants, metric matching).
 */

export const CRO_ZONES = Object.freeze([
  'hero',
  'cta',
  'wizard',
  'pricing',
  'checkout',
  'trust'
]);

export const CRO_FRAMEWORK_VERSION = 'p5.2';

/**
 * @param {string} seed
 */
export function hashToBucket(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 100;
}

/**
 * @param {{ id: string, variants?: Array<{ id: string, weight: number }> }} experiment
 * @param {string} anonId
 */
export function pickVariant(experiment, anonId) {
  const bucket = hashToBucket(`${experiment.id}:${anonId}`);
  let cursor = 0;
  for (const variant of experiment.variants || []) {
    cursor += Number(variant.weight) || 0;
    if (bucket < cursor) return variant;
  }
  return experiment.variants?.[0] || null;
}

/**
 * @param {string} pathname
 * @param {string[]} surfaces
 */
export function surfaceMatches(pathname, surfaces = []) {
  const path = pathname || '';
  return surfaces.some((s) => {
    if (s === path) return true;
    if (s === '/' || s === '/index.html') {
      return path === '/' || path === '/index.html';
    }
    if (s.endsWith('/') && path.startsWith(s)) return true;
    const normalized = s.replace(/\/index\.html$/, '/');
    return path === normalized || path === `${normalized}index.html`;
  });
}

/**
 * @param {{ variants?: Array<{ weight: number }> }} experiment
 */
export function validateExperimentWeights(experiment) {
  const total = (experiment.variants || []).reduce(
    (sum, v) => sum + (Number(v.weight) || 0),
    0
  );
  return total === 100;
}

function setElementLabel(el, text) {
  let label = el.querySelector('.growth-exp-label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'growth-exp-label';
    el.appendChild(label);
  }
  label.textContent = text;
}

/**
 * @param {Record<string, string>} copyMap
 */
export function applyCopyVariant(copyMap = {}) {
  Object.entries(copyMap).forEach(([selector, text]) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el.matches('input, textarea, select')) {
        el.setAttribute('placeholder', text);
        return;
      }
      setElementLabel(el, text);
    });
  });
}

/**
 * @param {Record<string, string[]|string>} classMap — selector → class or class list
 */
export function applyClassVariant(classMap = {}) {
  Object.entries(classMap).forEach(([selector, classes]) => {
    const list = Array.isArray(classes) ? classes : [classes];
    document.querySelectorAll(selector).forEach((el) => {
      list.filter(Boolean).forEach((cls) => el.classList.add(cls));
    });
  });
}

/**
 * @param {Record<string, Record<string, string>>} attrMap — selector → attrs
 */
export function applyAttributeVariant(attrMap = {}) {
  Object.entries(attrMap).forEach(([selector, attrs]) => {
    document.querySelectorAll(selector).forEach((el) => {
      Object.entries(attrs || {}).forEach(([key, value]) => {
        el.setAttribute(key, String(value));
      });
    });
  });
}

/**
 * @param {Record<string, string>} trustMap — selector → text (headlines / card titles)
 */
export function applyTrustVariant(trustMap = {}) {
  applyCopyVariant(trustMap);
}

/**
 * Apply all variant layers (copy + classes + attributes + trust).
 * @param {{ copy?: object, classes?: object, attributes?: object, trust?: object }} variant
 */
export function applyCroVariant(variant = {}) {
  if (variant.copy) applyCopyVariant(variant.copy);
  if (variant.classes) applyClassVariant(variant.classes);
  if (variant.attributes) applyAttributeVariant(variant.attributes);
  if (variant.trust) applyTrustVariant(variant.trust);
  // Legacy experiments.json used top-level "copy" only
  if (!variant.copy && variant.apply?.copy) applyCopyVariant(variant.apply.copy);
  if (variant.apply?.classes) applyClassVariant(variant.apply.classes);
  if (variant.apply?.attributes) applyAttributeVariant(variant.apply.attributes);
  if (variant.apply?.trust) applyTrustVariant(variant.apply.trust);
}

/**
 * @param {{ primaryMetric?: string, metrics?: string[] }} experiment
 * @param {string} metricEvent
 * @param {Record<string, string[]>} [metricAliases]
 */
export function metricMatchesExperiment(experiment, metricEvent, metricAliases = {}) {
  if (!metricEvent) return false;
  const event = String(metricEvent);
  const primary = experiment.primaryMetric || '';
  if (primary && (event === primary || event.includes(primary))) return true;
  for (const m of experiment.metrics || []) {
    if (event === m || event.includes(m)) return true;
  }
  const aliases = metricAliases[primary] || [];
  if (aliases.some((a) => event === a || event.includes(a))) return true;
  return false;
}
