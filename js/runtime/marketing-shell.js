/**
 * Marketing vs app shell — FAQ, sticky nav, route-aware chrome.
 */
import { resolveRouteSurface } from './route-surface.js';

const APP_SURFACES = new Set([
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

export function isMarketingSurface(pathname = window.location.pathname) {
    const surface = resolveRouteSurface(pathname);
    return surface === 'home' || String(surface).startsWith('page-');
}

export function syncMarketingShellClasses(pathname = window.location.pathname) {
    if (typeof document === 'undefined') return;

    const surface = resolveRouteSurface(pathname);
    const marketing = surface === 'home';
    const app = APP_SURFACES.has(surface);

    document.body.classList.toggle('marketing-shell', marketing);
    document.body.classList.toggle('app-shell', app);
    document.documentElement.classList.toggle('ib-marketing-route', marketing);
}

export function initLandingFaq() {
    document.querySelectorAll('[data-faq-toggle]').forEach((btn) => {
        if (btn.dataset.faqBound) return;
        btn.dataset.faqBound = '1';
        btn.addEventListener('click', () => {
            const item = btn.closest('[data-faq-item]');
            if (!item) return;
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            const next = !expanded;
            btn.setAttribute('aria-expanded', String(next));
            item.classList.toggle('is-open', next);
            const panel = item.querySelector('.ib-faq-panel');
            if (panel) panel.hidden = !next;
        });
    });
}

export function initStickyNav() {
    const nav = document.getElementById('main-nav');
    if (!nav || nav.dataset.stickyBound) return;
    nav.dataset.stickyBound = '1';

    const onScroll = () => {
        nav.classList.toggle('is-stuck', window.scrollY > 12);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

export function initMarketingShell() {
    if (typeof document === 'undefined') return;

    syncMarketingShellClasses();
    initLandingFaq();
    initStickyNav();

    document.addEventListener('routeChanged', (event) => {
        syncMarketingShellClasses(event.detail?.path || window.location.pathname);
        initLandingFaq();
    });
}
