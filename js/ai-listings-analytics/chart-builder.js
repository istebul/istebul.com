/**
 * AI Listings Analytics — SVG chart builder (Sprint-12).
 */

export const CHART_FALLBACK_MESSAGE = 'Yeterli veri yok';

/**
 * @param {Array<{ label?: string, count?: number }>|null|undefined} data
 * @returns {boolean}
 */
export function hasChartData(data) {
  return Array.isArray(data) && data.some((item) => Number(item?.count) > 0);
}

/**
 * @param {string} [message]
 * @returns {string}
 */
export function buildChartFallbackHtml(message = CHART_FALLBACK_MESSAGE) {
  return `<div class="ai-analytics-chart-fallback" role="status">${escapeText(message)}</div>`;
}

/**
 * @param {Array<{ label: string, count: number }>} data
 * @param {{ title?: string, id?: string, maxValue?: number }} [options]
 * @returns {string}
 */
export function buildBarChartSvg(data, options = {}) {
  if (!hasChartData(data)) {
    return buildChartFallbackHtml();
  }

  const title = options.title ?? '';
  const chartId = options.id ?? `chart-${Math.random().toString(36).slice(2, 8)}`;
  const width = 320;
  const height = 180;
  const padding = { top: 24, right: 12, bottom: 36, left: 12 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = options.maxValue ?? Math.max(1, ...data.map((item) => item.count));
  const barGap = 8;
  const barWidth = data.length ? (innerWidth - barGap * (data.length - 1)) / data.length : innerWidth;

  const bars = data
    .map((item, index) => {
      const barHeight = maxValue > 0 ? (item.count / maxValue) * innerHeight : 0;
      const x = padding.left + index * (barWidth + barGap);
      const y = padding.top + innerHeight - barHeight;
      return `
        <g class="ai-analytics-chart__bar-group">
          <rect class="ai-analytics-chart__bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" data-count="${item.count}">
            <title>${escapeAttr(item.label)}: ${item.count}</title>
          </rect>
          <text class="ai-analytics-chart__label" x="${x + barWidth / 2}" y="${height - 8}" text-anchor="middle">${escapeText(truncateLabel(item.label, 8))}</text>
          <text class="ai-analytics-chart__value" x="${x + barWidth / 2}" y="${y - 4}" text-anchor="middle">${item.count}</text>
        </g>`;
    })
    .join('');

  const titleEl = title
    ? `<text class="ai-analytics-chart__title" x="${width / 2}" y="14" text-anchor="middle">${escapeText(title)}</text>`
    : '';

  return `
    <figure class="ai-analytics-chart" data-chart-id="${escapeAttr(chartId)}" role="img" aria-label="${escapeAttr(title || 'Grafik')}">
      <svg viewBox="0 0 ${width} ${height}" class="ai-analytics-chart__svg" preserveAspectRatio="xMidYMid meet">
        ${titleEl}
        <rect class="ai-analytics-chart__glass" x="0" y="0" width="${width}" height="${height}" rx="12"></rect>
        ${bars}
      </svg>
    </figure>`;
}

/**
 * @param {Array<{ label: string, count: number }>} data
 * @param {{ title?: string, id?: string }} [options]
 * @returns {string}
 */
export function buildTrendChartSvg(data, options = {}) {
  return buildBarChartSvg(data, { ...options, title: options.title ?? 'Trend' });
}

/**
 * @param {Array<{ label: string, count: number }>} data
 * @param {{ title?: string, limit?: number }} [options]
 * @returns {string}
 */
export function buildTopListHtml(data, options = {}) {
  const title = options.title ?? '';
  const limit = options.limit ?? 10;
  const items = data.slice(0, limit);
  if (!hasChartData(items)) {
    return `<div class="ai-analytics-top-list">${buildChartFallbackHtml()}</div>`;
  }

  const max = Math.max(1, ...items.map((item) => item.count));
  const rows = items
    .map(
      (item, index) => `
      <div class="ai-analytics-top-list__row">
        <span class="ai-analytics-top-list__rank">${index + 1}</span>
        <span class="ai-analytics-top-list__label">${escapeText(item.label)}</span>
        <span class="ai-analytics-top-list__bar-wrap" aria-hidden="true">
          <span class="ai-analytics-top-list__bar" style="width:${Math.round((item.count / max) * 100)}%"></span>
        </span>
        <span class="ai-analytics-top-list__count">${item.count}</span>
      </div>`
    )
    .join('');

  return `
    <section class="ai-analytics-top-list">
      ${title ? `<h4 class="ai-analytics-top-list__title">${escapeText(title)}</h4>` : ''}
      ${rows}
    </section>`;
}

/**
 * @param {string} value
 * @param {number} maxLen
 * @returns {string}
 */
function truncateLabel(value, maxLen) {
  const text = String(value ?? '');
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeAttr(value) {
  return escapeText(value);
}

/**
 * @param {string} chartId
 * @param {() => string} builder
 * @returns {string}
 */
export function lazyChartPlaceholder(chartId, builder) {
  return `<div class="ai-analytics-chart-lazy" data-lazy-chart="${escapeAttr(chartId)}" hidden>${builder()}</div>`;
}

/**
 * @param {HTMLElement} root
 * @param {Record<string, () => string>} chartBuilders
 */
export function hydrateLazyCharts(root, chartBuilders) {
  if (!root || !chartBuilders) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = /** @type {HTMLElement} */ (entry.target);
        const chartId = el.getAttribute('data-lazy-chart');
        if (!chartId || !chartBuilders[chartId]) continue;
        el.innerHTML = chartBuilders[chartId]();
        el.removeAttribute('hidden');
        observer.unobserve(el);
      }
    },
    { rootMargin: '120px' }
  );

  root.querySelectorAll('[data-lazy-chart]').forEach((node) => observer.observe(node));
}
