/**
 * SSR/crawler-safe route surface — keeps only the active section visible in HTML.
 * Document meta: data/route-document-meta.json (also used by scripts/lib/route-bootstrap.cjs).
 */

import routeMeta from '../../data/route-document-meta.json' with { type: 'json' };

export const SITE_ORIGIN = routeMeta.siteOrigin;
export const ROUTE_DOCUMENT_META = Object.freeze(routeMeta.surfaces);

export const MARKETING_SURFACE_IDS = Object.freeze([
    'home',
    'home-economic-indicators',
    'how-it-works',
    'home-vertical-focus',
    'home-features-strip',
    'pricing',
    'partner-enterprise',
    'landing-faq'
]);

const PREMIUM_PATHS = Object.freeze({
    '/karar-analizi': 'page-karar-analizi',
    '/planlar': 'page-planlar',
    '/karar-asistani': 'page-karar-analizi',
    '/duyurular': 'page-duyurular',
    '/kampanyalar': 'page-kampanyalar',
    '/blog': 'page-blog'
});

export function blogSlugFromPath(pathname = '/') {
    const path = stripPathname(pathname);
    if (!path.startsWith('/blog/')) return '';
    return decodeURIComponent(path.slice('/blog/'.length)).replace(/\/$/, '');
}

export function resolveContentRouteSurface(pathname = '/') {
    const path = stripPathname(pathname);
    if (path === '/duyurular') return 'page-duyurular';
    if (path === '/kampanyalar') return 'page-kampanyalar';
    if (path === '/blog') return 'page-blog';
    if (path.startsWith('/blog/') && path.length > '/blog/'.length) return 'page-blog-post';
    return null;
}

const APP_PATHS = Object.freeze({
    '/secenekler': 'ilanlar',
    '/ilanlar': 'ilanlar',
    '/karsilastir': 'compare',
    '/favoriler': 'favoriler',
    '/gecmis': 'history',
    '/quiz': 'quiz',
    '/profil': 'profil',
    '/hesap': 'profil',
    '/messages': 'messages',
    '/ilan-ekle': 'add-listing',
    '/giris': 'home',
    '/kayit': 'home'
});

const MARKETING_ALIASES = Object.freeze({
    '/metodoloji-ozet': 'home',
    '/planlar-ozet': 'home'
});

const EXTERNAL_REDIRECTS = Object.freeze({
    '/admin': '/admin/',
  '/araba': '/auto/',
  '/finansman': '/finans/',
    '/partner': '/partner-olun.html',
    '/partner-planlar': '/partner-planlar.html',
    '/partner-hub': '/partner-basvuru.html',
    '/partner-basvuru': '/partner-basvuru.html',
    '/partner-api': '/partner-docs.html',
    '/partner-guven': '/partner-guven.html',
    '/partner-trust': '/partner-guven.html'
});

export function stripPathname(pathname = '/') {
    const raw = pathname === '/index.html' ? '/' : pathname;
    const localeMatch = raw.match(/^\/(en|de)(\/|$)/);
    const stripped = localeMatch ? raw.slice(localeMatch[1].length + 1) || '/' : raw;
    return stripped.replace(/\/$/, '') || '/';
}

export function getExternalRedirect(path) {
    return EXTERNAL_REDIRECTS[path] || null;
}

/**
 * @returns {string} Value for html[data-ib-route] — "home" or a section id
 */
export function resolveRouteSurface(pathname = '/') {
    const path = stripPathname(pathname);

    const contentSurface = resolveContentRouteSurface(pathname);
    if (contentSurface) {
        return contentSurface;
    }

    if (PREMIUM_PATHS[path]) {
        return PREMIUM_PATHS[path];
    }

    if (MARKETING_ALIASES[path]) {
        return MARKETING_ALIASES[path];
    }

    if (APP_PATHS[path]) {
        return APP_PATHS[path];
    }

    if (path.startsWith('/ilan/')) {
        return 'listing-detail';
    }

    if (path === '/') {
        return 'home';
    }

    return 'home';
}

function setMetaContent(id, attribute, value) {
    const el = document.getElementById(id);
    if (el && value) {
        el.setAttribute(attribute, value);
    }
}

/**
 * Update title, description, canonical and Open Graph tags for the active route.
 */
export function syncRouteDocumentMeta(surfaceId, pathname = '/') {
    if (typeof document === 'undefined') {
        return;
    }

    const meta = ROUTE_DOCUMENT_META[surfaceId] || ROUTE_DOCUMENT_META.home;
    const path = meta.path || '/';
    const canonicalUrl = `${SITE_ORIGIN}${path === '/' ? '/' : path}`;

    document.title = meta.title;
    setMetaContent('meta-description', 'content', meta.description);
    setMetaContent('meta-canonical', 'href', canonicalUrl);
    setMetaContent('meta-og-title', 'content', meta.title);
    setMetaContent('meta-og-description', 'content', meta.description);
    setMetaContent('meta-og-url', 'content', canonicalUrl);
    setMetaContent('meta-twitter-title', 'content', meta.title);
    setMetaContent('meta-twitter-description', 'content', meta.description);
}

export function syncHtmlRouteSurface(surfaceId, pathname = '/') {
    const root = document.documentElement;
    if (!root?.setAttribute) {
        return;
    }

    const normalized = surfaceId || 'home';
    root.setAttribute('data-ib-route', normalized);
    root.classList?.remove?.('ib-route-pending');

    const appSurfaces = new Set([
        'ilanlar',
        'listing-detail',
        'compare',
        'favoriler',
        'history',
        'quiz',
        'profil',
        'messages',
        'add-listing'
    ]);

    if (normalized === 'home') {
        document.body.classList.remove('app-route-active', 'ib-premium-route-active');
        document.body.classList.add('marketing-shell');
        document.body.classList.remove('app-shell');
    } else if (String(normalized).startsWith('page-')) {
        document.body.classList.add('app-route-active', 'ib-premium-route-active', 'marketing-shell');
        document.body.classList.remove('app-shell');
    } else if (appSurfaces.has(normalized)) {
        document.body.classList.add('app-route-active', 'app-shell');
        document.body.classList.remove('marketing-shell', 'ib-premium-route-active');
    } else {
        document.body.classList.add('app-route-active');
        document.body.classList.remove('ib-premium-route-active', 'marketing-shell', 'app-shell');
    }

    syncRouteDocumentMeta(normalized, pathname);
}

export function tryExternalRouteRedirect(pathname = '/') {
    const path = stripPathname(pathname);
    const target = getExternalRedirect(path);
    if (target && typeof window !== 'undefined') {
        window.location.replace(target);
        return true;
    }
    return false;
}
