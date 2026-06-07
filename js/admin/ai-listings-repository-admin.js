/**
 * AI Listings Repository — admin UI builders (Sprint-11 + Sprint-15 AI Search).
 * Client-side derive only; no endpoint, auth, or schema changes.
 */

import { escapeHtml } from '../core/dom-safe.js';
import {
  REPOSITORY_CATEGORY_TABS,
  REPOSITORY_FILTER_CHIPS,
  runRepositoryQuery
} from '../ai-listings-repository/index.js';
import {
  runRepositorySearch,
  SEARCH_SORT_OPTIONS,
  SEARCH_FILTER_CHIPS,
  buildSearchSuggestions,
  buildSearchResults,
  sanitizeSearchQuery
} from '../ai-listings-search/index.js';

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
 * @param {number|null|undefined} value
 * @returns {string}
 */
export function formatRepositoryKm(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${num.toLocaleString('tr-TR')} km`;
}

/**
 * @param {number|null|undefined} value
 * @param {string} [currency]
 * @returns {string}
 */
export function formatRepositoryPrice(value, currency = 'TRY') {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${num.toLocaleString('tr-TR')} ${safeRenderText(currency)}`;
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
 * @param {string[]} activeFilters
 * @returns {string}
 */
export function buildSearchFilterChipsHtml(activeFilters = []) {
  const active = new Set(activeFilters.map((value) => String(value).trim().toLowerCase()));
  return SEARCH_FILTER_CHIPS.map((chip) => {
    const isActive = active.has(chip.id);
    return `
      <button type="button"
        class="ai-listings-admin__chip ai-listings-admin__chip--search${isActive ? ' ai-listings-admin__chip--active' : ''}"
        data-repo-search-filter="${safeRenderText(chip.id)}"
        aria-pressed="${isActive ? 'true' : 'false'}">
        ${isActive ? '✓ ' : ''}${safeRenderText(chip.label)}
      </button>`;
  }).join('');
}

/**
 * @param {string} activeSort
 * @returns {string}
 */
export function buildSearchSortSelectHtml(activeSort = 'best_match') {
  const current = String(activeSort ?? 'best_match').trim().toLowerCase();
  return `
    <label class="ai-listings-admin__repo-search-sort">
      <span class="ai-listings-admin__muted">Sıralama</span>
      <select id="ai-listings-repo-search-sort" data-repo-search-sort>
        ${SEARCH_SORT_OPTIONS.map(
          (option) => `
          <option value="${safeRenderText(option.id)}"${option.id === current ? ' selected' : ''}>
            ${safeRenderText(option.label)}
          </option>`
        ).join('')}
      </select>
    </label>`;
}

/**
 * @param {string} query
 * @param {string[]} suggestions
 * @returns {string}
 */
export function buildSearchSuggestionsHtml(query, suggestions = []) {
  if (!query.trim() || !suggestions.length) return '';
  return `
    <ul class="ai-listings-admin__repo-search-suggestions" role="listbox" aria-label="Arama önerileri">
      ${suggestions
        .map(
          (item) => `
        <li>
          <button type="button" class="ai-listings-admin__repo-search-suggestion" data-repo-search-suggestion="${safeRenderText(item)}">
            ${safeRenderText(item)}
          </button>
        </li>`
        )
        .join('')}
    </ul>`;
}

/**
 * @param {string} aiSearchQuery
 * @param {string[]} suggestions
 * @returns {string}
 */
export function buildAiSearchSectionHtml(aiSearchQuery = '', suggestions = []) {
  const safeQuery = sanitizeSearchQuery(aiSearchQuery);
  return `
    <section class="ai-listings-admin__repo-search" aria-label="AI Search">
      <div class="ai-listings-admin__repo-search-head">
        <h3>AI Search</h3>
        ${buildSearchSortSelectHtml()}
      </div>
      <div class="ai-listings-admin__repo-search-input-wrap">
        <input
          id="ai-listings-repo-ai-search"
          class="ai-listings-admin__repo-search-input"
          type="search"
          value="${safeRenderText(safeQuery)}"
          placeholder="BMW 2022 düşük km&#10;Audi otomatik&#10;SUV dizel&#10;Yetkili servis&#10;Tek parça boya"
          autocomplete="off"
          spellcheck="false"
          aria-label="AI Search" />
        ${buildSearchSuggestionsHtml(safeQuery, suggestions)}
      </div>
    </section>`;
}

/**
 * @param {{ message: string }} summary
 * @returns {string}
 */
export function buildSearchResultSummaryHtml(summary) {
  const lines = String(summary.message ?? '').split('\n');
  return `
    <p class="ai-listings-admin__repo-search-summary" aria-live="polite">
      ${lines.map((line) => safeRenderText(line)).join('<br>')}
    </p>`;
}

/**
 * @param {Record<string, unknown>} record
 * @param {boolean} [isActive]
 * @param {boolean} [isSearchResult]
 * @returns {string}
 */
export function buildRepositoryCardHtml(record, isActive = false, isSearchResult = false) {
  const activeClass = isActive ? ' ai-listings-admin__repo-card--active' : '';
  const duplicateClass =
    record.duplicate_status === 'exact' || record.duplicate_status === 'similar'
      ? ' ai-listings-admin__repo-card--duplicate'
      : '';
  const searchClass = isSearchResult ? ' ai-listings-admin__repo-card--search' : '';

  const titleHtml = isSearchResult && record.highlighted?.title
    ? String(record.highlighted.title)
    : safeRenderText(record.title || '—');

  const similarityBadge = isSearchResult
    ? `<span class="ai-listings-admin__repo-similarity">${safeRenderText(record.similarity_percent ?? 0)}%</span>`
    : '';

  const detailRows = isSearchResult
    ? `
      <div class="ai-listings-admin__repo-card-details">
        <span>Marka: ${record.highlighted?.brand ? String(record.highlighted.brand) : safeRenderText(record.brand || '—')}</span>
        <span>Model: ${record.highlighted?.model ? String(record.highlighted.model) : safeRenderText(record.model || '—')}</span>
        <span>Yıl: ${safeRenderText(record.year ?? '—')}</span>
        <span>KM: ${safeRenderText(formatRepositoryKm(record.km))}</span>
        <span>Fiyat: ${safeRenderText(formatRepositoryPrice(record.price, String(record.currency ?? 'TRY')))}</span>
      </div>`
    : '';

  return `
    <article class="ai-listings-admin__repo-card${activeClass}${duplicateClass}${searchClass}"
      data-repo-record-id="${safeRenderText(record.id)}"
      tabindex="0">
      <header class="ai-listings-admin__repo-card-head">
        <h3 class="ai-listings-admin__repo-card-title">${titleHtml}${similarityBadge}</h3>
        <span class="ai-listings-admin__repo-card-category">${safeRenderText(getRepositoryCategoryLabelTr(record.category))}</span>
      </header>
      ${detailRows}
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
 * @param {boolean} [isSearchResult]
 * @returns {string}
 */
export function buildRepositoryCardsGridHtml(records, selectedId = null, isSearchResult = false) {
  if (!records.length) {
    return '<p class="ai-listings-admin__empty-state">Repository kaydı bulunamadı.</p>';
  }

  return `
    <div class="ai-listings-admin__repo-grid">
      ${records.map((record) => buildRepositoryCardHtml(record, selectedId && String(record.id) === String(selectedId), isSearchResult)).join('')}
    </div>`;
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{
 *   categoryTab?: string,
 *   filters?: string[],
 *   search?: string,
 *   aiSearch?: string,
 *   sortBy?: string,
 *   selectedId?: string|null
 * }} [options]
 * @returns {{ html: string, query: ReturnType<typeof runRepositoryQuery>, searchResult?: ReturnType<typeof runRepositorySearch> }}
 */
export function buildRepositoryDashboardHtml(listings, options = {}) {
  const aiSearch = sanitizeSearchQuery(options.aiSearch ?? '');
  const hasAiSearch = aiSearch.length > 0;
  const hasListings = Array.isArray(listings) && listings.length > 0;

  if (!hasListings) {
    const emptyHtml = `
      <div class="ai-listings-admin__repo-dashboard">
        <header class="ai-listings-admin__repo-head">
          <h2>Repository</h2>
          <p class="ai-listings-admin__muted">Ortak veri merkezi — mevcut ilanlardan türetilmiş görünüm</p>
        </header>
        ${buildAiSearchSectionHtml(aiSearch, [])}
        <p class="ai-listings-admin__empty-state">Yeterli veri yok</p>
      </div>`;
    return {
      html: emptyHtml,
      query: runRepositoryQuery([], options)
    };
  }

  const searchResult = runRepositorySearch(listings, {
    query: aiSearch,
    categoryTab: options.categoryTab ?? 'all',
    filters: options.filters ?? [],
    sortBy: hasAiSearch ? (options.sortBy ?? 'best_match') : (options.sortBy ?? 'newest')
  });

  const query = runRepositoryQuery(listings, {
    categoryTab: options.categoryTab ?? 'all',
    filters: options.filters ?? [],
    search: options.search ?? ''
  });

  const suggestions = buildSearchSuggestions(searchResult.documents, aiSearch);
  const displayRecords = hasAiSearch
    ? buildSearchResults(searchResult.results, searchResult.parsed, aiSearch)
    : query.filtered;

  const summaryHtml = hasAiSearch
    ? buildSearchResultSummaryHtml(searchResult.summary)
    : '';

  const countLabel = hasAiSearch
    ? `${displayRecords.length} kayıt bulundu`
    : `${displayRecords.length} kayıt gösteriliyor`;

  const html = `
    <div class="ai-listings-admin__repo-dashboard">
      <header class="ai-listings-admin__repo-head">
        <h2>Repository</h2>
        <p class="ai-listings-admin__muted">Ortak veri merkezi — mevcut ilanlardan türetilmiş görünüm</p>
      </header>
      ${buildRepositorySummaryHtml(query.summary)}
      ${buildAiSearchSectionHtml(aiSearch, suggestions)}
      ${summaryHtml}
      <div class="ai-listings-admin__repo-tabs" role="tablist" aria-label="Kategori">
        ${buildRepositoryCategoryTabsHtml(options.categoryTab ?? 'all')}
      </div>
      <div class="ai-listings-admin__repo-filters" aria-label="Repository filtreleri">
        ${buildRepositoryFilterChipsHtml(options.filters ?? [])}
      </div>
      <div class="ai-listings-admin__repo-search-filters" aria-label="Arama filtreleri">
        ${buildSearchFilterChipsHtml(options.filters ?? [])}
      </div>
      <p class="ai-listings-admin__repo-count">${safeRenderText(countLabel)}</p>
      ${buildRepositoryCardsGridHtml(displayRecords, options.selectedId ?? null, hasAiSearch)}
    </div>`;

  return { html, query, searchResult };
}
