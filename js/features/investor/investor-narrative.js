/**
 * P7 — Investor narrative pack (metrics, moat, financials, growth, GTM, deck).
 */

import { buildInvestorSnapshot } from '../metrics/investor-kpis.js';

const ASSET_KEYS = [
  'investorNarrative',
  'kpiStory',
  'metricsStory',
  'moatStory',
  'marketSizing',
  'monetizationStory',
  'financialModel',
  'growthStory',
  'gtmNarrative',
  'deckReadiness',
  'fundraisingReadiness',
  'marketResearch'
];

/**
 * @param {object} obj
 * @param {string} dotPath e.g. subscription.mrrTry
 */
export function getNestedValue(obj, dotPath) {
  if (!obj || !dotPath) return undefined;
  return String(dotPath)
    .split('.')
    .reduce((acc, key) => (acc != null && typeof acc === 'object' ? acc[key] : undefined), obj);
}

/**
 * @param {object} snapshot
 * @param {{ key: string, format?: string }[]} metrics
 */
export function resolveMetricsForSlide(snapshot, metrics = []) {
  return metrics.map((m) => {
    const raw = getNestedValue(snapshot, m.key);
    return {
      ...m,
      value: raw ?? null,
      display: formatMetricValue(raw, m.format)
    };
  });
}

/**
 * @param {unknown} value
 * @param {string} [format]
 */
export function formatMetricValue(value, format) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n) && format !== 'text') return String(value);

  switch (format) {
    case 'currency_try':
      return `₺${Math.round(n).toLocaleString('tr-TR')}`;
    case 'percent':
      return `${n}%`;
    case 'integer':
      return String(Math.round(n));
    default:
      return String(value);
  }
}

/**
 * @param {object} financialModel
 * @param {'base'|'bull'|'bear'} [scenarioId]
 * @param {'y1'|'y2'|'y3'} [yearKey]
 */
export function projectFinancialYear(financialModel, scenarioId = 'base', yearKey = 'y1') {
  const assumptions = financialModel?.assumptions || {};
  const scenario = financialModel?.scenarios?.[scenarioId];
  const year = scenario?.[yearKey];
  if (!year) {
    return { scenarioId, yearKey, error: 'missing_scenario_year' };
  }

  const proPrice = assumptions.proPriceMonthly ?? 299;
  const subscribers = year.proSubscribersEnd ?? 0;
  const monthlyLeads = year.monthlyLeads ?? 0;
  const partnerPerLead = year.partnerRevenuePerLead ?? 0;

  const proMrrTry = Math.round(subscribers * proPrice);
  const partnerMonthlyTry = Math.round(monthlyLeads * partnerPerLead);
  const blendedMrrTry = proMrrTry + partnerMonthlyTry;
  const blendedArrTry = blendedMrrTry * 12;

  return {
    scenarioId,
    yearKey,
    label: scenario.label || scenarioId,
    proSubscribersEnd: subscribers,
    monthlyLeads,
    proMrrTry,
    partnerMonthlyTry,
    blendedMrrTry,
    blendedArrTry,
    monthlyOperatingBurn: assumptions.monthlyOperatingBurn ?? null,
    runwayMonthsAtBurn:
      assumptions.monthlyOperatingBurn > 0
        ? Math.round((blendedMrrTry / assumptions.monthlyOperatingBurn) * 10) / 10
        : null
  };
}

/**
 * @param {object} financialModel
 */
export function projectAllFinancialScenarios(financialModel) {
  const ids = Object.keys(financialModel?.scenarios || {});
  const years = ['y1', 'y2', 'y3'];
  const out = {};
  for (const id of ids) {
    out[id] = {};
    for (const y of years) {
      out[id][y] = projectFinancialYear(financialModel, id, y);
    }
  }
  return out;
}

/**
 * @param {object} params
 */
export function composeInvestorReadinessPack({
  manifest = {},
  investorNarrative = {},
  kpiStory = {},
  metricsStory = {},
  moatStory = {},
  marketSizing = {},
  monetizationStory = {},
  financialModel = {},
  growthStory = {},
  gtmNarrative = {},
  deckReadiness = {},
  fundraisingReadiness = {},
  marketResearch = {},
  snapshot = null
} = {}) {
  const liveSnapshot =
    snapshot ||
    buildInvestorSnapshot({
      subscriptions: [],
      leads: [],
      analyticsEvents: []
    });

  const tractionSlides = (metricsStory.slides || []).map((slide) => ({
    ...slide,
    resolvedMetrics: resolveMetricsForSlide(liveSnapshot, slide.metrics || [])
  }));

  const somRef = marketSizing?.som?.sourceRef;
  let somIllustrativeTry = marketSizing?.som?.illustrativeSomTry;
  if (financialModel?.scenarios?.base?.y3 && somRef?.includes('financial-model')) {
    const y3 = projectFinancialYear(financialModel, 'base', 'y3');
    if (y3.blendedArrTry) somIllustrativeTry = y3.blendedArrTry;
  }

  return {
    version: manifest.version || metricsStory.version || 'p7.1',
    generatedAt: new Date().toISOString(),
    company: manifest.company || {},
    investorNarrative,
    kpiStory,
    metricsStory: {
      ...metricsStory,
      slides: tractionSlides,
      liveSnapshotSummary: {
        generatedAt: liveSnapshot.generatedAt,
        mrrTry: liveSnapshot.subscription?.mrrTry,
        blendedArrTry: liveSnapshot.blendedArrTry
      }
    },
    moatStory,
    marketSizing: {
      ...marketSizing,
      som: { ...marketSizing.som, illustrativeSomTry: somIllustrativeTry }
    },
    monetizationStory,
    financialModel: {
      ...financialModel,
      projections: projectAllFinancialScenarios(financialModel)
    },
    growthStory,
    gtmNarrative,
    deckReadiness,
    fundraisingReadiness,
    marketResearch,
    narrativeDocs: manifest.narrativeDocs || {},
    exports: manifest.exports || {},
    commands: manifest.commands || {}
  };
}

/**
 * Node/tests: load JSON assets from plain objects.
 * @param {Record<string, object>} assets
 */
export function loadInvestorAssetsSync(assets = {}) {
  const pack = {};
  for (const key of ASSET_KEYS) {
    if (assets[key]) pack[key] = assets[key];
  }
  return pack;
}

/**
 * @param {Record<string, object>} assets
 * @param {object} [snapshot]
 */
export function buildPackFromAssets(assets, snapshot = null) {
  const manifest = assets.manifest || assets.investorReadiness || {};
  return composeInvestorReadinessPack({
    manifest,
    investorNarrative: assets.investorNarrative || {},
    kpiStory: assets.kpiStory || {},
    metricsStory: assets.metricsStory || {},
    moatStory: assets.moatStory || {},
    marketSizing: assets.marketSizing || {},
    monetizationStory: assets.monetizationStory || {},
    financialModel: assets.financialModel || {},
    growthStory: assets.growthStory || {},
    gtmNarrative: assets.gtmNarrative || {},
    deckReadiness: assets.deckReadiness || {},
    fundraisingReadiness: assets.fundraisingReadiness || {},
    marketResearch: assets.marketResearch || {},
    snapshot
  });
}
