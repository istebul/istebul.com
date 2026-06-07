/**
 * AI Auto Listing Builder — admin preview renderer.
 */

import { escapeHtml } from '../core/dom-safe.js';
import { logBuilderStage } from './debug-log.js';
import { normalizeCanonicalListing } from '../../supabase/functions/_shared/ai-listings/engine/canonical-engine.js';
import { runPriceIntelligence } from '../ai-listings-engine/price/price-intelligence.js';
import { buildPricePreviewBlockHtml } from '../ai-listings-engine/price/price-summary.js';
import { runMarketIntelligence } from '../ai-listings-engine/market-intelligence/market-intelligence.js';
import { buildMarketIntelligencePreviewHtml } from '../ai-listings-engine/market-intelligence/market-summary.js';
import { runQualityEngine } from '../../supabase/functions/_shared/ai-listings/engine/quality-engine.js';
import { runMarketEngine } from '../../supabase/functions/_shared/ai-listings/engine/market-engine.js';
import { runRiskEngine } from '../../supabase/functions/_shared/ai-listings/engine/risk-engine.js';
import { runDecisionEngine } from '../../supabase/functions/_shared/ai-listings/engine/decision-engine.js';
import { runExecutiveEngine } from '../ai-listings-engine/executive/executive-engine.js';
import { buildExecutivePreviewHtml } from '../ai-listings-engine/executive/executive-preview.js';

/** @type {Readonly<Record<string, string>>} */
const INPUT_TYPE_LABELS = Object.freeze({
  text: 'Serbest Metin',
  url: 'URL',
  json: 'JSON',
  csv: 'CSV'
});

/**
 * @param {unknown} value
 */
function renderValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return escapeHtml(value.join(', '));
  if (typeof value === 'object') return escapeHtml(JSON.stringify(value));
  return escapeHtml(String(value));
}

/**
 * @param {Record<string, unknown>} canonical
 */
export function buildPreviewJson(canonical) {
  return JSON.stringify(canonical, null, 2);
}

/**
 * @param {Record<string, unknown>} canonical
 */
export function buildPreviewHtml(canonical) {
  const inputType = String(canonical.input_type ?? 'text');
  const confidence = Number(canonical.confidence ?? 0);
  const missing = Array.isArray(canonical.missing_fields) ? canonical.missing_fields : [];
  const warnings = Array.isArray(canonical.extraction_warnings) ? canonical.extraction_warnings : [];
  const attrs = canonical.attributes && typeof canonical.attributes === 'object' ? canonical.attributes : {};

  const missingHtml = missing.length
    ? `<ul class="ai-listings-builder__warnings">${missing
        .map((field) => `<li>Eksik alan: ${escapeHtml(String(field))}</li>`)
        .join('')}</ul>`
    : '<p class="ai-listings-builder__ok">Zorunlu alanlar tamam.</p>';

  const warningsHtml = warnings.length
    ? `<ul class="ai-listings-builder__warnings">${warnings
        .map((warning) => `<li>${escapeHtml(String(warning))}</li>`)
        .join('')}</ul>`
    : '<p class="ai-listings-builder__ok">Uyarı yok.</p>';

  const priceIntelligence = runPriceIntelligence(canonical);
  const priceIntelligenceHtml = buildPricePreviewBlockHtml(priceIntelligence);

  const marketListing = normalizeCanonicalListing({
    id: 'builder-preview',
    ...canonical
  });
  const marketIntelligence = runMarketIntelligence(marketListing);
  const marketIntelligenceHtml = buildMarketIntelligencePreviewHtml(marketIntelligence);

  const quality = runQualityEngine(marketListing);
  const market = runMarketEngine(marketListing);
  const risk = runRiskEngine(marketListing, quality);
  const decision = runDecisionEngine(marketListing, quality, market, risk);
  const executive = runExecutiveEngine(marketListing, {
    quality,
    price_intelligence: market,
    market_intelligence: marketIntelligence,
    risk,
    duplicate: null,
    decision
  });
  const executivePreviewHtml = buildExecutivePreviewHtml(executive);

  const html = `
    <section class="ai-listings-builder__preview" data-builder-preview>
      <header class="ai-listings-builder__preview-head">
        <h3>Önizleme</h3>
        <span class="ai-listings-builder__badge">Güven: %${escapeHtml(String(confidence))}</span>
      </header>
      <dl class="ai-listings-builder__fields">
        <dt>Giriş tipi</dt><dd>${escapeHtml(INPUT_TYPE_LABELS[inputType] ?? inputType)}</dd>
        <dt>Kategori</dt><dd>${renderValue(canonical.category)}</dd>
        <dt>Başlık</dt><dd>${renderValue(canonical.title)}</dd>
        <dt>Açıklama</dt><dd>${renderValue(canonical.description)}</dd>
        <dt>Fiyat</dt><dd>${renderValue(canonical.price)} ${renderValue(canonical.currency)}</dd>
        <dt>Konum</dt><dd>${renderValue(canonical.location)}</dd>
        <dt>Kaynak URL</dt><dd>${renderValue(canonical.source_url)}</dd>
        <dt>Marka</dt><dd>${renderValue(attrs.brand)}</dd>
        <dt>Model</dt><dd>${renderValue(attrs.model)}</dd>
        <dt>Yıl</dt><dd>${renderValue(attrs.year)}</dd>
        <dt>KM</dt><dd>${renderValue(attrs.km)}</dd>
        <dt>Yakıt</dt><dd>${renderValue(attrs.fuel)}</dd>
        <dt>Vites</dt><dd>${renderValue(attrs.transmission)}</dd>
        <dt>Etiketler</dt><dd>${renderValue(canonical.tags)}</dd>
      </dl>
      <div class="ai-listings-builder__preview-section">
        <h4>Eksik Alanlar</h4>
        ${missingHtml}
      </div>
      <div class="ai-listings-builder__preview-section">
        <h4>Uyarılar</h4>
        ${warningsHtml}
      </div>
      ${priceIntelligenceHtml}
      ${marketIntelligenceHtml}
      ${executivePreviewHtml}
      <details class="ai-listings-builder__json-details">
        <summary>JSON önizleme</summary>
        <pre class="ai-listings-builder__json">${escapeHtml(buildPreviewJson(canonical))}</pre>
      </details>
      <div class="ai-listings-builder__preview-actions">
        <button type="button" class="ai-listings-admin__btn ai-listings-admin__btn--primary" data-builder-action="save">Kaydet</button>
        <button type="button" class="ai-listings-admin__btn" data-builder-action="save-analyze">Kaydet ve Analiz Et</button>
      </div>
    </section>`;

  logBuilderStage('preview-builder', {
    html_length: html.length,
    title: canonical.title,
    confidence: canonical.confidence
  });

  return html;
}

export { INPUT_TYPE_LABELS };
