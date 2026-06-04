import {
  blogPostPath,
  excerptText,
  fetchActiveAnnouncements,
  fetchPostBySlug,
  fetchPublicCampaigns,
  fetchPublishedPosts,
  formatContentDate,
  getGuideCategory,
  GUIDE_CATEGORIES,
  renderContentEmpty
} from './public-content.js';
import { escapeHtml } from '../../core/security.js';

function renderListCard({ kicker, title, excerpt, meta, href, cta = 'Oku' }) {
  return `
    <article class="ib-content-card">
      ${kicker ? `<span class="ib-content-card-kicker">${escapeHtml(kicker)}</span>` : ''}
      <h3><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></h3>
      ${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ''}
      ${meta ? `<p class="ib-content-card-meta text-muted-sm">${escapeHtml(meta)}</p>` : ''}
      <a class="ib-content-card-link" href="${escapeHtml(href)}">${escapeHtml(cta)} →</a>
    </article>`;
}

export function renderHomeContentHubShell() {
  return `
    <section id="home-content-hub" class="ib-content-hub ib-section-venture section-surface" aria-labelledby="home-content-hub-title">
      <div class="container">
        <header class="section-header ib-section-intro">
          <span class="section-kicker">Güncel</span>
          <h2 id="home-content-hub-title">Duyurular, kampanyalar ve blog</h2>
          <p>Platform güncellemeleri, aktif teklifler ve karar rehberi yazıları — tek merkezden.</p>
        </header>
        <div class="ib-content-hub-nav" role="navigation" aria-label="İçerik merkezi">
          <a class="ib-content-hub-nav-card" href="/duyurular" data-native-route>
            <i data-lucide="megaphone" aria-hidden="true"></i>
            <strong>Duyurular</strong>
            <span>Ürün ve operasyon güncellemeleri</span>
          </a>
          <a class="ib-content-hub-nav-card" href="/kampanyalar" data-native-route>
            <i data-lucide="badge-percent" aria-hidden="true"></i>
            <strong>Kampanyalar</strong>
            <span>Pro deneme ve pilot fırsatlar</span>
          </a>
          <a class="ib-content-hub-nav-card" href="/blog" data-native-route>
            <i data-lucide="newspaper" aria-hidden="true"></i>
            <strong>Blog</strong>
            <span>TCO, finansman ve karar rehberleri</span>
          </a>
        </div>
        <div class="ib-content-hub-preview-grid" data-content-hub-preview>
          <div class="ib-content-hub-preview-col" data-preview="announcements">
            <h3 class="ib-content-hub-preview-title">Son duyurular</h3>
            <div class="ib-content-hub-preview-list" data-preview-list="announcements">Yükleniyor…</div>
            <a class="btn btn-outline btn-sm" href="/duyurular" data-native-route>Tüm duyurular</a>
          </div>
          <div class="ib-content-hub-preview-col" data-preview="campaigns">
            <h3 class="ib-content-hub-preview-title">Aktif kampanyalar</h3>
            <div class="ib-content-hub-preview-list" data-preview-list="campaigns">Yükleniyor…</div>
            <a class="btn btn-outline btn-sm" href="/kampanyalar" data-native-route>Tüm kampanyalar</a>
          </div>
          <div class="ib-content-hub-preview-col" data-preview="blog">
            <h3 class="ib-content-hub-preview-title">Blogdan</h3>
            <div class="ib-content-hub-preview-list" data-preview-list="blog">Yükleniyor…</div>
            <a class="btn btn-outline btn-sm" href="/blog" data-native-route>Tüm yazılar</a>
          </div>
        </div>
      </div>
    </section>`;
}

function mountPreviewList(root, selector, html) {
  const el = root?.querySelector(`[data-preview-list="${selector}"]`);
  if (el) el.innerHTML = html;
}

