/**
 * Clarifies decision-platform surfaces (ilanlar / compare) vs classic classifieds.
 */

const SURFACE_COPY = Object.freeze({
  ilanlar: {
    kicker: 'Karar destekli keşif',
    title: 'Skorlu seçenekler — klasik ilan listesi değil',
    body: 'Bu alan, TCO ve uyum skoruna göre sıralanmış referans seçenekleri gösterir. Canlı envanter yoğunluğu bölgeye göre değişebilir; ana karar akışı Auto analizidir.',
    primary: { href: '/karar-asistani/', label: 'Kararını analiz et' },
    secondary: { href: '/metodoloji/', label: 'Metodoloji', native: false }
  },
  compare: {
    kicker: 'Karşılaştırma merkezi',
    title: 'Seçenekleri yan yana — Auto veya ilan kartlarından ekleyin',
    body: 'Karşılaştırma listesi hesabınızda ve bu oturumda saklanır. Henüz seçenek yoksa önce Auto sonucundan veya bir seçenek kartından ekleyin.',
    primary: { href: '/karar-asistani/', label: 'Kararını analiz et' },
    secondary: { href: '/secenekler/', label: 'Seçeneklere git', native: false }
  }
});

function renderBanner(surface) {
  const copy = SURFACE_COPY[surface];
  if (!copy) return '';

  const secondaryAttrs = copy.secondary.native ? ' data-native-route' : '';
  return `
    <aside class="ib-decision-surface-banner" data-decision-surface="${surface}" role="note">
      <div>
        <p class="kicker">${copy.kicker}</p>
        <h3>${copy.title}</h3>
        <p>${copy.body}</p>
      </div>
      <div class="ib-decision-surface-banner-actions">
        <a href="${copy.primary.href}" class="btn btn-primary btn-sm">${copy.primary.label}</a>
        <a href="${copy.secondary.href}" class="btn btn-outline btn-sm"${secondaryAttrs}>${copy.secondary.label}</a>
      </div>
    </aside>`;
}

function mountBanner(surface) {
  const section = document.getElementById(surface === 'ilanlar' ? 'ilanlar' : 'compare');
  if (!section || section.querySelector('[data-decision-surface]')) return;

  const container = section.querySelector('.container');
  if (!container) return;

  const banner = document.createElement('div');
  banner.innerHTML = renderBanner(surface);
  const node = banner.firstElementChild;
  if (!node) return;

  const header = container.querySelector('.section-header');
  if (header?.nextSibling) {
    header.insertAdjacentElement('afterend', node);
  } else {
    container.prepend(node);
  }
}

export function initDecisionSurfaceBanners() {
  document.addEventListener('routeChanged', (event) => {
    const route = event.detail?.route;
    if (route === 'ilanlar') mountBanner('ilanlar');
    if (route === 'compare') mountBanner('compare');
  });

  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/secenekler' || path === '/ilanlar' || path === '/decision-options') {
    mountBanner('ilanlar');
  }
  if (path === '/karsilastir' || path === '/compare') mountBanner('compare');
}
