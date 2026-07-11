// Router - Simple client-side routing
import {
    stripLocalePrefix,
    setActiveLocale,
    applyDocumentLocale,
    buildLocalizedPath,
    getActiveLocale
} from '../platform/locale-registry.js';
import {
    blogSlugFromPath,
    resolveRouteSurface,
    stripPathname,
    syncHtmlRouteSurface,
    syncRouteDocumentMeta,
    tryExternalRouteRedirect
} from '../runtime/route-surface.js';
import { pulseRouteSection } from '../runtime/perceived-performance.js';
import { isFullPageNavigation, resolveFullPageNavigation } from '../runtime/full-page-navigation.js';

/** Marketing sections on index.html (long-scroll landing). */
export const HOMEPAGE_SECTION_IDS = Object.freeze([
    'home',
    'home-economic-indicators',
    'how-it-works',
    'home-vertical-focus',
    'home-features-strip',
    'home-garsonai',
    'pricing',
    'partner-enterprise',
    'landing-faq',
    'home-guides-strip'
]);

/** Hash targets on the marketing page. */
export const MARKETING_HASH_IDS = Object.freeze([
    'home',
    'home-economic-indicators',
    'home-vertical-focus',
    'home-features-strip',
    'home-garsonai',
    'how-it-works',
    'pricing',
    'partner-enterprise',
    'landing-faq',
    'home-guides-strip'
]);

/** Legacy hash shortcuts on homepage (long-scroll). */
const MARKETING_PATH_ALIASES = Object.freeze({
    '/metodoloji-ozet': 'how-it-works',
    '/planlar-ozet': 'pricing'
});

/** Clears inline display overrides (e.g. showHomeSections uses !important). */
function clearSectionDisplayOverride(section) {
    section?.style?.removeProperty?.('display');
}

/** Premium full-page routes (dedicated sections). */
export const PREMIUM_PAGE_ROUTES = Object.freeze({
    '/karar-analizi': 'page-karar-analizi',
    '/metodoloji': 'page-metodoloji',
    '/planlar': 'page-planlar',
    '/duyurular': 'page-duyurular',
    '/kampanyalar': 'page-kampanyalar',
    '/blog': 'page-blog'
});

export class Router {
    constructor() {
        this.routes = [
            { path: '/', component: 'home' },
            { path: '/secenekler', component: 'ilanlar' },
            { path: '/ilanlar', component: 'ilanlar' },
            { path: '/decision-options', component: 'ilanlar' },
            { path: '/karsilastir', component: 'compare' },
            { path: '/karar-analizi', component: 'page-karar-analizi' },
            { path: '/planlar', component: 'page-planlar' },
            { path: '/duyurular', component: 'page-duyurular' },
            { path: '/kampanyalar', component: 'page-kampanyalar' },
            { path: '/blog', component: 'page-blog' },
            { path: '/karar-asistani', component: 'page-karar-analizi' },
            { path: '/favoriler', component: 'favoriler' },
            { path: '/gecmis', component: 'history' },
            { path: '/quiz', component: 'quiz' },
            { path: '/profil', component: 'profil' },
            { path: '/hesap', component: 'profil' },
            { path: '/giris', component: 'auth-login' },
            { path: '/kayit', component: 'auth-register' },
            { path: '/messages', component: 'messages' },
            { path: '/ilan-ekle', component: 'add-listing' },
            { path: '/ilan/:id', component: 'listing-detail' }
        ];
        this.currentRoute = '/';
        this._pendingScrollId = null;
    }

