import {
  hydrateCategoryGuides,
  renderCategoryGuidesInner,
  renderCategoryGuidesShell
} from '../features/content/category-guides-ui.js';

const HOME_STRIP_OPTS = {
  mountId: 'home-guides-strip',
  title: 'Güncel haberler',
  lead: '',
  showTabs: true,
  defaultCategory: 'auto',
  layout: 'strip',
  allLinkLabel: 'Tümü',
  allHref: '/blog'
};

function mountHomeGuidesStrip() {
  const section = document.getElementById('home-guides-strip');
  if (!section || section.dataset.guidesMounted === '1') return;

  const inner = section.querySelector('[data-guides-inner]');
  if (!inner) return;

  section.dataset.guidesMounted = '1';
  inner.innerHTML = renderCategoryGuidesInner(HOME_STRIP_OPTS);
  return hydrateCategoryGuides(document, { mountId: 'home-guides-strip' });
}

function mountAutoGuidesHub() {
  const mount = document.getElementById('auto-guides-hub-mount');
  if (!mount || mount.dataset.guidesMounted === '1') return;
  mount.dataset.guidesMounted = '1';
  mount.innerHTML = renderCategoryGuidesShell({
    mountId: 'auto-guides-hub',
    title: 'Auto rehberleri',
    lead: '',
    showTabs: false,
    defaultCategory: 'auto',
    allHref: '/blog/?category=auto'
  });
  mount.classList.add('ib-guides-hub--compact');
  return hydrateCategoryGuides(document, { mountId: 'auto-guides-hub', category: 'auto' });
}

export function initCategoryGuidesHub() {
  const run = () => {
    if (document.getElementById('home-guides-strip')) {
      mountHomeGuidesStrip().catch(() => {});
    }
    if (document.getElementById('auto-guides-hub-mount')) {
      mountAutoGuidesHub().catch(() => {});
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}
