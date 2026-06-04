/**
 * Finansman sonuç ekranı — EVDS kartı (geriye dönük uyumluluk).
 * @deprecated Sonuç ekranları `results-economic-indicators.js` kullanır.
 */
import {
  hydrateResultsEconomicIndicators,
  renderResultsEconomicCardHtml,
  renderResultsEconomicFallbackHtml
} from '../results/results-economic-indicators.js';

export function renderCardHtml(data) {
  return renderResultsEconomicCardHtml(data, 'finansman');
}

export async function hydrateFinansmanEvdsCard(root) {
  return hydrateResultsEconomicIndicators(root, 'finansman');
}

export { renderResultsEconomicFallbackHtml as renderFallbackHtml };