    init() {
        this.handleRoute();
        window.addEventListener('popstate', () => this.handleRoute());
        window.addEventListener('hashchange', () => this.handleRoute());

        document.addEventListener('click', (e) => {
            const hashLink = e.target.closest('a[href^="#"]');
            if (hashLink) {
                const targetId = hashLink.getAttribute('href').slice(1);
                if (!targetId || !document.getElementById(targetId)) return;
                e.preventDefault();
                this.goToMarketingHash(targetId);
                return;
            }

            const link = e.target.closest('a[href^="/"]');
            if (!link) return;
            if (link.hasAttribute('data-full-page')) return;

            const rawHref = link.getAttribute('href') || '/';
            if (link.hasAttribute('data-native-route')) {
                try {
                    const path = stripPathname(new URL(rawHref, window.location.origin).pathname);
                    const search = new URL(rawHref, window.location.origin).search || '';
                    if (
                        path === '/blog' ||
                        path === '/duyurular' ||
                        path === '/kampanyalar' ||
                        blogSlugFromPath(path)
                    ) {
                        e.preventDefault();
                        this.navigate(`${path}${search}`);
                        return;
                    }
                } catch {
                    /* full navigation for other native routes */
                }
                return;
            }
            if (rawHref.startsWith('/#')) {
                e.preventDefault();
                const targetId = rawHref.slice(2).split('?')[0];
                if (targetId && document.getElementById(targetId)) {
                    this.goToMarketingHash(targetId);
                }
                return;
            }

            if (isFullPageNavigation(rawHref)) {
                const target = resolveFullPageNavigation(rawHref);
                if (target) {
                    const dest = new URL(target, window.location.origin);
                    const source = new URL(rawHref, window.location.origin);
                    dest.search = source.search;
                    dest.hash = source.hash;
                    if (
                        dest.pathname !== window.location.pathname ||
                        dest.search !== window.location.search ||
                        dest.hash !== window.location.hash
                    ) {
                        window.location.assign(dest.href);
                    }
                    e.preventDefault();
                }
                return;
            }

            e.preventDefault();
            this.navigate(rawHref);
        });
    }

    /**
     * Show full marketing landing sections (fixes blank body after SPA routes).
     */
    showHomeSections() {
        document.body.classList.remove('app-route-active', 'ib-premium-mounted');

        document.querySelectorAll('[data-private-section]').forEach((section) => {
            section.classList.remove('route-visible');
            section.style.setProperty('display', 'none', 'important');
            section.setAttribute('hidden', '');
            section.setAttribute('aria-hidden', 'true');
            section.classList.add('hidden');
        });

        document.querySelectorAll('section[id]').forEach((section) => {
            const isMarketing = HOMEPAGE_SECTION_IDS.includes(section.id);
            if (isMarketing && !section.hasAttribute('data-landing-excluded')) {
                section.classList.remove('hidden');
                section.removeAttribute('hidden');
                section.removeAttribute('aria-hidden');
                section.style.setProperty('display', 'block', 'important');
                return;
            }

            section.style.display = 'none';
            section.setAttribute('hidden', '');
            section.setAttribute('aria-hidden', 'true');
            if (section.hasAttribute('data-private-section')) {
                section.classList.add('hidden');
            }
        });
    }

    goToMarketingHash(targetId) {
        const { pathname: stripped } = stripLocalePrefix(
            window.location.pathname === '/index.html' ? '/' : window.location.pathname
        );
        const path = stripped.replace(/\/$/, '') || '/';

        if (path !== '/') {
            window.history.pushState(null, '', `/#${targetId}`);
            this.currentRoute = '/';
        } else {
            const hash = window.location.hash?.slice(1);
            if (hash !== targetId) {
                window.history.pushState(null, '', `/#${targetId}`);
            }
        }

        this._pendingScrollId = targetId;
        this.handleRoute();
    }

    navigate(path, { force = false } = {}) {
        let targetUrl;
        try {
            targetUrl = new URL(path, window.location.origin);
        } catch {
            targetUrl = new URL('/', window.location.origin);
        }

        const hashPart = targetUrl.hash || '';
        const searchPart = targetUrl.search || '';
        const normalized = this.normalizePath(path);
        const displayPath = buildLocalizedPath(normalized, getActiveLocale());
        const nextUrl = `${displayPath}${searchPart}${hashPart}`;
        const routeChanged = normalized !== this.currentRoute;
        const queryChanged = searchPart !== window.location.search;

        if (force || routeChanged || queryChanged) {
            window.history.pushState(null, '', nextUrl);
            this.currentRoute = normalized;
            this.handleRoute();
            return;
        }

        if (hashPart) {
            this._pendingScrollId = hashPart.slice(1);
            this.applyHashTarget();
        }
    }

