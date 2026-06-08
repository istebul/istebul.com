/**
 * Client-side price summary helpers — re-exports server module.
 */

export {
  buildPriceSummary,
  getPricePositionLabelTr,
  PRICE_POSITION_LABELS_TR
} from '../../../supabase/functions/_shared/ai-listings/price/price-summary.js';

/**
 * @param {ReturnType<import('../../../supabase/functions/_shared/ai-listings/price/price-intelligence.js').runPriceIntelligence>} priceIntelligence
 * @returns {string}
 */
export function buildPricePreviewBlockHtml(priceIntelligence) {
  if (!priceIntelligence) return '';

  const est = Number(priceIntelligence.estimated_market_value);
  const deviation = Number(priceIntelligence.deviation_pct);
  const confidence = Number(priceIntelligence.price_confidence);
  const position = String(priceIntelligence.price_position ?? 'unknown');

  const estLabel = est > 0 ? `${Math.round(est).toLocaleString('tr-TR')} TL` : '—';
  const deviationLabel = Number.isFinite(deviation)
    ? `${deviation > 0 ? '+' : ''}${deviation.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : '—';
  const confidenceLabel = Number.isFinite(confidence) ? `%${Math.round(confidence * 100)}` : '—';

  return `
    <div class="ai-listings-builder__price-intelligence" data-price-intelligence>
      <h4>Fiyat Zekâsı (Ön Tahmin)</h4>
      <dl class="ai-listings-builder__price-fields">
        <dt>Tahmini değer</dt><dd>${estLabel}</dd>
        <dt>Sapma</dt><dd>${deviationLabel}</dd>
        <dt>Güven</dt><dd>${confidenceLabel}</dd>
        <dt>Pozisyon</dt><dd>${position}</dd>
      </dl>
      <p class="ai-listings-builder__price-warning">Bu değer deterministik ön tahmindir.</p>
    </div>`;
}
