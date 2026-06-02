/**
 * Kategori bazlı karar rehberleri hub — hero + liste (haber kartı UX, rehber içeriği).
 */

import {
  GUIDE_CATEGORIES,
  blogPostPath,
  excerptText,
  fetchPublishedPostsByCategory,
  formatContentDate,
  getGuideCategory,
  normalizeGuidePost
} from './public-content.js';
import { escapeHtml } from '../../core/security.js';

const DEFAULT_COVER = '/assets/images/og-image.svg';

function postHref(post) {
  if (String(post?.id || '').startsWith('seed-')) {
    return `/blog?kategori=${encodeURIComponent(post.category || 'auto')}`;
  }
  return blogPostPath(post.slug);
}

function coverUrl(post) {
  const url = String(post?.cover_image_url || '').trim();
  return url || DEFAULT_COVER;
}

function renderDigestLead(post) {
  const href = postHref(post);
  const excerpt = post.excerpt || excerptText(post.body, 72);
  return `
    <a class="ib-guides-digest-lead" href="${escapeHtml(href)}" data-native-route>
      <span class="ib-guides-digest-lead-thumb">
        <img src="${escapeHtml(coverUrl(post))}" alt="" loading="lazy" decoding="async" width="80" height="60">
      </span>
      <span class="ib-guides-digest-lead-body">
        <span class="ib-guides-digest-lead-kicker">${escapeHtml(getGuideCategory(post.category)?.label || 'Rehber')}</span>
        <strong>${escapeHtml(post.title)}</strong>
        <span>${escapeHtml(excerpt)}</span>
      </span>
    </a>`;
}

function renderFeaturedCard(post, ctaHref, ctaLabel) {
  const href = postHref(post);
  const excerpt = post.excerpt || excerptText(post.body, 120);
  return `
    <a class="ib-guides-featured" href="${escapeHtml(href)}" data-native-route>
      <span class="ib-guides-featured-media">
        <img src="${escapeHtml(coverUrl(post))}" alt="" loading="lazy" decoding="async" width="640" height="360">
      </span>
      <span class="ib-guides-featured-body">
        <span class="ib-guides-featured-kicker">${escapeHtml(getGuideCategory(post.category)?.label || 'Rehber')}</span>
        <strong class="ib-guides-featured-title">${escapeHtml(post.title)}</strong>
        <span class="ib-guides-featured-excerpt">${escapeHtml(excerpt)}</span>
        ${post.source_label ? `<span class="ib-guides-source">Kaynak: ${escapeHtml(post.source_label)}</span>` : ''}
      </span>
    </a>
    <a class="btn btn-primary btn-sm ib-guides-inline-cta" href="${escapeHtml(ctaHref)}">${escapeHtml(ctaLabel)}</a>`;
}

function renderCompactItem(post) {
  const href = postHref(post);
  const excerpt = post.excerpt || excerptText(post.body, 90);
  return `
    <a class="ib-guides-compact" href="${escapeHtml(href)}" data-native-route>
      <span class="ib-guides-compact-thumb">
        <img src="${escapeHtml(coverUrl(post))}" alt="" loading="lazy" decoding="async" width="96" height="72">
      </span>
      <span class="ib-guides-compact-body">
        <strong>${escapeHtml(post.title)}</strong>
        <span>${escapeHtml(excerpt)}</span>
        <em>${escapeHtml(formatContentDate(post.created_at))}</em>
      </span>
    </a>`;
}

function renderEmptyState(categoryId) {
  const cat = getGuideCategory(categoryId);
  return `
    <div class="ib-guides-empty">
      <p><strong>${escapeHtml(cat?.label || 'Rehber')} rehberleri yakında.</strong></p>
      <p class="text-muted-sm">Pilot içerikler admin panelden yayınlandığında burada görünür.</p>
      <a class="btn btn-outline btn-sm" href="${escapeHtml(cat?.ctaHref || '/auto/')}">${escapeHtml(cat?.ctaLabel || 'Analiz başlat')}</a>
    </div>`;
}

function renderStripRow(post) {
  const href = postHref(post);
  const excerpt = post.excerpt || excerptText(post.body, 58);
  return `
    <a class="ib-guides-strip-row" href="${escapeHtml(href)}" data-native-route>
      <span class="ib-guides-strip-thumb">
        <img src="${escapeHtml(coverUrl(post))}" alt="" loading="lazy" decoding="async" width="64" height="48">
      </span>
      <span class="ib-guides-strip-text">
        <span class="ib-guides-strip-kicker">${escapeHtml(getGuideCategory(post.category)?.label || 'Haber')}</span>
        <strong>${escapeHtml(post.title)}</strong>
        <span>${escapeHtml(excerpt)}</span>
      </span>
      <span class="ib-guides-strip-more" aria-hidden="true">Oku</span>
    </a>`;
}

function renderGuidesPanel(posts, categoryId, layout = 'hero') {
  const cat = getGuideCategory(categoryId);
  if (!posts.length) return renderEmptyState(categoryId);

  const featured = posts.find((p) => p.is_featured) || posts[0];
  const rest = posts.filter((p) => p.slug !== featured.slug).slice(0, layout === 'digest' ? 2 : 2);

  if (layout === 'strip') {
    return `
      <div class="ib-guides-panel ib-guides-panel--strip" data-guides-panel="${escapeHtml(categoryId)}">
        ${renderStripRow(featured)}
      </div>`;
  }

  if (layout === 'digest') {
    return `
      <div class="ib-guides-panel ib-guides-panel--digest" data-guides-panel="${escapeHtml(categoryId)}">
        ${renderDigestLead(featured)}
        <div class="ib-guides-compact-list ib-guides-compact-list--digest">
          ${rest.map(renderCompactItem).join('')}
        </div>
      </div>`;
  }

  return `
    <div class="ib-guides-panel" data-guides-panel="${escapeHtml(categoryId)}">
      ${renderFeaturedCard(featured, cat?.ctaHref || '/auto/', cat?.ctaLabel || 'Analiz başlat')}
      <div class="ib-guides-compact-list">
        ${rest.map(renderCompactItem).join('') || renderCompactItem(featured)}
      </div>
    </div>`;
}