    normalizePath(path = '/') {
        try {
            const url = new URL(path, window.location.origin);
            const { pathname: stripped } = stripLocalePrefix(
                url.pathname === '/index.html' ? '/' : url.pathname
            );
            return stripped.replace(/\/$/, '') || '/';
        } catch {
            const clean = String(path).split('#')[0];
            const { pathname: stripped } = stripLocalePrefix(
                clean === '/index.html' ? '/' : clean
            );
            return stripped.replace(/\/$/, '') || '/';
        }
    }

    handleRoute() {
        const rawPath = window.location.pathname;
        if (tryExternalRouteRedirect(rawPath)) {
            return;
        }

        const { pathname: stripped, localeId } = stripLocalePrefix(
            rawPath === '/index.html' ? '/' : rawPath
        );
        setActiveLocale(localeId);
        applyDocumentLocale(localeId);
        const path = stripped.replace(/\/$/, '') || '/';

        const fullPageTarget = resolveFullPageNavigation(path);
        if (fullPageTarget && fullPageTarget !== rawPath) {
            window.location.replace(fullPageTarget);
            return;
        }

        this.currentRoute = path;
        syncHtmlRouteSurface(resolveRouteSurface(path), path);

        const surfaceId = resolveRouteSurface(path);
        if (String(surfaceId).startsWith('page-')) {
            this.showPremiumPage(surfaceId);
            this.updateNavLinks(path);
            this.updateTitle(surfaceId);
            this.dispatchRoute(surfaceId, {}, path);
            return;
        }

        const aliasScrollId = MARKETING_PATH_ALIASES[path];
        if (aliasScrollId) {
            this._pendingScrollId = aliasScrollId;
            this.showHomeSections();
            this.updateNavLinks(path, aliasScrollId === 'home' ? '' : aliasScrollId);
            this.updateTitle('home');
            this.dispatchRoute('home', {}, path);
            this.applyHashTarget();
            return;
        }

        const hashId = window.location.hash?.slice(1);
        if (path === '/' && hashId && MARKETING_HASH_IDS.includes(hashId)) {
            this.showHomeSections();
            this.updateNavLinks(path, hashId);
            this.updateTitle('home');
            this.dispatchRoute('home', {}, path);
            this.applyHashTarget();
            return;
        }

        const match = this.matchRoute(path);
        const route = match ? match.component : 'home';

        this.updateNavLinks(path);
        this.showSection(route);
        this.updateTitle(route, match?.params);
        this.dispatchRoute(route, match?.params || {}, path);
        this.applyHashTarget();
    }

    dispatchRoute(route, params, path) {
        document.dispatchEvent(
            new CustomEvent('routeChanged', {
                detail: { route, params, path }
            })
        );
    }

