import { hydrateCategoryGuides, renderCategoryGuidesShell } from '../features/content/category-guides-ui.js';

function mountHomeGuidesHub() {
  const mount = document.getElementById('home-guides-hub-mount');
  if (!mount || mount.dataset.guidesMounted === '1') return;
  mount.dataset.guidesMounted = '1';
  mount.innerHTML = renderCategoryGuidesShell({
    mountId: 'home-guides-hub',
    title: 'Güncel rehberler',
    lead: 'Kararınızı etkileyen güncel bağlam — haber değil, karar rehberi.',
    showTabs: true,
    defaultCategory: 'auto'
  });
  return hydrateCategoryGuides(document, { mountId: 'home-guides-hub' });
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
    allHref: '/blog?kategori=auto'
  });
  mount.classList.add('ib-guides-hub--compact');
  return hydrateCategoryGuides(document, { mountId: 'auto-guides-hub', category: 'auto' });
}

export function initCategoryGuidesHub() {
  const run = () => {
    if (document.getElementById('home-guides-hub-mount')) {
      mountHomeGuidesHub().catch(() => {});
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