export async function hydrateHomeContentHubPreview(root = document) {
  const section = root.getElementById('home-content-hub');
  if (!section) return;

  const [announcements, campaigns, posts] = await Promise.all([
    fetchActiveAnnouncements(3),
    fetchPublicCampaigns(),
    fetchPublishedPosts(3)
  ]);

  mountPreviewList(
    section,
    'announcements',
    announcements.length
      ? announcements
          .map((item) =>
            renderListCard({
              kicker: 'Duyuru',
              title: item.title,
              excerpt: excerptText(item.body, 100),
              meta: formatContentDate(item.created_at),
              href: '/duyurular',
              cta: 'Detay'
            })
          )
          .join('')
      : renderContentEmpty('Henüz duyuru yok. Karar rehberleri /rehber/ adresinde.')
  );

  mountPreviewList(
    section,
    'campaigns',
    campaigns
          .slice(0, 3)
          .map((item) =>
            renderListCard({
              kicker: item.badge || 'Kampanya',
              title: item.title,
              excerpt: excerptText(item.summary, 100),
              href: item.cta_href || '/kampanyalar',
              cta: item.cta_label || 'İncele'
            })
          )
          .join('') || renderContentEmpty('Şu anda gösterilecek kayıt bulunamadı.')
  );

  mountPreviewList(
    section,
    'blog',
    posts.length
      ? posts
          .map((post) =>
            renderListCard({
              kicker: 'Blog',
              title: post.title,
              excerpt: excerptText(post.body, 100),
              meta: formatContentDate(post.created_at),
              href: blogPostPath(post.slug),
              cta: 'Oku'
            })
          )
          .join('')
      : renderContentEmpty('Blog yazıları yükleniyor. SEO rehberleri: /rehber/')
  );

  window.lucide?.createIcons?.();
}

export async function renderAnnouncementsPage(root = document) {
  const list = root.querySelector('#page-duyurular [data-content-list="announcements"]');
  if (!list) return;
  list.innerHTML = '<p class="text-muted-sm">Yükleniyor…</p>';
  const items = await fetchActiveAnnouncements(40);
  list.innerHTML = items.length
    ? `<div class="ib-content-list-grid">${items
        .map(
          (item) => `
        <article class="ib-content-detail-card">
          <span class="ib-content-card-kicker">Duyuru · ${escapeHtml(formatContentDate(item.created_at))}</span>
          <h2>${escapeHtml(item.title)}</h2>
          <div class="ib-content-prose">${escapeHtml(item.body).replace(/\n/g, '<br>')}</div>
        </article>`
        )
        .join('')}</div>`
    : renderContentEmpty('Şu anda gösterilecek kayıt bulunamadı.');
  window.lucide?.createIcons?.();
}

export async function renderCampaignsPage(root = document) {
  const list = root.querySelector('#page-kampanyalar [data-content-list="campaigns"]');
  if (!list) return;
  list.innerHTML = '<p class="text-muted-sm">Yükleniyor…</p>';
  const items = await fetchPublicCampaigns();
  list.innerHTML = items.length
    ? `<div class="ib-content-list-grid">${items
        .map(
          (item) => `
        <article class="ib-content-detail-card ib-content-detail-card--campaign">
          <span class="ib-content-card-kicker">${escapeHtml(item.badge || 'Kampanya')}</span>
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.summary)}</p>
          ${item.ends_at ? `<p class="ib-content-card-meta text-muted-sm">Geçerlilik: ${escapeHtml(formatContentDate(item.ends_at))}</p>` : ''}
          <a class="btn btn-primary" href="${escapeHtml(item.cta_href || '/auto/')}">${escapeHtml(item.cta_label || 'Detay')}</a>
        </article>`
        )
        .join('')}</div>`
    : renderContentEmpty('Şu anda gösterilecek kayıt bulunamadı.');
  window.lucide?.createIcons?.();
}

