/**
 * SSR/crawler-safe route surface — keeps only the active section visible in HTML.
 * Synced with the inline bootstrap in index.html (keep maps aligned).
 */

export const MARKETING_SURFACE_IDS = Object.freeze([
    'home',
    'trust',
    'how-it-works',
    'pricing',
    'categories'
]);

const PREMIUM_PATHS = Object.freeze({
    '/karar-analizi': 'page-karar-analizi',
    '/metodoloji': 'page-metodoloji',
    '/planlar': 'page-planlar',
    '/karar-asistani': 'page-karar-analizi'
});

const APP_PATHS = Object.freeze({
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
    '/admin': '/admin-panel.html',
    '/partner': '/partner-olun.html'
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
        const hashId = typeof window !== 'undefined' ? window.location.hash?.slice(1) : '';
        if (hashId && MARKETING_SURFACE_IDS.includes(hashId)) {
            return 'home';
        }
        return 'home';
    }

    return 'home';
}

export function syncHtmlRouteSurface(surfaceId) {
    const root = document.documentElement;
    if (!root?.setAttribute) {
        return;
    }
    root.setAttribute('data-ib-route', surfaceId || 'home');
    root.classList?.remove?.('ib-route-pending');

    if (surfaceId === 'home') {
        document.body.classList.remove('app-route-active', 'ib-premium-route-active');
    } else if (String(surfaceId).startsWith('page-')) {
        document.body.classList.add('app-route-active', 'ib-premium-route-active');
    } else {
        document.body.classList.add('app-route-active');
        document.body.classList.remove('ib-premium-route-active');
    }
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
