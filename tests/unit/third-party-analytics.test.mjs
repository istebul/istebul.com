import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const FAKE_CF_TOKEN = '00000000000000000000000000000001';

function createLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

function createScriptElement(initial = {}) {
  const attrs = {};
  const el = {
    tagName: 'SCRIPT',
    defer: false,
    async: false,
    src: initial.src || '',
    dataset: { ...(initial.dataset || {}) },
    setAttribute(name, value) {
      attrs[name] = value;
    },
    getAttribute(name) {
      return attrs[name] ?? null;
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name);
    }
  };
  if (initial['data-cf-beacon']) {
    el.setAttribute('data-cf-beacon', initial['data-cf-beacon']);
  }
  return el;
}

function createDocumentMock(initialScripts = []) {
  const scripts = [...initialScripts];
  const querySelector = (selector) => {
    for (const el of scripts) {
      if (el.tagName !== 'SCRIPT') continue;
      if (
        selector === 'script[data-analytics-provider="cf-beacon"]' &&
        el.dataset.analyticsProvider === 'cf-beacon'
      ) {
        return el;
      }
      if (
        selector === 'script[src*="static.cloudflareinsights.com/beacon.min.js"]' &&
        el.src.includes('static.cloudflareinsights.com/beacon.min.js')
      ) {
        return el;
      }
      if (
        selector === 'script[src*="beacon.min.js"][data-cf-beacon]' &&
        el.src.includes('beacon.min.js') &&
        el.hasAttribute('data-cf-beacon')
      ) {
        return el;
      }
      if (
        selector === 'script[data-analytics-provider="plausible"]' &&
        el.dataset.analyticsProvider === 'plausible'
      ) {
        return el;
      }
      if (
        selector === 'script[data-analytics-provider="ga4"]' &&
        el.dataset.analyticsProvider === 'ga4'
      ) {
        return el;
      }
    }
    return null;
  };

  return {
    title: 'test',
    head: {
      appendChild(el) {
        scripts.push(el);
      }
    },
    querySelector,
    createElement(tag) {
      if (tag === 'script') return createScriptElement();
      return { tagName: String(tag).toUpperCase() };
    },
    get beaconScripts() {
      return scripts.filter(
        (el) =>
          el.src.includes('beacon.min.js') ||
          el.dataset.analyticsProvider === 'cf-beacon'
      );
    }
  };
}

function countBeaconScripts(doc) {
  return doc.beaconScripts.length;
}