export async function renderBlogPage(root = document, categoryFilter = '') {
  const list = root.querySelector('#page-blog [data-content-list="blog"]');
  const filterBar = root.querySelector('#page-blog [data-blog-category-filter]');
  if (!list) return;

  const activeCategory = getGuideCategory(categoryFilter)?.id || '';

  if (filterBar) {
    filterBar.innerHTML = `
      <div class="ib-guides-tabs ib-blog-filter-tabs" role="tablist" aria-label="Blog kategorileri">
        <a class="ib-guides-tab${activeCategory ? '' : ' is-active'}" href="/blog" data-native-route>Tümü</a>
        ${GUIDE_CATEGORIES.map(
          (cat) => `
          <a
            class="ib-guides-tab${activeCategory === cat.id ? ' is-active' : ''}"
            href="/blog?kategori=${encodeURIComponent(cat.id)}"
            data-native-route
          >${escapeHtml(cat.label)}</a>`
        ).join('')}
      </div>`;
  }

  list.innerHTML = '<p class="text-muted-sm">Yükleniyor…</p>';
  const posts = await fetchPublishedPosts(40, activeCategory);
  list.innerHTML = posts.length
    ? `<div class="ib-content-list-grid">${posts
        .map((post) =>
          renderListCard({
            kicker: getGuideCategory(post.category)?.label || 'Blog',
            title: post.title,
            excerpt: post.excerpt || excerptText(post.body, 180),
            meta: formatContentDate(post.created_at),
            href: blogPostPath(post.slug),
            cta: 'Yazıyı oku'
          })
        )
        .join('')}</div>`
    : renderContentEmpty(
        activeCategory
          ? `${getGuideCategory(activeCategory)?.label || 'Bu kategori'} için henüz yayınlanmış rehber yok. Statik rehberler: /rehber/`
          : 'Henüz blog yazısı yok. Karar rehberleri /rehber/ adresinde ücretsiz okunabilir.'
      );
  window.lucide?.createIcons?.();
}

export async function renderBlogPostPage(root = document, slug) {
  const mount = root.querySelector('#page-blog-post [data-blog-post-root]');
  if (!mount) return;
  mount.innerHTML = '<p class="text-muted-sm">Yükleniyor…</p>';
  const post = await fetchPostBySlug(slug);
  if (!post) {
    mount.innerHTML = `
      ${renderContentEmpty('Bu yazı bulunamadı veya yayından kaldırıldı.')}
      <p class="ib-prerender-actions"><a class="btn btn-primary" href="/blog" data-native-route>Blog listesine dön</a></p>`;
    return;
  }

  document.title = `${post.title} | isteBul Blog`;

  const prose = String(post.body || post.excerpt || '').trim();
  const proseHtml = prose
    ? `<div class="ib-content-prose">${escapeHtml(prose).replace(/\n/g, '<br>')}</div>`
    : renderContentEmpty('Bu yazının metni henüz eklenmemiş. Kısa süre içinde güncellenecektir.');

  mount.innerHTML = `
    <article class="ib-content-article">
      <p class="kicker">${escapeHtml(getGuideCategory(post.category)?.label || 'Blog')} · ${escapeHtml(formatContentDate(post.created_at))}</p>
      <h1>${escapeHtml(post.title)}</h1>
      ${post.cover_image_url ? `<p class="ib-content-cover"><img src="${escapeHtml(post.cover_image_url)}" alt="" loading="lazy" decoding="async"></p>` : ''}
      ${post.source_label ? `<p class="ib-content-card-meta text-muted-sm">Kaynak: ${post.source_url ? `<a href="${escapeHtml(post.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.source_label)}</a>` : escapeHtml(post.source_label)}</p>` : ''}
      ${proseHtml}
      <p class="ib-prerender-actions">
        <a class="btn btn-outline" href="/blog" data-native-route>← Tüm yazılar</a>
        <a class="btn btn-primary" href="${escapeHtml(getGuideCategory(post.category)?.ctaHref || '/auto/')}" data-analytics-cta="cta_primary_auto" data-analytics-placement="blog_post">${escapeHtml(getGuideCategory(post.category)?.ctaLabel || 'Ücretsiz analiz başlat')}</a>
      </p>
    </article>`;
  window.lucide?.createIcons?.();
}

export function renderPremiumPageShell({ id, kicker, title, lead, listAttr }) {
  return `
    <div class="container ib-content-page">
      <header class="ib-content-page-header">
        <p class="section-kicker">${escapeHtml(kicker)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="ib-premium-lead">${escapeHtml(lead)}</p>
      </header>
      <div data-content-list="${escapeHtml(listAttr)}"><p class="text-muted-sm">Yükleniyor…</p></div>
      <p class="ib-content-page-back">
        <a href="/" data-native-route>← Ana sayfa</a>
        · <a href="/auto/">Ücretsiz analiz başlat</a>
      </p>
    </div>`;
}