    applyHashTarget() {
        const hashId = this._pendingScrollId || window.location.hash?.slice(1);
        this._pendingScrollId = null;
        if (!hashId || !MARKETING_HASH_IDS.includes(hashId)) return;

        const target = document.getElementById(hashId);
        if (!target) return;

        requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    matchRoute(path) {
        const exact = this.routes.find((route) => route.path === path);
        if (exact) {
            return { component: exact.component, params: {} };
        }

        for (const route of this.routes) {
            if (!route.path.includes(':')) continue;
            const routeParts = route.path.split('/').filter(Boolean);
            const pathParts = path.split('/').filter(Boolean);
            if (routeParts.length !== pathParts.length) continue;

            const params = {};
            let matches = true;

            routeParts.forEach((part, index) => {
                if (part.startsWith(':')) {
                    params[part.slice(1)] = decodeURIComponent(pathParts[index] || '');
                } else if (part !== pathParts[index]) {
                    matches = false;
                }
            });

            if (matches) {
                return { component: route.component, params };
            }
        }

        return null;
    }

    updateNavLinks(activePath, hashId = '') {
        document.querySelectorAll('.nav-link').forEach((link) => {
            link.classList.remove('active');
        });

        const hash = hashId ? `#${hashId}` : window.location.hash;
        if (hash) {
            const hashLink = document.querySelector(`a[href="${hash}"]`);
            if (hashLink) {
                hashLink.classList.add('active');
                return;
            }
        }

        const activeLink =
            document.querySelector(`a[href="${activePath}"]`) ||
            document.querySelector(`a[href="${activePath}/"]`) ||
            (activePath.startsWith('/ilan/')
                ? document.querySelector('a[href="/secenekler/"]')
                : null);

        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    showPremiumPage(pageId) {
        document.body.classList.add('app-route-active', 'ib-premium-route-active');

        document.querySelectorAll('section[id]').forEach((section) => {
            clearSectionDisplayOverride(section);
            section.classList.remove('route-visible');
            if (section.id === pageId) return;

            if (
                section.hasAttribute('data-private-section') ||
                HOMEPAGE_SECTION_IDS.includes(section.id)
            ) {
                section.classList.add('hidden');
                section.setAttribute('hidden', '');
                section.setAttribute('aria-hidden', 'true');
            }
        });

        const target = document.getElementById(pageId);
        if (!target) {
            this.showHomeSections();
            return;
        }

        target.classList.remove('hidden');
        target.removeAttribute('hidden');
        target.removeAttribute('aria-hidden');
        target.classList.add('route-visible');
        clearSectionDisplayOverride(target);
        pulseRouteSection(target);
        window.scrollTo({ top: 0, behavior: 'auto' });
        document.body.classList.add('ib-premium-mounted');
        import('../runtime/init-public-content.js')
            .then((m) => m.refreshPublicContentSurface(pageId))
            .catch(() => {});
    }

    showSection(routeId) {
        document.body.classList.remove('ib-premium-route-active', 'ib-premium-mounted');

        if (routeId === 'home') {
            this.showHomeSections();
            return;
        }

        if (routeId.startsWith('page-')) {
            this.showPremiumPage(routeId);
            return;
        }

        document.body.classList.add('app-route-active');

        document.querySelectorAll('[data-private-section]').forEach((section) => {
            section.classList.remove('route-visible');
            section.style.setProperty('display', 'none', 'important');
        });

        HOMEPAGE_SECTION_IDS.forEach((sectionId) => {
            const marketingSection = document.getElementById(sectionId);
            if (!marketingSection) return;
            marketingSection.style.setProperty('display', 'none', 'important');
            marketingSection.setAttribute('hidden', '');
            marketingSection.setAttribute('aria-hidden', 'true');
        });

        document.querySelectorAll('section[id]').forEach((section) => {
            section.style.setProperty('display', 'none', 'important');
        });

        if (routeId === 'auth-login' || routeId === 'auth-register') {
            const home = document.getElementById('home');
            if (home) {
                home.classList.remove('hidden');
                home.style.display = 'block';
            }
            return;
        }

        const targetSection = document.getElementById(routeId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            targetSection.removeAttribute('hidden');
            targetSection.removeAttribute('aria-hidden');

            if (targetSection.hasAttribute('data-private-section')) {
                targetSection.classList.add('route-visible');
            }

            targetSection.style.setProperty('display', 'block', 'important');
            pulseRouteSection(targetSection);
            window.scrollTo({ top: 0, behavior: 'auto' });
            return;
        }

        this.showHomeSections();
    }

    routeToDocumentSurface(route) {
        if (route === 'auth-login' || route === 'auth-register') {
            return 'home';
        }
        if (route === 'decision-assistant') {
            return 'page-karar-analizi';
        }
        return route;
    }

    updateTitle(route) {
        syncRouteDocumentMeta(this.routeToDocumentSurface(route), this.currentRoute);
    }
}