describe('third-party-analytics', () => {
  it('module exports loadThirdPartyMeasurement', async () => {
    const mod = await import('../../js/core/third-party-analytics.js');
    assert.equal(typeof mod.loadThirdPartyMeasurement, 'function');
  });

  it('analytics-consent-boot loads third-party measurement after consent', () => {
    const boot = fs.readFileSync(
      path.join(process.cwd(), 'js/runtime/analytics-consent-boot.js'),
      'utf8'
    );
    assert.match(boot, /third-party-analytics\.js/);
    assert.match(boot, /loadThirdPartyMeasurement/);
  });

  it('app.js wires analytics consent runtime', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'js/app.js'), 'utf8');
    assert.match(app, /analytics-consent-boot\.js/);
    assert.match(app, /bootAnalyticsMeasurement/);
  });

  it('loads Clarity when CLARITY_PROJECT_ID is set', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'js/core/third-party-analytics.js'),
      'utf8'
    );
    assert.match(src, /loadClarity/);
    assert.match(src, /CLARITY_PROJECT_ID/);
    assert.match(src, /www\.clarity\.ms/);
  });

  it('grants full GA4 consent on accept when gtag already in head', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'js/core/third-party-analytics.js'),
      'utf8'
    );
    assert.match(src, /consent', 'update'/);
    assert.match(src, /analytics_storage: 'granted'/);
    assert.match(src, /ad_storage: 'granted'/);
    assert.match(src, /ad_user_data: 'granted'/);
    assert.match(src, /ad_personalization: 'granted'/);
    assert.match(src, /console\.info\('\[Consent\]'/);
    assert.match(src, /console\.info\('\[GA4 Consent State Updated\]'\)/);
    assert.match(src, /page_view/);
  });

  it('boots GA4 consent before first-party analytics init', () => {
    const boot = fs.readFileSync(
      path.join(process.cwd(), 'js/runtime/analytics-consent-boot.js'),
      'utf8'
    );
    const updateIndex = boot.indexOf('updateGa4ConsentGranted');
    const analyticsInitIndex = boot.indexOf('analytics.init()');
    assert.ok(updateIndex > -1 && analyticsInitIndex > updateIndex);
  });

  describe('Cloudflare beacon consent and dedup', () => {
    /** @type {ReturnType<typeof createLocalStorage> | undefined} */
    let storage;
    /** @type {ReturnType<typeof createDocumentMock> | undefined} */
    let doc;
    let previousDocument;
    let previousWindow;
    let previousLocalStorage;

    beforeEach(() => {
      storage = createLocalStorage();
      doc = createDocumentMock();
      previousDocument = global.document;
      previousWindow = global.window;
      previousLocalStorage = global.localStorage;
      global.localStorage = storage;
      global.document = doc;
      global.window = {
        ...(previousWindow || {}),
        __env: { CF_WEB_ANALYTICS_TOKEN: FAKE_CF_TOKEN },
        dataLayer: [],
        location: { href: 'https://www.istebul.com/', pathname: '/', search: '' }
      };
    });

    afterEach(() => {
      if (previousDocument === undefined) delete global.document;
      else global.document = previousDocument;
      if (previousWindow === undefined) delete global.window;
      else global.window = previousWindow;
      if (previousLocalStorage === undefined) delete global.localStorage;
      else global.localStorage = previousLocalStorage;
    });

    it('does not load Cloudflare beacon without cookie consent', async () => {
      const { loadThirdPartyMeasurement } = await import('../../js/core/third-party-analytics.js');
      loadThirdPartyMeasurement();
      assert.equal(countBeaconScripts(doc), 0);
    });

    it('loads Cloudflare beacon after consent when CF_WEB_ANALYTICS_TOKEN is set', async () => {
      storage.setItem('istebul_cookie_consent', 'accepted');
      const { loadThirdPartyMeasurement } = await import('../../js/core/third-party-analytics.js');
      loadThirdPartyMeasurement();
      assert.equal(countBeaconScripts(doc), 1);
      const beacon = doc.beaconScripts[0];
      assert.match(beacon.src, /static\.cloudflareinsights\.com\/beacon\.min\.js/);
      assert.equal(beacon.dataset.analyticsProvider, 'cf-beacon');
    });

    it('skips a second beacon when dashboard-style script is already present', async () => {
      doc.head.appendChild(
        createScriptElement({
          src: 'https://static.cloudflareinsights.com/beacon.min.js',
          'data-cf-beacon': JSON.stringify({ token: FAKE_CF_TOKEN })
        })
      );
      storage.setItem('istebul_cookie_consent', 'accepted');
      const { loadThirdPartyMeasurement } = await import('../../js/core/third-party-analytics.js');
      loadThirdPartyMeasurement();
      assert.equal(countBeaconScripts(doc), 1);
    });

    it('dedup checks cover loader and dashboard-style beacon selectors', () => {
      const src = fs.readFileSync(
        path.join(process.cwd(), 'js/core/third-party-analytics.js'),
        'utf8'
      );
      assert.match(src, /script\[data-analytics-provider="cf-beacon"\]/);
      assert.match(src, /script\[src\*="static\.cloudflareinsights\.com\/beacon\.min\.js"\]/);
      assert.match(src, /script\[src\*="beacon\.min\.js"\]\[data-cf-beacon\]/);
      assert.match(src, /analytics\.hasConsent\(\)/);
    });
  });
});
