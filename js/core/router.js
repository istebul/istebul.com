// Router - Simple client-side routing
import { stripLocalePrefix, setActiveLocale, applyDocumentLocale } from '../platform/locale-registry.js';

/** Marketing sections on index.html (long-scroll landing). */
export const HOMEPAGE_SECTION_IDS = Object.freeze([
    'home',
    'trust',
    'how-it-works',
    'pricing',
    'categories'
]);

/** Hash targets on the marketing page. */
export const MARKETING_HASH_IDS = Object.freeze([
    'home',
    'trust',
    'how-it-works',
    'pricing',
    'categories'
]);

/** Legacy / SEO paths → scroll target on homepage. */
const MARKETING_PATH_ALIASES = Object.freeze({
    '/metodoloji': 'how-it-works',
    '/planlar': 'pricing',
    '/karar-analizi': 'home'
});

export class Router {
    constructor() {
        this.routes = [
            { path: '/', component: 'home' },
            { path: '/ilanlar', component: 'ilanlar' },
            { path: '/karsilastir', component: 'compare' },
            { path: '/karar-asistani', component: 'decision-assistant' },
            { path: '/favoriler', component: 'favoriler' },
            { path: '/gecmis', component: 'history' },
            { path: '/quiz', component: 'quiz' },
            { path: '/profil', component: 'profil' },
            { path: '/hesap', component: 'profil' },
            { path: '/giris', component: 'auth-login' },
            { path: '/kayit', component: 'auth-register' },
            { path: '/admin', component: 'admin' },
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
            if (link.hasAttribute('data-native-route')) return;

            const rawHref = link.getAttribute('href') || '/';
            if (rawHref.startsWith('/#')) {
                e.preventDefault();
                const targetId = rawHref.slice(2).split('?')[0];
                if (targetId && document.getElementById(targetId)) {
                    this.goToMarketingHash(targetId);
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
        document.body.classList.remove('app-route-active');

        document.querySelectorAll('[data-private-section]').forEach((section) => {
            section.classList.remove('route-visible');
        });

        document.querySelectorAll('section[id]').forEach((section) => {
            const isMarketing = HOMEPAGE_SECTION_IDS.includes(section.id);
            if (isMarketing) {
                section.classList.remove('hidden');
                section.style.display = 'block';
                return;
            }

            section.style.display = 'none';
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
        const hashPart = path.includes('#') ? path.slice(path.indexOf('#')) : '';
        const normalized = this.normalizePath(path);

        if (force || normalized !== this.currentRoute) {
            window.history.pushState(null, '', normalized + hashPart);
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
        const { pathname: stripped, localeId } = stripLocalePrefix(
            rawPath === '/index.html' ? '/' : rawPath
        );
        setActiveLocale(localeId);
        applyDocumentLocale(localeId);
        const path = stripped.replace(/\/$/, '') || '/';
        this.currentRoute = path;

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
                ? document.querySelector('a[href="/ilanlar/"]')
                : null);

        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    showSection(routeId) {
        if (routeId === 'home') {
            this.showHomeSections();
            return;
        }

        document.body.classList.add('app-route-active');

        document.querySelectorAll('[data-private-section]').forEach((section) => {
            section.classList.remove('route-visible');
        });

        document.querySelectorAll('section[id]').forEach((section) => {
            section.style.display = 'none';
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

            if (targetSection.hasAttribute('data-private-section')) {
                targetSection.classList.add('route-visible');
            }

            targetSection.style.display = 'block';
            return;
        }

        this.showHomeSections();
    }

    updateTitle(route) {
        const titles = {
            home: 'isteBul - Yapay Zeka Destekli Karar Platformu',
            ilanlar: 'Seçenekler - isteBul',
            compare: 'Karşılaştırma Merkezi - isteBul',
            'decision-assistant': 'Karar Asistanı - isteBul',
            favoriler: 'Favoriler - isteBul',
            history: 'Karar Geçmişi - isteBul',
            quiz: 'Quiz - isteBul',
            profil: 'Hesabım - isteBul',
            'auth-login': 'Giriş - isteBul',
            'auth-register': 'Üye Ol - isteBul',
            admin: 'Admin Panel - isteBul',
            messages: 'Mesajlar - isteBul',
            'add-listing': 'İlan Ekle - isteBul',
            'listing-detail': 'İlan Detayı - isteBul'
        };

        document.title = titles[route] || titles.home;
    }
}
