/**
 * Sonuç ekranları — Güncel Ekonomik Göstergeler (public /api/evds-snapshot).
 * Ana sayfa EVDS formatlayıcılarını yeniden kullanır.
 */
import { escapeHtml } from '../../core/security.js';
import {
  formatFxTry,
  formatPercentTr,
  formatSeriesDateLabel
} from '../home/home-economic-indicators.js';

export const RESULTS_ECONOMIC_PRESETS = Object.freeze({
  finansman: Object.freeze([
    { key: 'policyRate', label: 'Politika faizi', kind: 'pct', rateKey: 'policyRate', dateKey: 'policyRate' },
    {
      key: 'housingLoanRate',
      label: 'Konut kredisi faizi',
      kind: 'pct',
      rateKey: 'housingLoanRate',
      dateKey: 'housingLoanRate'
    },
    { key: 'cpiAnnual', label: 'TÜFE', kind: 'pct', rateKey: 'cpiAnnual', dateKey: 'cpiAnnual' }
  ]),
  konut: Object.freeze([
    {
      key: 'housingLoanRate',
      label: 'Konut kredisi faizi',
      kind: 'pct',
      rateKey: 'housingLoanRate',
      dateKey: 'housingLoanRate'
    },
    { key: 'cpiAnnual', label: 'TÜFE', kind: 'pct', rateKey: 'cpiAnnual', dateKey: 'cpiAnnual' },
    { key: 'policyRate', label: 'Politika faizi', kind: 'pct', rateKey: 'policyRate', dateKey: 'policyRate' }
  ]),
  auto: Object.freeze([
    { key: 'usdTry', label: 'USD/TRY', kind: 'fx', rateKey: 'usdTry', dateKey: 'usdTry' },
    { key: 'eurTry', label: 'EUR/TRY', kind: 'fx', rateKey: 'eurTry', dateKey: 'eurTry' },
    { key: 'cpiAnnual', label: 'TÜFE', kind: 'pct', rateKey: 'cpiAnnual', dateKey: 'cpiAnnual' }
  ])
});

const CARD_TITLE = 'Güncel Ekonomik Göstergeler';
const CARD_SUBTITLE = 'TCMB EVDS verileriyle bilgilendirme amaçlıdır.';
const SOURCE_LABEL = 'TCMB EVDS';
const FALLBACK_MESSAGE = 'Veri geçici olarak alınamadı';

function formatIndicatorValue(kind, value) {
  return kind === 'fx' ? formatFxTry(value) : formatPercentTr(value);
}

function resolvePreset(preset) {
  const key = String(preset || '').trim();
  return RESULTS_ECONOMIC_PRESETS[key] || null;
}

export function hasAnyPresetValue(indicators, rates = {}) {
  return indicators.some(
    ({ rateKey }) => rates[rateKey] != null && Number.isFinite(Number(rates[rateKey]))
  );
}

export function renderResultsEconomicCardHtml(data, preset) {
  const indicators = resolvePreset(preset);
  if (!indicators) return '';

  const rates = data?.rates || {};
  const seriesDates = data?.seriesDates || {};

  const items = indicators
    .map(({ key, label, kind, rateKey, dateKey }) => {
      const value = rates[rateKey];
      const date = seriesDates[dateKey];
      const displayValue = formatIndicatorValue(kind, value);
      const displayDate = formatSeriesDateLabel(date);

      return `
      <article class="ib-results-economic__item" data-economic-key="${escapeHtml(key)}">
        <h4 class="ib-results-economic__label">${escapeHtml(label)}</h4>
        <p class="ib-results-economic__value">${escapeHtml(displayValue)}</p>
        <p class="ib-results-economic__date">${escapeHtml(displayDate)}</p>
        <p class="ib-results-economic__source">${escapeHtml(SOURCE_LABEL)}</p>
      </article>`;
    })
    .join('');

  return `
    <section
      class="ib-results-economic__card"
      aria-labelledby="results-economic-title-${escapeHtml(preset)}"
      data-results-economic-card
      data-results-economic-state="ready"
    >
      <header class="ib-results-economic__head">
        <h3 id="results-economic-title-${escapeHtml(preset)}">${escapeHtml(CARD_TITLE)}</h3>
        <p class="ib-results-economic__subtitle">${escapeHtml(CARD_SUBTITLE)}</p>
      </header>
      <div class="ib-results-economic__grid">${items}</div>
    </section>`;
}

