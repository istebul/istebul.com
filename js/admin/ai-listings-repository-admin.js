/**
 * AI Listings Repository — admin UI builders (Sprint-11).
 * Client-side derive only; no endpoint, auth, or schema changes.
 */

import { escapeHtml } from '../core/dom-safe.js';
import {
  REPOSITORY_CATEGORY_TABS,
  REPOSITORY_FILTER_CHIPS,
  runRepositoryQuery
} from '../ai-listings-repository/index.js';

/** @type {Readonly<Record<string, string>>} */
export const REPOSITORY_SOURCE_LABELS_TR = Object.freeze({
  manual: 'Manuel',
  ai_builder: 'AI Builder',
  csv: 'CSV',
  json: 'JSON',
  partner_api: 'Partner API',
  future_partner: 'Gelecek Partner'
});

/** @type {Readonly<Record<string, string>>} */
export const REPOSITORY_DUPLICATE_LABELS_TR = Object.freeze({
  new: 'Yeni',
  exact: 'Exact',
  similar: 'Similar'
});

/** @type {Readonly<Record<string, string>>} */
export const REPOSITORY_CATEGORY_LABELS_TR = Object.freeze({
  vehicle: 'Araç',
  housing: 'Konut',
  real_estate: 'Konut',
  vacation: 'Tatil',
  general: 'Genel'
});

/**
 * @param {unknown} value
 * @returns {string}
 */
