import test from 'node:test';
import assert from 'node:assert/strict';

const listeners = new Map();
function sectionStub(id, { privateSection = false } = {}) {
    const attrs = new Set(privateSection ? ['data-private-section'] : []);
    const classes = new Set();
    return {
        id,
        style: {
            display: '',
            setProperty(prop, value) {
                this[prop] = value;
            },
            removeProperty(prop) {
                delete this[prop];
            }
        },
        classList: {
            add(...names) {
                names.forEach((name) => classes.add(name));
            },
            remove(...names) {
                names.forEach((name) => classes.delete(name));
            },
            toggle(name, on) {
                if (on) classes.add(name);
                else classes.delete(name);
            },
            has(name) {
                return classes.has(name);
            }
        },
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
    ['home-economic-indicators', sectionStub('home-economic-indicators')],
    ['how-it-works', sectionStub('how-it-works')],
    ['home-vertical-focus', sectionStub('home-vertical-focus')],
    ['home-features-strip', sectionStub('home-features-strip')],
    ['trust', sectionStub('trust')],
    ['methodology-teaser', sectionStub('methodology-teaser')],
    ['sample-preview', sectionStub('sample-preview')],
    ['home-auto-bridge', sectionStub('home-auto-bridge')],
    ['how-it-works', sectionStub('how-it-works')],
    ['pricing', sectionStub('pricing')],
    ['partner-enterprise', sectionStub('partner-enterprise')],
    ['landing-faq', sectionStub('landing-faq')],
    ['home-final-cta', sectionStub('home-final-cta')],
    ['home-guides-strip', sectionStub('home-guides-strip')],
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

test('marketing section constants include pricing and lean home blocks', () => {
    assert.ok(HOMEPAGE_SECTION_IDS.includes('home-economic-indicators'));
    assert.ok(HOMEPAGE_SECTION_IDS.includes('pricing'));
    assert.ok(HOMEPAGE_SECTION_IDS.includes('home-features-strip'));
    assert.ok(!HOMEPAGE_SECTION_IDS.includes('sample-preview'));
    assert.ok(MARKETING_HASH_IDS.includes('how-it-works'));
});

test('matchRoute resolves exact and dynamic listing routes', () => {
    const router = new Router();

    assert.deepEqual(router.matchRoute('/secenekler'), { component: 'ilanlar', params: {} });
    assert.deepEqual(router.matchRoute('/ilanlar'), { component: 'ilanlar', params: {} });
    assert.deepEqual(router.matchRoute('/decision-options'), { component: 'ilanlar', params: {} });
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

    assert.ok(sections.get('page-planlar').classList.has('route-visible'));
    assert.equal(sections.get('page-planlar').style.display, undefined);
    assert.equal(sections.get('pricing').style.display, undefined);
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

    assert.ok(planlar.classList.has('route-visible'));
    assert.equal(planlar.style.display, undefined);
    assert.equal(karar.style.display, undefined);

    global.window.location.pathname = '/en/karar-analizi';
    router.handleRoute();

    assert.ok(karar.classList.has('route-visible'));
    assert.equal(karar.style.display, undefined);
    assert.equal(planlar.style.display, undefined);
});

test('navigate switches between premium routes and updates pathname', () => {
    const router = new Router();
    sections.set('page-karar-analizi', sectionStub('page-karar-analizi', { privateSection: true }));
    sections.set('page-planlar', sectionStub('page-planlar', { privateSection: true }));

    global.window.location.pathname = '/karar-analizi';
    router.handleRoute();
    router.navigate('/planlar');

    assert.equal(global.window.location.pathname, '/planlar');
    assert.ok(sections.get('page-planlar').classList.has('route-visible'));
    assert.equal(sections.get('page-planlar').style.display, undefined);
    assert.equal(sections.get('page-karar-analizi').style.display, undefined);
});

test('showPremiumPage clears homepage hero display after marketing shell was shown', () => {
    const router = new Router();
    sections.set('page-blog', sectionStub('page-blog', { privateSection: true }));
    const home = sections.get('home');
    home.style.setProperty('display', 'block', 'important');

    router.showPremiumPage('page-blog');

    assert.equal(home.style.display, undefined);
    assert.equal(sections.get('page-blog').style.display, undefined);
});

test('handleRoute on /blog hides marketing hero after home was visible', () => {
    const router = new Router();
    sections.set('page-blog', sectionStub('page-blog', { privateSection: true }));
    const home = sections.get('home');
    router.showHomeSections();
    assert.equal(home.style.display, 'block');

    global.window.location.pathname = '/blog';
    router.handleRoute();

    assert.equal(home.style.display, undefined);
    assert.equal(sections.get('page-blog').style.display, undefined);
});