export function renderResultsEconomicFallbackHtml(preset) {
  const indicators = resolvePreset(preset);
  if (!indicators) return '';

  const items = indicators
    .map(
      ({ key, label }) => `
      <article class="ib-results-economic__item ib-results-economic__item--empty" data-economic-key="${escapeHtml(key)}">
        <h4 class="ib-results-economic__label">${escapeHtml(label)}</h4>
        <p class="ib-results-economic__value">—</p>
        <p class="ib-results-economic__date">—</p>
        <p class="ib-results-economic__source">${escapeHtml(SOURCE_LABEL)}</p>
      </article>`
    )
    .join('');

  return `
    <section
      class="ib-results-economic__card ib-results-economic__card--fallback"
      aria-label="${escapeHtml(CARD_TITLE)}"
      data-results-economic-card
      data-results-economic-state="fallback"
    >
      <header class="ib-results-economic__head">
        <h3>${escapeHtml(CARD_TITLE)}</h3>
        <p class="ib-results-economic__subtitle">${escapeHtml(CARD_SUBTITLE)}</p>
      </header>
      <p class="ib-results-economic__fallback">${escapeHtml(FALLBACK_MESSAGE)}</p>
      <div class="ib-results-economic__grid">${items}</div>
    </section>`;
}

export function renderResultsEconomicSkeletonHtml(preset) {
  const indicators = resolvePreset(preset);
  if (!indicators) return '';

  const items = indicators
    .map(
      () => `
      <div class="ib-results-economic__item ib-results-economic__item--skeleton" aria-hidden="true">
        <span class="ib-results-economic__skeleton-label"></span>
        <span class="ib-results-economic__skeleton-value"></span>
        <span class="ib-results-economic__skeleton-date"></span>
      </div>`
    )
    .join('');

  return `
    <section
      class="ib-results-economic__card"
      aria-label="${escapeHtml(CARD_TITLE)} yükleniyor"
      data-results-economic-state="loading"
    >
      <header class="ib-results-economic__head">
        <h3>${escapeHtml(CARD_TITLE)}</h3>
        <p class="ib-results-economic__subtitle">${escapeHtml(CARD_SUBTITLE)}</p>
      </header>
      <div class="ib-results-economic__grid">${items}</div>
    </section>`;
}

/**
 * @param {HTMLElement | null} root — sonuç v2 kökü ([data-results-economic-mount] içerir)
 * @param {'finansman'|'konut'|'auto'} preset
 */
export async function hydrateResultsEconomicIndicators(root, preset) {
  if (!root || !resolvePreset(preset)) return;

  const mount = root.querySelector('[data-results-economic-mount]');
  if (!mount || mount.querySelector('[data-results-economic-card]')) return;

  mount.hidden = false;
  mount.setAttribute('aria-busy', 'true');
  mount.innerHTML = renderResultsEconomicSkeletonHtml(preset);

  try {
    const res = await fetch('/api/evds-snapshot', { credentials: 'same-origin' });
    const body = await res.json().catch(() => ({}));
    const data = body?.data;
    const indicators = resolvePreset(preset);

    if (!res.ok || !body?.ok || !data || !hasAnyPresetValue(indicators, data.rates)) {
      mount.innerHTML = renderResultsEconomicFallbackHtml(preset);
      mount.removeAttribute('aria-busy');
      return;
    }

    mount.innerHTML = renderResultsEconomicCardHtml(data, preset);
    mount.removeAttribute('aria-busy');
  } catch {
    mount.innerHTML = renderResultsEconomicFallbackHtml(preset);
    mount.removeAttribute('aria-busy');
  }
}
