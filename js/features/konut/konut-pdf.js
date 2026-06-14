/**
 * Konut PDF Report V2 — buildPdfReportData üzerinden branded rapor payload.
 * AFAD deprem istihbaratı ve EVDS finansman katmanını destekler.
 */
import { buildPdfReportData } from '../results/results-engine.js';
import { buildAfadRiskLayer } from '../results/results-afad-risk-layer.js';
import { buildEvdsRiskLayer, buildEvdsAiMarketSentence } from '../results/results-evds-risk-layer.js';
import { buildAfadAiEarthquakeSentence } from '../results/results-afad-risk-layer.js';
import { buildKonutResultsV2Payload } from './konut-results-v2.js';
import { injectAfadIntoMetrics } from '../afad/afad-earthquake-engine.js';

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.metrics
 * @param {Array} [params.scenarios]
 * @param {string[]} [params.attention]
 * @param {object|null} [params.evdsRates]
 * @param {object|null} [params.afadSnapshot]
 * @param {string} [params.planTier]
 * @param {string} [params.executiveSummary]
 */
export function buildKonutPdfPayload({
  state = {},
  metrics = {},
  scenarios = [],
  attention = [],
  evdsRates = null,
  afadSnapshot = null,
  planTier = 'free',
  executiveSummary = ''
} = {}) {
  const metricsForView = { ...metrics };
  if (afadSnapshot) {
    injectAfadIntoMetrics(
      metricsForView,
      afadSnapshot,
      Number(state.earthquakeRiskInput || metrics.earthquakeRiskScore || 40)
    );
  }

  const payload = buildKonutResultsV2Payload({
    state,
    metrics,
    scenarios,
    attention,
    evdsRates,
    afadSnapshot
  });

  const evdsRiskLayer = payload.evdsRiskLayer || buildEvdsRiskLayer('konut', evdsRates || {});
  const afadRiskLayer = payload.afadRiskLayer || buildAfadRiskLayer(afadSnapshot);

  const pdfReportData = {
    ...payload.pdfReportData,
    planTier: planTier || payload.planTier,
    executiveSummary: executiveSummary || payload.executiveSummary || '',
    metadata: {
      earthquakeRiskScore: safeNumber(metricsForView.earthquakeRiskScore),
      earthquakeSource: metricsForView.earthquakeSource || 'manual',
      earthquakeActivityLevel: afadRiskLayer.activityLevel || null,
      earthquakeSummary: afadSnapshot?.earthquakeSummary || afadRiskLayer.summary || '',
      afadRiskLayer,
      evdsRiskLayer,
      marketAssessment: buildEvdsAiMarketSentence(evdsRiskLayer),
      earthquakeAssessment: buildAfadAiEarthquakeSentence(afadRiskLayer)
    }
  };

  return {
    ...payload,
    pdfReportData,
    evdsRiskLayer,
    afadRiskLayer
  };
}

/**
 * Doğrudan PDF rapor verisi döner.
 */
export function buildKonutPdfReportData(params = {}) {
  return buildKonutPdfPayload(params).pdfReportData;
}
