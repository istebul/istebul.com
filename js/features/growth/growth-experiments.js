/**
 * Growth experimentation — P5.2 CRO framework integration.
 */
import { analytics } from '../../core/analytics.js';
import { readStorageRaw, writeStorageRaw, STORAGE_KEYS } from '../../core/storage-keys.js';
import { trackGrowth } from './growth-engine.js';
import {
  pickVariant,
  surfaceMatches,
  applyCroVariant,
  metricMatchesExperiment,
  validateExperimentWeights,
  CRO_FRAMEWORK_VERSION
} from './cro-experiment-framework.js';

const VARIANT_KEY = 'istebul_growth_experiment_variants';

let experimentRegistry = null;
let metricAliases = {};

async function loadMetricAliases() {
  try {
    const res = await fetch('/data/growth/cro-framework.json');
    if (!res.ok) return {};
    const data = await res.json();
    return data.metricAliases || {};
  } catch {
    return {};
  }
}

async function loadExperiments() {
  if (experimentRegistry) return experimentRegistry;

  try {
    const [expRes, aliasMap] = await Promise.all([
      fetch('/data/growth/experiments.json'),
      loadMetricAliases()
    ]);
    metricAliases = aliasMap;
    if (!expRes.ok) return { experiments: [], frameworkVersion: CRO_FRAMEWORK_VERSION };
    experimentRegistry = await expRes.json();
    return experimentRegistry;
  } catch {
    return { experiments: [], frameworkVersion: CRO_FRAMEWORK_VERSION };
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

function assignVariants(registry, pathname, anonId) {
  const assignments = readAssignments();
  const applied = [];

  for (const experiment of registry.experiments || []) {
    if (experiment.status !== 'active') continue;
    if (!surfaceMatches(pathname, experiment.surfaces)) continue;
    if (!validateExperimentWeights(experiment)) continue;

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
    if (experiment.zone) {
      document.documentElement.dataset[`cro_zone_${experiment.zone}`] = variantId;
    }

    applyCroVariant(variant);
    applied.push({ experiment, variantId });
  }

  return applied;
}

function trackExposures(applied) {
  if (!analytics.hasConsent()) return;

  for (const { experiment, variantId } of applied) {
    trackGrowth(
      'growth_experiment_exposure',
      {
        experiment_id: experiment.id,
        variant_id: variantId,
        zone: experiment.zone || 'unknown',
        primary_metric: experiment.primaryMetric,
        framework: experimentRegistry?.frameworkVersion || CRO_FRAMEWORK_VERSION
      },
      {
        funnel: 'experimentation',
        funnel_step: 'exposure',
        idempotency_key: `exp:${experiment.id}:${variantId}:${analytics.getSessionId()}`
      }
    );
  }
}

export async function initGrowthExperiments() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const registry = await loadExperiments();
  const pathname = window.location.pathname;
  const anonId = analytics.getAnonymousId();
  const applied = assignVariants(registry, pathname, anonId);
  trackExposures(applied);
}

/** Re-apply assigned variants after dynamic DOM (pricing/checkout). */
export async function refreshGrowthExperiments() {
  if (typeof document === 'undefined') return;
  const registry = await loadExperiments();
  assignVariants(registry, window.location.pathname, analytics.getAnonymousId());
}

/**
 * Call when a primary metric fires — only attributes matching experiments.
 * @param {string} metricEvent
 */
export function trackExperimentConversion(metricEvent) {
  if (!analytics.hasConsent() || !metricEvent) return;

  const assignments = readAssignments();
  const registry = experimentRegistry || { experiments: [] };

  for (const experiment of registry.experiments || []) {
    const variantId = assignments[experiment.id];
    if (!variantId) continue;
    if (!metricMatchesExperiment(experiment, metricEvent, metricAliases)) continue;

    trackGrowth(
      'growth_experiment_conversion',
      {
        experiment_id: experiment.id,
        variant_id: variantId,
        zone: experiment.zone || 'unknown',
        metric_event: metricEvent,
        primary_metric: experiment.primaryMetric
      },
      {
        funnel: 'experimentation',
        funnel_step: 'conversion',
        idempotency_key: `exp_conv:${experiment.id}:${variantId}:${metricEvent}:${analytics.getSessionId()}`
      }
    );
  }
}

export function getActiveExperimentAssignments() {
  return { ...readAssignments() };
}
