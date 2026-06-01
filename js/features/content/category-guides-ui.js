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

function renderGuidesPanel(posts, categoryId) {
  const cat = getGuideCategory(categoryId);
  if (!posts.length) return renderEmptyState(categoryId);

  const featured = posts.find((p) => p.is_featured) || posts[0];
  const rest = posts.filter((p) => p.slug !== featured.slug).slice(0, 2);

  return `
    <div class="ib-guides-panel" data-guides-panel="${escapeHtml(categoryId)}">
      ${renderFeaturedCard(featured, cat?.ctaHref || '/auto/', cat?.ctaLabel || 'Analiz başlat')}
      <div class="ib-guides-compact-list">
        ${rest.map(renderCompactItem).join('') || renderCompactItem(featured)}
      </div>
    </div>`;
}

export function renderCategoryGuidesShell({
  mountId = 'guides-hub',
  title = 'Güncel rehberler',
  lead = 'Araba, konut, tatil, finansman ve sigorta — kararınızı etkileyen güncel bağlam.',
  showTabs = true,
  defaultCategory = 'auto',
  allHref = '/blog'
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

  return `
    <section
      id="${escapeHtml(mountId)}"
      class="ib-guides-hub ib-section-venture section-surface"
      aria-labelledby="${escapeHtml(mountId)}-title"
      data-guides-default-category="${escapeHtml(defaultCategory)}"
      data-guides-show-tabs="${showTabs ? '1' : '0'}"
    >
      <div class="container">
        <div class="ib-guides-card">
          <header class="ib-guides-header">
            <h2 id="${escapeHtml(mountId)}-title">${escapeHtml(title)}</h2>
            ${lead ? `<p class="ib-guides-lead">${escapeHtml(lead)}</p>` : ''}
          </header>
          ${tabs}
          <div class="ib-guides-body" data-guides-body aria-live="polite">Yükleniyor…</div>
          <footer class="ib-guides-footer">
            <a class="ib-guides-all" href="${escapeHtml(allHref)}" data-guides-all-link data-native-route>Tüm rehberler</a>
          </footer>
        </div>
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

    const posts = (await fetchPublishedPostsByCategory(categoryId, 6)).map(normalizeGuidePost);
    body.innerHTML = renderGuidesPanel(posts, categoryId);
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
