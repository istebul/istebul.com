import test from 'node:test';
import assert from 'node:assert/strict';

const listeners = new Map();
function sectionStub(id, { privateSection = false } = {}) {
    const attrs = new Set(privateSection ? ['data-private-section'] : []);
    return {
        id,
        style: {
            display: '',
            setProperty(prop, value) {
                this[prop] = value;
            }
        },
        classList: { add() {}, remove() {} },
        hasAttribute(name) {
            return attrs.has(name);
        },
        setAttribute(name) {
            attrs.add(name);
        },
        removeAttribute(name) {
            attrs.delete(name);
        },
        scrollIntoView() {}
    };
}

const sections = new Map([
    ['home', sectionStub('home')],
    ['home-problem', sectionStub('home-problem')],
    ['how-it-works', sectionStub('how-it-works')],
    ['home-vertical-focus', sectionStub('home-vertical-focus')],
    ['home-ai-engine', sectionStub('home-ai-engine')],
    ['home-ai-diff', sectionStub('home-ai-diff')],
    ['trust', sectionStub('trust')],
    ['methodology-teaser', sectionStub('methodology-teaser')],
    ['sample-preview', sectionStub('sample-preview')],
    ['home-auto-bridge', sectionStub('home-auto-bridge')],
    ['how-it-works', sectionStub('how-it-works')],
    ['pricing', sectionStub('pricing')],
    ['partner-enterprise', sectionStub('partner-enterprise')],
    ['landing-faq', sectionStub('landing-faq')],
    ['home-final-cta', sectionStub('home-final-cta')],
    ['home-content-hub', sectionStub('home-content-hub')],
    ['category-ownership', sectionStub('category-ownership')],
    ['categories', sectionStub('categories')],
    ['ilanlar', sectionStub('ilanlar')]
]);

function makeSection(id) {
    const el = sections.get(id);
    if (!el) return null;
    return el;
}

global.window = {
    location: { pathname: '/', hash: '', origin: 'https://www.istebul.com' },
    history: {
        pushState(_state, _title, url) {
            const parsed = new URL(url, global.window.location.origin);
            global.window.location.pathname = parsed.pathname;
            global.window.location.hash = parsed.hash;
        }
    },
    addEventListener: (event, callback) => listeners.set(event, callback)
};

global.document = {
    title: '',
    documentElement: {
        lang: 'tr',
        dir: 'ltr',
        dataset: {},
        classList: { add() {}, remove() {} }
    },
    body: { classList: { add() {}, remove() {} } },
    addEventListener: () => {},
    dispatchEvent: () => {},
    querySelectorAll: (selector) => {
        if (selector === '.nav-link') return [];
        if (selector === 'section[id]') return Array.from(sections.values());
        if (selector === '[data-private-section]') return [];
        return [];
    },
    querySelector: () => null,
    getElementById: (id) => makeSection(id)
};

global.requestAnimationFrame = (fn) => fn();
global.window.scrollTo = () => {};

global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
    }
};

const { Router, HOMEPAGE_SECTION_IDS, MARKETING_HASH_IDS } = await import('../../js/core/router.js');

test('marketing section constants include pricing and sample preview', () => {
    assert.ok(HOMEPAGE_SECTION_IDS.includes('pricing'));
    assert.ok(HOMEPAGE_SECTION_IDS.includes('sample-preview'));
    assert.ok(MARKETING_HASH_IDS.includes('how-it-works'));
});

test('matchRoute resolves exact and dynamic listing routes', () => {
    const router = new Router();

    assert.deepEqual(router.matchRoute('/ilanlar'), { component: 'ilanlar', params: {} });
    assert.deepEqual(router.matchRoute('/ilan/test%20id'), {
        component: 'listing-detail',
        params: { id: 'test id' }
    });
    assert.equal(router.matchRoute('/bilinmeyen'), null);
});

test('showHomeSections reveals all marketing blocks including pricing', () => {
    const router = new Router();
    sections.forEach((section) => {
        section.style.display = 'none';
    });

    router.showHomeSections();

    for (const id of HOMEPAGE_SECTION_IDS) {
        assert.equal(sections.get(id).style.display, 'block', `${id} should be visible`);
    }
    assert.equal(sections.get('ilanlar').style.display, 'none');
});

test('goToMarketingHash resets pathname from SPA route and shows landing sections', () => {
    const router = new Router();
    global.window.location.pathname = '/karsilastir';
    global.window.location.hash = '';

    router.goToMarketingHash('pricing');

    assert.equal(global.window.location.pathname, '/');
    assert.equal(global.window.location.hash, '#pricing');
    assert.equal(sections.get('pricing').style.display, 'block');
});

test('handleRoute maps /planlar to premium planlar page', () => {
    const router = new Router();
    sections.set('page-planlar', sectionStub('page-planlar', { privateSection: true }));
    global.window.location.pathname = '/planlar';
    global.window.location.hash = '';

    router.handleRoute();

    assert.equal(sections.get('page-planlar').style.display, 'block');
    assert.equal(sections.get('pricing').style.display, 'none');
});

test('handleRoute maps locale-prefixed premium paths to distinct pages', () => {
    const router = new Router();
    const karar = sectionStub('page-karar-analizi', { privateSection: true });
    const planlar = sectionStub('page-planlar', { privateSection: true });
    sections.set('page-karar-analizi', karar);
    sections.set('page-planlar', planlar);

    global.window.location.pathname = '/en/planlar';
    global.window.location.hash = '';
    router.handleRoute();

    assert.equal(planlar.style.display, 'block');
    assert.equal(karar.style.display, 'none');

    global.window.location.pathname = '/en/karar-analizi';
    router.handleRoute();

    assert.equal(karar.style.display, 'block');
    assert.equal(planlar.style.display, 'none');
});

test('navigate switches between premium routes and updates pathname', () => {
    const router = new Router();
    sections.set('page-karar-analizi', sectionStub('page-karar-analizi', { privateSection: true }));
    sections.set('page-planlar', sectionStub('page-planlar', { privateSection: true }));

    global.window.location.pathname = '/karar-analizi';
    router.handleRoute();
    router.navigate('/planlar');

    assert.equal(global.window.location.pathname, '/planlar');
    assert.equal(sections.get('page-planlar').style.display, 'block');
    assert.equal(sections.get('page-karar-analizi').style.display, 'none');
});
