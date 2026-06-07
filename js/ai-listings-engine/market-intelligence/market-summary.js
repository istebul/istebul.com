/**
 * Market Intelligence — client summary helpers (Sprint-7).
 */

export {
  buildMarketSummary,
  buildMarketReasons,
  containsForbiddenMarketPhrase,
  findForbiddenMarketPhrases
} from '../../../supabase/functions/_shared/ai-listings/market-intelligence/market-summary.js';

import { escapeHtml } from '../../core/dom-safe.js';

/**
 * @param {Record<string, unknown>|null|undefined} marketIntelligence
 * @returns {string}
 */
export function buildMarketIntelligencePreviewHtml(marketIntelligence) {
  if (!marketIntelligence || typeof marketIntelligence !== 'object') {
    return '';
  }

  const segment = escapeHtml(String(marketIntelligence.segment_label ?? '—'));
  const demand = escapeHtml(String(marketIntelligence.demand_label ?? '—'));
  const liquidity = escapeHtml(String(marketIntelligence.liquidity_label ?? '—'));
  const trend = escapeHtml(String(marketIntelligence.market_trend ?? '—'));

  return `
    <section class="ai-listings-builder__market-intelligence" data-market-intelligence-preview>
      <h4>Piyasa Zekâsı</h4>
      <dl class="ai-listings-builder__fields ai-listings-builder__fields--compact">
        <dt>Segment</dt><dd>${segment}</dd>
        <dt>Talep</dt><dd>${demand}</dd>
        <dt>Likidite</dt><dd>${liquidity}</dd>
        <dt>Eğilim</dt><dd>${trend}</dd>
      </dl>
      <p class="ai-listings-builder__market-intelligence-note">Bu sonuç deterministik piyasa bağlamıdır.</p>
    </section>`;
}
