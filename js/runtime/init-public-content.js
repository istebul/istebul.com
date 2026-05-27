import {
  hydrateHomeContentHubPreview,
  renderAnnouncementsPage,
  renderBlogPage,
  renderBlogPostPage,
  renderCampaignsPage
} from '../features/content/content-hub-ui.js';
import { blogSlugFromPath, resolveContentRouteSurface } from './route-surface.js';

export async function refreshPublicContentSurface(surfaceId) {
  if (surfaceId === 'home') {
    await hydrateHomeContentHubPreview();
    return;
  }

  if (surfaceId === 'page-duyurular') {
    await renderAnnouncementsPage(document);
    return;
  }

  if (surfaceId === 'page-kampanyalar') {
    await renderCampaignsPage(document);
    return;
  }

  if (surfaceId === 'page-blog') {
    await renderBlogPage(document);
    return;
  }

  if (surfaceId === 'page-blog-post') {
    await renderBlogPostPage(document, blogSlugFromPath(window.location.pathname));
  }
}

export function initPublicContentHub() {
  const run = () => {
    const surface =
      resolveContentRouteSurface(window.location.pathname) ||
      document.documentElement.getAttribute('data-ib-route');
    if (surface) refreshPublicContentSurface(surface);
  };

  document.addEventListener('DOMContentLoaded', () => {
    run();
  });

  window.addEventListener('popstate', run);
  window.addEventListener('app:ready', run);

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-native-route], a[href^="/duyurular"], a[href^="/kampanyalar"], a[href^="/blog"]');
    if (!link) return;
    window.setTimeout(run, 0);
  });
}
