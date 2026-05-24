import test from 'node:test';
import assert from 'node:assert/strict';

const listeners = new Map();
function sectionStub(id) {
    return {
        id,
        style: {},
        classList: { add() {}, remove() {} },
        hasAttribute: () => false,
        scrollIntoView() {}
    };
}

const sections = new Map([
    ['home', sectionStub('home')],
    ['trust', sectionStub('trust')],
    ['how-it-works', sectionStub('how-it-works')],
    ['pricing', sectionStub('pricing')],
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

global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
    }
};

const { Router, HOMEPAGE_SECTION_IDS, MARKETING_HASH_IDS } = await import('../../js/core/router.js');

test('marketing section constants include pricing', () => {
    assert.ok(HOMEPAGE_SECTION_IDS.includes('pricing'));
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

test('handleRoute maps /planlar alias to pricing scroll', () => {
    const router = new Router();
    global.window.location.pathname = '/planlar';
    global.window.location.hash = '';
    let scrolled = false;
    global.document.getElementById = (id) => {
        if (id === 'pricing') {
            return {
                scrollIntoView() {
                    scrolled = true;
                }
            };
        }
        return makeSection(id);
    };

    router.handleRoute();

    assert.equal(sections.get('pricing').style.display, 'block');
    assert.ok(scrolled);
});