export function renderCategoryGuidesInner({
  mountId = 'guides-hub',
  title = 'Güncel rehberler',
  lead = '',
  showTabs = true,
  defaultCategory = 'auto',
  allHref = '/blog',
  layout = 'hero',
  allLinkLabel = 'Tüm rehberler'
} = {}) {
  const tabs = showTabs
    ? `
      <div class="ib-guides-tabs" role="tablist" aria-label="Rehber kategorileri">
        ${GUIDE_CATEGORIES.map(
          (cat) => `
          <button
            type="button"
            class="ib-guides-tab${cat.id === defaultCategory ? ' is-active' : ''}"
            role="tab"
            aria-selected="${cat.id === defaultCategory ? 'true' : 'false'}"
            data-guides-tab="${escapeHtml(cat.id)}"
          >${escapeHtml(cat.label)}</button>`
        ).join('')}
      </div>`
    : '';

  const headerClass = layout === 'strip' ? ' ib-guides-header--strip' : '';

  return `
    <div class="ib-guides-card">
      <header class="ib-guides-header${headerClass}">
        <div class="ib-guides-header-main">
          <p class="ib-guides-eyebrow">Bilgilendirme</p>
          <h2 id="${escapeHtml(mountId)}-title">${escapeHtml(title)}</h2>
          ${lead ? `<p class="ib-guides-lead">${escapeHtml(lead)}</p>` : ''}
        </div>
        <a class="ib-guides-all ib-guides-all--header" href="${escapeHtml(allHref)}" data-guides-all-link data-native-route>${escapeHtml(allLinkLabel)}</a>
      </header>
      ${tabs}
      <div class="ib-guides-body" data-guides-body aria-live="polite">Yükleniyor…</div>
      ${layout === 'strip' ? '' : `<footer class="ib-guides-footer"><a class="ib-guides-all" href="${escapeHtml(allHref)}" data-guides-all-link data-native-route>${escapeHtml(allLinkLabel)}</a></footer>`}
    </div>`;
}

export function renderCategoryGuidesShell({
  mountId = 'guides-hub',
  title = 'Güncel rehberler',
  lead = 'Araba, konut, tatil, finansman ve sigorta — kararınızı etkileyen güncel bağlam.',
  showTabs = true,
  defaultCategory = 'auto',
  allHref = '/blog',
  layout = 'hero',
  allLinkLabel = 'Tüm rehberler'
} = {}) {
  const layoutClass =
    layout === 'digest' ? ' ib-guides-hub--digest' : layout === 'strip' ? ' ib-guides-hub--strip' : '';

  return `
    <section
      id="${escapeHtml(mountId)}"
      class="ib-guides-hub ib-section-venture${layoutClass}"
      aria-labelledby="${escapeHtml(mountId)}-title"
      data-guides-default-category="${escapeHtml(defaultCategory)}"
      data-guides-show-tabs="${showTabs ? '1' : '0'}"
      data-guides-layout="${escapeHtml(layout)}"
    >
      <div class="container">
        ${renderCategoryGuidesInner({ mountId, title, lead, showTabs, defaultCategory, allHref, layout, allLinkLabel })}
      </div>
    </section>`;
}

export async function hydrateCategoryGuides(root = document, options = {}) {
  const mountId = options.mountId || 'guides-hub';
  const section = root.getElementById(mountId);
  if (!section) return;

  const body = section.querySelector('[data-guides-body]');
  if (!body) return;

  const showTabs = section.dataset.guidesShowTabs !== '0';
  const defaultCategory = options.category || section.dataset.guidesDefaultCategory || 'auto';
  let activeCategory = defaultCategory;

  const allLink = section.querySelector('[data-guides-all-link]');

  const setAllLink = (categoryId) => {
    if (!allLink) return;
    allLink.href = `/blog?kategori=${encodeURIComponent(categoryId)}`;
  };

  const renderCategory = async (categoryId) => {
    activeCategory = categoryId;
    body.innerHTML = '<p class="text-muted-sm">Yükleniyor…</p>';
    setAllLink(categoryId);

    section.querySelectorAll('[data-guides-tab]').forEach((btn) => {
      const on = btn.dataset.guidesTab === categoryId;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const layout = section.dataset.guidesLayout || 'hero';
    const limit = layout === 'strip' ? 3 : layout === 'digest' ? 4 : 6;
    const posts = (await fetchPublishedPostsByCategory(categoryId, limit)).map(normalizeGuidePost);
    body.innerHTML = renderGuidesPanel(posts, categoryId, layout);
    window.lucide?.createIcons?.();
  };

  if (showTabs) {
    section.querySelectorAll('[data-guides-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        renderCategory(btn.dataset.guidesTab || 'auto');
      });
    });
  }

  await renderCategory(defaultCategory);
  return activeCategory;
}

export function blogCategoryFromQuery(search = '') {
  const params = new URLSearchParams(search);
  const raw = String(params.get('kategori') || params.get('category') || '').trim().toLowerCase();
  return getGuideCategory(raw)?.id || '';
}
