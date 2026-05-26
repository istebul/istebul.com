/**
 * Marketing vs app shell — FAQ, sticky nav, route-aware chrome.
 */
import { resolveRouteSurface } from './route-surface.js';
import { initSocialProofMetrics } from './social-proof.js';

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

function initHomeAnchorLinks() {
    document.querySelectorAll('[data-home-anchor]').forEach((el) => {
        if (el.dataset.homeAnchorBound) return;
        el.dataset.homeAnchorBound = '1';
        el.addEventListener('click', (event) => {
            const targetId = el.getAttribute('data-home-anchor') || el.getAttribute('href')?.replace(/^\/#/, '');
            if (!targetId) return;
            if (resolveRouteSurface(window.location.pathname) !== 'home') {
                return;
            }
            event.preventDefault();
            const section = document.getElementById(targetId);
            if (!section) return;
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.history?.replaceState) {
                window.history.replaceState(null, '', `/#${targetId}`);
            }
        });
    });
}

export function initMarketingShell() {
    if (typeof document === 'undefined') return;

    syncMarketingShellClasses();
    initLandingFaq();
    initStickyNav();
    initHomeAnchorLinks();

    if (isMarketingSurface()) {
        initSocialProofMetrics();
    }

    document.addEventListener('routeChanged', (event) => {
        syncMarketingShellClasses(event.detail?.path || window.location.pathname);
        initLandingFaq();
        initHomeAnchorLinks();
        if (isMarketingSurface(event.detail?.path || window.location.pathname)) {
            initSocialProofMetrics();
        }
    });
}
