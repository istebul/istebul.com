'use strict';

const path = require('path');

const root = path.resolve(__dirname, '../..');

const CATEGORY_DISPLAY_ORDER = [
  'araba',
  'tatil',
  'konut',
  'finansman',
  'sigorta',
  'kasko'
];

const CATEGORY_ICONS = {
  araba:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17h14M5 17a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h1l1.4-3.5A2 2 0 0 1 9.2 7h5.6a2 2 0 0 1 1.8 1.1L18 11.5h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0"/></svg>',
  konut:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  tatil:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18"/><path d="M8 7c0-2 1.5-4 4-4s4 2 4 4-1.5 3-4 3-4-1-4-3Z"/><path d="M6 21c1.5-2 4-3 6-3s4.5 1 6 3"/></svg>',
  finansman:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h18M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/><path d="M12 14v4"/></svg>',
  sigorta:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>',
  kasko:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z"/><path d="M12 11v4"/><path d="M12 8h.01"/></svg>'
};

const GRID_MARKER = 'id="home-category-grid"';
const PRERENDER_ATTR = 'data-home-category-prerender="1"';

let prerenderDataPromise = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function categoryIconMarkup(categoryId) {
  return CATEGORY_ICONS[categoryId] || CATEGORY_ICONS.sigorta;
}

function sortCategoriesForDisplay(categories) {
  return [...categories].sort(
    (a, b) => CATEGORY_DISPLAY_ORDER.indexOf(a.id) - CATEGORY_DISPLAY_ORDER.indexOf(b.id)
  );
}

async function loadPrerenderData() {
  if (!prerenderDataPromise) {
    prerenderDataPromise = (async () => {
      const { HOME_DECISION_CATEGORIES, isHomeCategoryActive } = await import(
        path.join(root, 'js/platform/home-category-config.js')
      );
      const { getHomeCategoryCardImage } = await import(
        path.join(root, 'js/platform/home-category-visuals.js')
      );
      const { marketingCopy } = await import(
        path.join(root, 'js/features/i18n/marketing-copy.js')
      );

      const trCopy = marketingCopy?.tr;
      if (!trCopy?.categories || !trCopy?.home) {
        throw new Error('Home category prerender: marketingCopy.tr categories/home missing');
      }

      const activeCategories = sortCategoriesForDisplay(
        HOME_DECISION_CATEGORIES.filter((category) => isHomeCategoryActive(category))
      );

      if (activeCategories.length !== CATEGORY_DISPLAY_ORDER.length) {
        throw new Error(
          `Home category prerender: expected ${CATEGORY_DISPLAY_ORDER.length} active categories, got ${activeCategories.length}`
        );
      }

      const enriched = activeCategories.map((category) => {
        const copy = trCopy.categories[category.id];
        const imageSrc = getHomeCategoryCardImage(category.id);

        if (!copy?.name || !copy?.desc) {
          throw new Error(`Home category prerender: missing TR copy for ${category.id}`);
        }
        if (!category.href) {
          throw new Error(`Home category prerender: missing href for ${category.id}`);
        }
        if (!imageSrc) {
          throw new Error(`Home category prerender: missing card image for ${category.id}`);
        }

        return {
          ...category,
          title: copy.name,
          desc: copy.desc,
          imageSrc,
          analyzeLink: trCopy.home.analyzeLink,
          analyzeAction: trCopy.home.analyzeAction,
          gridAria: trCopy.home.categoriesGridAria
        };
      });

      const orderIds = enriched.map((category) => category.id);
      if (orderIds.join(',') !== CATEGORY_DISPLAY_ORDER.join(',')) {
        throw new Error(
          `Home category prerender: active category order mismatch (got ${orderIds.join(', ')})`
        );
      }

      return enriched;
    })();
  }

  return prerenderDataPromise;
}

function renderCardImage(imageSrc, index) {
  const eager = index < 2;
  const loading = eager ? 'eager' : 'lazy';
  const fetchPriority = eager ? 'high' : 'low';

  return `
      <div class="ib-cat-mockup__bg" aria-hidden="true">
        <img
          src="${escapeHtml(imageSrc)}"
          alt=""
          width="800"
          height="500"
          loading="${loading}"
          decoding="async"
          fetchpriority="${fetchPriority}"
        />
      </div>
    `;
}

function renderActiveCard(category, index) {
  const score = category.sampleScore != null ? String(category.sampleScore) : '—';

  return `
    <a
      href="${escapeHtml(category.href)}"
      class="ib-cat-mockup ib-cat-mockup--premium is-active ib-cat-mockup--${escapeHtml(category.id)}"
      data-category-id="${escapeHtml(category.id)}"
      data-native-route
      role="listitem"
      style="--ib-cat-i: ${index}"
      aria-label="${escapeHtml(category.title)} — ${escapeHtml(category.analyzeAction)}"
    >
      ${renderCardImage(category.imageSrc, index)}
      <div class="ib-cat-mockup__theme" aria-hidden="true"></div>
      <div class="ib-cat-mockup__overlay" aria-hidden="true"></div>
      <div class="ib-cat-mockup__glow" aria-hidden="true"></div>
      <div class="ib-cat-mockup__body">
        <div class="ib-cat-mockup__top">
          <span class="ib-cat-mockup__icon">${categoryIconMarkup(category.id)}</span>
          <span class="ib-cat-mockup__score">${escapeHtml(score)}<span class="ib-cat-mockup__score-suffix">/100</span></span>
        </div>
        <div class="ib-cat-mockup__panel">
          <h3 class="ib-cat-mockup__title">${escapeHtml(category.title)}</h3>
          <p class="ib-cat-mockup__desc">${escapeHtml(category.desc)}</p>
          <span class="ib-cat-mockup__link">${escapeHtml(category.analyzeLink)}</span>
        </div>
      </div>
    </a>
  `;
}

function renderGridInner(categories) {
  const liveHtml = categories.map((category, index) => renderActiveCard(category, index)).join('');
  const gridAria = escapeHtml(categories[0]?.gridAria || 'Karar kategorileri');

  return `
    <div class="ib-cat-mockup-shell" ${PRERENDER_ATTR}>
      <div class="ib-cat-mockup-shell__live" role="list" aria-label="${gridAria}">
        ${liveHtml}
      </div>
    </div>
  `;
}

function locateHomeCategoryGrid(html) {
  const markerIdx = html.indexOf(GRID_MARKER);
  if (markerIdx === -1) {
    throw new Error('Home category grid mount not found: #home-category-grid');
  }

  const openTagStart = html.lastIndexOf('<div', markerIdx);
  if (openTagStart === -1) {
    throw new Error('Home category grid opening tag not found');
  }

  const openTagEnd = html.indexOf('>', markerIdx);
  if (openTagEnd === -1) {
    throw new Error('Home category grid opening tag is malformed');
  }

  const closeTagStart = html.indexOf('</div>', openTagEnd + 1);
  if (closeTagStart === -1) {
    throw new Error('Home category grid closing tag not found');
  }

  return { openTagStart, openTagEnd, closeTagStart };
}

async function injectHomeCategoryPrerender(html) {
  if (html.includes(PRERENDER_ATTR)) {
    return html;
  }

  const categories = await loadPrerenderData();
  const { openTagStart, openTagEnd, closeTagStart } = locateHomeCategoryGrid(html);

  const openingTag = html.slice(openTagStart, openTagEnd + 1);
  const inner = renderGridInner(categories);

  return html.slice(0, openTagEnd + 1) + inner + html.slice(closeTagStart);
}

module.exports = { injectHomeCategoryPrerender };