export function safeRenderText(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {unknown} category
 * @returns {string}
 */
export function getRepositoryCategoryLabelTr(category) {
  const key = String(category ?? '').trim().toLowerCase();
  return REPOSITORY_CATEGORY_LABELS_TR[key] ?? String(category ?? '—');
}

/**
 * @param {unknown} source
 * @returns {string}
 */
export function getRepositorySourceLabelTr(source) {
  const key = String(source ?? 'manual').trim().toLowerCase();
  return REPOSITORY_SOURCE_LABELS_TR[key] ?? key;
}

/**
 * @param {unknown} status
 * @returns {string}
 */
export function getRepositoryDuplicateLabelTr(status) {
  const key = String(status ?? 'new').trim().toLowerCase();
  return REPOSITORY_DUPLICATE_LABELS_TR[key] ?? key;
}

/**
 * @param {unknown} rawDate
 * @returns {string}
 */
export function formatRepositoryDate(rawDate) {
  const date = new Date(String(rawDate ?? ''));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * @param {number|null|undefined} value
 * @returns {string}
 */
export function formatRepositoryScore(value) {
  const num = Number(value);
  return Number.isFinite(num) ? String(Math.round(num)) : '—';
}

/**
 * @param {ReturnType<typeof runRepositoryQuery>['stats']} stats
 * @returns {string}
 */
export function buildRepositoryKpiCardsHtml(stats) {
  const cards = [
    { key: 'total', label: 'Toplam kayıt', value: stats.total, hint: 'tüm kayıtlar' },
    { key: 'active', label: 'Aktif kayıt', value: stats.active, hint: 'arşiv hariç' },
    { key: 'duplicate', label: 'Duplicate', value: stats.duplicate, hint: 'exact + similar' },
    { key: 'average_ai', label: 'Ortalama AI', value: stats.average_ai ?? '—', hint: 'decision score' },
    { key: 'average_risk', label: 'Ortalama Risk', value: stats.average_risk ?? '—', hint: 'risk score' },
    { key: 'average_quality', label: 'Ortalama Kalite', value: stats.average_quality ?? '—', hint: 'quality score' },
    { key: 'today', label: 'Bugün eklenen', value: stats.today, hint: 'bugün oluşturulan' }
  ];

  return cards
    .map(
      (card) => `
    <article class="ai-listings-admin__kpi-card ai-listings-admin__kpi-card--repo-${card.key}" data-kpi-value="${safeRenderText(card.value)}">
      <div class="ai-listings-admin__kpi-body">
        <span class="ai-listings-admin__kpi-label">${safeRenderText(card.label)}</span>
        <span class="ai-listings-admin__kpi-value" data-kpi-counter="0">0</span>
        <span class="ai-listings-admin__kpi-hint">${safeRenderText(card.hint)}</span>
      </div>
    </article>`
    )
    .join('');
}

/**
 * @param {ReturnType<typeof runRepositoryQuery>['summary']} summary
 * @returns {string}
 */
export function buildRepositorySummaryHtml(summary) {
  return `
    <section class="ai-listings-admin__repo-summary" aria-label="Repository özeti">
      <div class="ai-listings-admin__repo-summary-item">
        <span class="ai-listings-admin__repo-summary-label">Toplam kayıt</span>
        <strong>${safeRenderText(summary.total_records)}</strong>
      </div>
      <div class="ai-listings-admin__repo-summary-item">
        <span class="ai-listings-admin__repo-summary-label">Son 24 saat</span>
        <strong>${safeRenderText(summary.last_24h)}</strong>
      </div>
      <div class="ai-listings-admin__repo-summary-item">
        <span class="ai-listings-admin__repo-summary-label">En çok marka</span>
        <strong>${safeRenderText(summary.top_brand ?? '—')}</strong>
      </div>
      <div class="ai-listings-admin__repo-summary-item">
        <span class="ai-listings-admin__repo-summary-label">En çok duplicate</span>
        <strong>${safeRenderText(summary.top_duplicate ?? '—')}</strong>
      </div>
      <div class="ai-listings-admin__repo-summary-item">
        <span class="ai-listings-admin__repo-summary-label">Ortalama AI</span>
        <strong>${safeRenderText(summary.average_ai ?? '—')}</strong>
      </div>
      <div class="ai-listings-admin__repo-summary-item">
        <span class="ai-listings-admin__repo-summary-label">Ortalama kalite</span>
        <strong>${safeRenderText(summary.average_quality ?? '—')}</strong>
      </div>
    </section>`;
}

/**
 * @param {string} activeTab
 * @returns {string}
 */
export function buildRepositoryCategoryTabsHtml(activeTab = 'all') {
  const current = String(activeTab ?? 'all').trim().toLowerCase();
  return REPOSITORY_CATEGORY_TABS.map((tab) => {
    const isActive = tab.id === current;
    return `
      <button type="button"
        class="ai-listings-admin__repo-tab${isActive ? ' ai-listings-admin__repo-tab--active' : ''}"
        data-repo-category-tab="${safeRenderText(tab.id)}"
        role="tab"
        aria-selected="${isActive ? 'true' : 'false'}">
        ${safeRenderText(tab.label)}
      </button>`;
  }).join('');
}

/**
 * @param {string[]} activeFilters
 * @returns {string}
 */
export function buildRepositoryFilterChipsHtml(activeFilters = []) {
  const active = new Set(activeFilters.map((value) => String(value).trim().toLowerCase()));
  return REPOSITORY_FILTER_CHIPS.map((chip) => {
    const isActive = active.has(chip.id);
    return `
      <button type="button"
        class="ai-listings-admin__chip${isActive ? ' ai-listings-admin__chip--active' : ''}"
        data-repo-filter="${safeRenderText(chip.id)}"
        aria-pressed="${isActive ? 'true' : 'false'}">
        ${isActive ? '✓ ' : ''}${safeRenderText(chip.label)}
      </button>`;
  }).join('');
}

/**
 * @param {Record<string, unknown>} record
 * @param {boolean} [isActive]
 * @returns {string}
 */
export function buildRepositoryCardHtml(record, isActive = false) {
  const activeClass = isActive ? ' ai-listings-admin__repo-card--active' : '';
  const duplicateClass =
    record.duplicate_status === 'exact' || record.duplicate_status === 'similar'
      ? ' ai-listings-admin__repo-card--duplicate'
      : '';

  return `
    <article class="ai-listings-admin__repo-card${activeClass}${duplicateClass}"
      data-repo-record-id="${safeRenderText(record.id)}"
      tabindex="0">
      <header class="ai-listings-admin__repo-card-head">
        <h3 class="ai-listings-admin__repo-card-title">${safeRenderText(record.title || '—')}</h3>
        <span class="ai-listings-admin__repo-card-category">${safeRenderText(getRepositoryCategoryLabelTr(record.category))}</span>
      </header>
      <div class="ai-listings-admin__repo-card-metrics">
        <span class="ai-listings-admin__repo-metric">Karar: ${safeRenderText(record.executive_label ?? '—')}</span>
        <span class="ai-listings-admin__repo-metric">AI: ${safeRenderText(formatRepositoryScore(record.decision_score))}</span>
        <span class="ai-listings-admin__repo-metric">Risk: ${safeRenderText(formatRepositoryScore(record.risk_score))}</span>
        <span class="ai-listings-admin__repo-metric">Kalite: ${safeRenderText(formatRepositoryScore(record.quality_score))}</span>
      </div>
      <footer class="ai-listings-admin__repo-card-foot">
        <span class="ai-listings-admin__repo-badge ai-listings-admin__repo-badge--dup">${safeRenderText(getRepositoryDuplicateLabelTr(record.duplicate_status))}</span>
        <span class="ai-listings-admin__repo-badge ai-listings-admin__repo-badge--source">${safeRenderText(getRepositorySourceLabelTr(record.source))}</span>
        <time class="ai-listings-admin__repo-date">${safeRenderText(formatRepositoryDate(record.updated_at || record.created_at))}</time>
      </footer>
    </article>`;
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string|null} [selectedId]
 * @returns {string}
 */
export function buildRepositoryCardsGridHtml(records, selectedId = null) {
  if (!records.length) {
    return '<p class="ai-listings-admin__empty-state">Repository kaydı bulunamadı.</p>';
  }

  return `
    <div class="ai-listings-admin__repo-grid">
      ${records.map((record) => buildRepositoryCardHtml(record, selectedId && String(record.id) === String(selectedId))).join('')}
    </div>`;
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{
 *   categoryTab?: string,
 *   filters?: string[],
 *   search?: string,
 *   selectedId?: string|null
 * }} [options]
 * @returns {{ html: string, query: ReturnType<typeof runRepositoryQuery> }}
 */
export function buildRepositoryDashboardHtml(listings, options = {}) {
  const query = runRepositoryQuery(listings, {
    categoryTab: options.categoryTab ?? 'all',
    filters: options.filters ?? [],
    search: options.search ?? ''
  });

  const html = `
    <div class="ai-listings-admin__repo-dashboard">
      <header class="ai-listings-admin__repo-head">
        <h2>Repository</h2>
        <p class="ai-listings-admin__muted">Ortak veri merkezi — mevcut ilanlardan türetilmiş görünüm</p>
      </header>
      ${buildRepositorySummaryHtml(query.summary)}
      <div class="ai-listings-admin__repo-tabs" role="tablist" aria-label="Kategori">
        ${buildRepositoryCategoryTabsHtml(options.categoryTab ?? 'all')}
      </div>
      <div class="ai-listings-admin__repo-filters" aria-label="Repository filtreleri">
        ${buildRepositoryFilterChipsHtml(options.filters ?? [])}
      </div>
      <p class="ai-listings-admin__repo-count">${safeRenderText(query.filtered.length)} kayıt gösteriliyor</p>
      ${buildRepositoryCardsGridHtml(query.filtered, options.selectedId ?? null)}
    </div>`;

  return { html, query };
}
