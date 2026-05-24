/**
 * Growth experimentation — deterministic variant assignment + exposure tracking.
 */
import { analytics } from '../../core/analytics.js';
import { readStorageRaw, writeStorageRaw, STORAGE_KEYS } from '../../core/storage-keys.js';
import { trackGrowth } from './growth-engine.js';

const VARIANT_KEY = 'istebul_growth_experiment_variants';

let experimentRegistry = null;

async function loadExperiments() {
  if (experimentRegistry) return experimentRegistry;

  try {
    const res = await fetch('/data/growth/experiments.json');
    if (!res.ok) return { experiments: [] };
    experimentRegistry = await res.json();
    return experimentRegistry;
  } catch {
    return { experiments: [] };
  }
}

function readAssignments() {
  try {
    const raw = readStorageRaw(VARIANT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAssignments(map) {
  try {
    writeStorageRaw(VARIANT_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function hashToBucket(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 100;
}

function pickVariant(experiment, anonId) {
  const bucket = hashToBucket(`${experiment.id}:${anonId}`);
  let cursor = 0;
  for (const variant of experiment.variants || []) {
    cursor += Number(variant.weight) || 0;
    if (bucket < cursor) return variant;
  }
  return experiment.variants?.[0] || null;
}

function surfaceMatches(pathname, surfaces = []) {
  const path = pathname || '';
  return surfaces.some((s) => {
    if (s === path) return true;
    if (s.endsWith('/') && path.startsWith(s)) return true;
    return path === s.replace(/\/index\.html$/, '/') || path === s;
  });
}

function applyCopyVariant(copyMap = {}) {
  Object.entries(copyMap).forEach(([selector, text]) => {
    document.querySelectorAll(selector).forEach((el) => {
      let label = el.querySelector('.growth-exp-label');
      if (!label) {
        label = document.createElement('span');
        label.className = 'growth-exp-label';
        el.appendChild(label);
      }
      label.textContent = text;
    });
  });
}

export async function initGrowthExperiments() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const registry = await loadExperiments();
  const pathname = window.location.pathname;
  const anonId = analytics.getAnonymousId();
  const assignments = readAssignments();

  for (const experiment of registry.experiments || []) {
    if (experiment.status !== 'active') continue;
    if (!surfaceMatches(pathname, experiment.surfaces)) continue;

    let variantId = assignments[experiment.id];
    if (!variantId) {
      const variant = pickVariant(experiment, anonId);
      if (!variant) continue;
      variantId = variant.id;
      assignments[experiment.id] = variantId;
      writeAssignments(assignments);
    }

    const variant = (experiment.variants || []).find((v) => v.id === variantId);
    if (!variant) continue;

    document.documentElement.dataset[`exp_${experiment.id}`] = variantId;
    applyCopyVariant(variant.copy);

    if (analytics.hasConsent()) {
      trackGrowth('growth_experiment_exposure', {
        experiment_id: experiment.id,
        variant_id: variantId,
        primary_metric: experiment.primaryMetric
      }, {
        funnel: 'experimentation',
        funnel_step: 'exposure',
        idempotency_key: `exp:${experiment.id}:${variantId}:${analytics.getSessionId()}`
      });
    }
  }
}

/**
 * Call when primary metric fires (e.g. hero CTA click).
 */
export function trackExperimentConversion(metricEvent) {
  if (!analytics.hasConsent()) return;

  const assignments = readAssignments();
  Object.entries(assignments).forEach(([experimentId, variantId]) => {
    trackGrowth('growth_experiment_conversion', {
      experiment_id: experimentId,
      variant_id: variantId,
      metric_event: metricEvent
    }, {
      funnel: 'experimentation',
      funnel_step: 'conversion'
    });
  });
}
