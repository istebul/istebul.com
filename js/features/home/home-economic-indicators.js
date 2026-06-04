/**
 * Ana sayfa — Güncel Ekonomik Göstergeler (public /api/evds-snapshot).
 */
import { escapeHtml } from '../../core/security.js';

const INDICATORS = Object.freeze([
  { key: 'usdTry', label: 'USD/TRY', kind: 'fx', rateKey: 'usdTry', dateKey: 'usdTry' },
  { key: 'eurTry', label: 'EUR/TRY', kind: 'fx', rateKey: 'eurTry', dateKey: 'eurTry' },
  { key: 'policyRate', label: 'Politika Faizi', kind: 'pct', rateKey: 'policyRate', dateKey: 'policyRate' },
  { key: 'cpiAnnual', label: 'TÜFE Yıllık', kind: 'pct', rateKey: 'cpiAnnual', dateKey: 'cpiAnnual' },
  {
    key: 'housingLoanRate',
    label: 'Konut Kredisi Faizi',
    kind: 'pct',
    rateKey: 'housingLoanRate',
    dateKey: 'housingLoanRate'
  }
]);

const CARD_TITLE = 'Kararlarınızı Etkileyen Güncel Veriler';
const CARD_REFRESH_NOTE = 'TCMB EVDS üzerinden otomatik güncellenmektedir.';

const MONTH_LABELS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function renderHeadHtml() {
  return `
      <header class="ib-home-economic__head">
        <div class="ib-home-economic__head-row">
          <h2 id="home-economic-indicators-title">${CARD_TITLE}</h2>
          <p class="ib-home-economic__refresh">${CARD_REFRESH_NOTE}</p>
        </div>
      </header>`;
}

export function formatFxTry(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `₺${Number(value).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatPercentTr(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `%${Number(value).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatSeriesDateLabel(date) {
  if (!date) return '—';
  const text = String(date).trim();
  const monthly = text.match(/^(\d{4})-(\d{1,2})$/);
  if (monthly) {
    const monthIndex = Number(monthly[2]) - 1;
    const monthLabel = MONTH_LABELS[monthIndex] || monthly[2];
    return `${monthLabel} ${monthly[1]}`;
  }
  return text;
}

function formatIndicatorValue(kind, value) {
  return kind === 'fx' ? formatFxTry(value) : formatPercentTr(value);
}

function hasAnyIndicatorValue(rates = {}) {
  return INDICATORS.some(({ rateKey }) => rates[rateKey] != null && Number.isFinite(Number(rates[rateKey])));
}

export function renderSkeletonHtml() {
  const items = INDICATORS.map(
    () => `
      <div class="ib-home-economic__item ib-home-economic__item--skeleton" aria-hidden="true">
        <span class="ib-home-economic__skeleton-label"></span>
        <span class="ib-home-economic__skeleton-value"></span>
        <span class="ib-home-economic__skeleton-date"></span>
      </div>`
  ).join('');

  return `
    <section class="ib-home-economic__card" aria-label="Güncel ekonomik göstergeler yükleniyor" data-home-economic-state="loading">
      ${renderHeadHtml()}
      <div class="ib-home-economic__grid">${items}</div>
      <p class="ib-home-economic__meta">Kaynak: TCMB EVDS · Bilgilendirme amaçlıdır.</p>
    </section>`;
}

export function renderFallbackHtml() {
  return `
    <section class="ib-home-economic__card ib-home-economic__card--fallback" aria-label="Güncel ekonomik göstergeler" data-home-economic-state="fallback">
      ${renderHeadHtml()}
      <p class="ib-home-economic__fallback">Göstergeler şu an yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>
      <p class="ib-home-economic__meta">Kaynak: TCMB EVDS · Bilgilendirme amaçlıdır.</p>
    </section>`;
}

export function renderCardHtml(data) {
  const rates = data?.rates || {};
  const seriesDates = data?.seriesDates || {};

  const items = INDICATORS.map(({ key, label, kind, rateKey, dateKey }) => {
    const value = rates[rateKey];
    const date = seriesDates[dateKey];
    const displayValue = formatIndicatorValue(kind, value);
    const displayDate = formatSeriesDateLabel(date);

    return `
      <article class="ib-home-economic__item" data-economic-key="${escapeHtml(key)}">
        <h3 class="ib-home-economic__label">${escapeHtml(label)}</h3>
        <p class="ib-home-economic__value">${escapeHtml(displayValue)}</p>
        <p class="ib-home-economic__date">${escapeHtml(displayDate)}</p>
      </article>`;
  }).join('');

  return `
    <section class="ib-home-economic__card" aria-labelledby="home-economic-indicators-title" data-home-economic-state="ready">
      ${renderHeadHtml()}
      <div class="ib-home-economic__grid">${items}</div>
      <p class="ib-home-economic__meta">Kaynak: TCMB EVDS · Bilgilendirme amaçlıdır.</p>
    </section>`;
}

/**
 * @param {HTMLElement | null} mount
 */
export async function hydrateHomeEconomicIndicators(mount) {
  if (!mount || mount.dataset.homeEconomicHydrated === '1') return;

  mount.dataset.homeEconomicHydrated = '1';
  mount.setAttribute('aria-busy', 'true');
  mount.innerHTML = renderSkeletonHtml();

  try {
    const res = await fetch('/api/evds-snapshot', { credentials: 'same-origin' });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body?.ok || !body?.data || !hasAnyIndicatorValue(body.data.rates)) {
      mount.innerHTML = renderFallbackHtml();
      mount.removeAttribute('aria-busy');
      return;
    }

    mount.innerHTML = renderCardHtml(body.data);
    mount.removeAttribute('aria-busy');
  } catch {
    mount.innerHTML = renderFallbackHtml();
    mount.removeAttribute('aria-busy');
  }
}

export function initHomeEconomicIndicators() {
  const mount = document.getElementById('home-economic-indicators-mount');
  if (!mount) return;
  void hydrateHomeEconomicIndicators(mount);
}
