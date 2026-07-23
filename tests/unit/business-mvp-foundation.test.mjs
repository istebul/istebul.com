/**
 * EPIC-500 — Business MVP foundation contracts.
 */
import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

register(pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href);

const { BUSINESS_NAV_ITEMS } = await import('../../src/business/constants/BusinessNav.ts');
const { BUSINESS_DASHBOARD_MOCK } = await import('../../src/business/data/dashboard-mock.ts');
const {
  BUSINESS_ROUTES,
  getBusinessRouteByPath,
  getBusinessRouteByNavId
} = await import('../../src/business/routes/business-routes.ts');
const { mountBusinessApp } = await import('../../src/business/app/mountBusinessApp.ts');
const { createBusinessDashboardPageElement } = await import(
  '../../src/business/pages/BusinessDashboardPage.ts'
);

/** Minimal DOM stubs (platform-landing-preview pattern, extended for Business shell). */
function installDomStubs() {
  class FakeEl {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this.children = [];
      this.attrs = {};
      this.className = '';
      this.id = '';
      this.textContent = '';
      this.href = '';
      this.type = '';
      this.dataset = {};
      this.style = { setProperty() {} };
      this.parentNode = null;
      this._innerHTML = '';
    }

    get innerHTML() {
      return this._innerHTML;
    }

    set innerHTML(value) {
      this._innerHTML = String(value);
      this.textContent = String(value).replace(/<[^>]+>/g, ' ');
    }

    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === 'id') this.id = String(v);
      if (k.startsWith('data-')) {
        const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[key] = String(v);
      }
    }

    getAttribute(k) {
      return this.attrs[k] ?? null;
    }

    append(...nodes) {
      for (const node of nodes) {
        if (node && typeof node === 'object') {
          node.parentNode = this;
          this.children.push(node);
        }
      }
    }

    appendChild(node) {
      this.append(node);
      return node;
    }

    replaceChildren(...nodes) {
      this.children = [];
      this.append(...nodes);
    }

    addEventListener() {}

    querySelector(selector) {
      const all = this.querySelectorAll(selector);
      return all[0] || null;
    }

    querySelectorAll(selector) {
      const acc = [];
      const visit = (node) => {
        if (!node) return;
        if (matches(node, selector)) acc.push(node);
        for (const child of node.children || []) visit(child);
      };
      visit(this);
      return acc;
    }

    classList = {
      _self: this,
      add(...names) {
        const set = new Set(String(this._self.className || '').split(/\s+/).filter(Boolean));
        names.forEach((n) => set.add(n));
        this._self.className = [...set].join(' ');
      },
      remove(...names) {
        const set = new Set(String(this._self.className || '').split(/\s+/).filter(Boolean));
        names.forEach((n) => set.delete(n));
        this._self.className = [...set].join(' ');
      },
      toggle(name) {
        const set = new Set(String(this._self.className || '').split(/\s+/).filter(Boolean));
        if (set.has(name)) set.delete(name);
        else set.add(name);
        this._self.className = [...set].join(' ');
        return set.has(name);
      },
      contains(name) {
        return String(this._self.className || '')
          .split(/\s+/)
          .filter(Boolean)
          .includes(name);
      }
    };
  }

  function matches(node, selector) {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return String(node.className || '')
        .split(/\s+/)
        .includes(cls);
    }
    if (selector.startsWith('#')) {
      return node.id === selector.slice(1);
    }
    return false;
  }

  function collectText(node, acc = []) {
    if (!node) return acc;
    if (node.textContent) acc.push(node.textContent);
    for (const child of node.children || []) collectText(child, acc);
    return acc;
  }

  globalThis.document = {
    createElement: (tag) => new FakeEl(tag),
    getElementById: () => null,
    readyState: 'complete',
    addEventListener() {}
  };
  globalThis.HTMLElement = FakeEl;
  globalThis.window = { location: { pathname: '/business/' } };

  return { FakeEl, collectText };
}

test('Business MVP registers six app routes and nav items', () => {
  assert.equal(BUSINESS_ROUTES.length, 6);
  assert.equal(BUSINESS_NAV_ITEMS.length, 6);
  assert.ok(getBusinessRouteByPath('/business'));
  assert.ok(getBusinessRouteByPath('/business/analizler'));
  assert.ok(getBusinessRouteByPath('/business/raporlar'));
  assert.ok(getBusinessRouteByPath('/business/danisman'));
  assert.ok(getBusinessRouteByPath('/business/bildirimler'));
  assert.ok(getBusinessRouteByPath('/business/ayarlar'));
  for (const item of BUSINESS_NAV_ITEMS) {
    assert.ok(getBusinessRouteByNavId(item.id));
  }
});

test('Business dashboard page renders mock KPI and section shells', () => {
  const { collectText } = installDomStubs();
  const page = createBusinessDashboardPageElement();
  assert.equal(page.dataset.businessPage, 'dashboard');
  assert.ok(page.querySelector('.ib-biz-summary'));
  assert.equal(page.querySelectorAll('.ib-biz-kpi').length, BUSINESS_DASHBOARD_MOCK.kpis.length);
  assert.ok(page.querySelector('#business-activity-title'));
  assert.ok(page.querySelector('#business-ai-suggestions-title'));
  assert.ok(page.querySelector('#business-quick-actions-title'));
  const text = collectText(page).join(' ');
  assert.match(text, /Günlük|özet|Bugünkü/i);
});

test('Business app mount creates sidebar, topbar, and content', () => {
  installDomStubs();
  const root = document.createElement('div');
  root.id = 'business-app-root';
  mountBusinessApp(root, { navId: 'dashboard' });
  assert.equal(root.dataset.businessAppReady, '1');
  assert.ok(root.querySelector('.ib-biz-shell'));
  assert.ok(root.querySelector('.ib-biz-sidebar'));
  assert.ok(root.querySelector('.ib-biz-topbar'));
  assert.equal(root.querySelectorAll('.ib-biz-sidebar__link').length, 6);
});

test('Business non-dashboard routes mount empty states', () => {
  const { collectText } = installDomStubs();
  const root = document.createElement('div');
  mountBusinessApp(root, { navId: 'analizler' });
  assert.ok(root.querySelector('.ib-biz-empty'));
  assert.match(collectText(root).join(' '), /Henüz analiz yok/);
});

test('Business HTML shells and boot entry exist', () => {
  const pages = [
    'business/index.html',
    'business/analizler/index.html',
    'business/raporlar/index.html',
    'business/danisman/index.html',
    'business/bildirimler/index.html',
    'business/ayarlar/index.html'
  ];
  for (const rel of pages) {
    const html = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.match(html, /id="business-app-root"/);
    assert.match(html, /js\/business\/business-app\.js/);
    assert.match(html, /css\/business-page\.css/);
    assert.doesNotMatch(html, /Yakında/);
    assert.doesNotMatch(html, /istebul-design-system-v4/);
    assert.doesNotMatch(html, /istebul-premium-final-v7/);
    assert.doesNotMatch(html, /ib-ds-v4|ib-premium-v7/);
  }
  assert.ok(fs.existsSync(path.join(root, 'js/business/business-app.js')));
  const build = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
  assert.match(build, /business\/analizler\/index\.html/);
  assert.match(build, /js\/business\/business-app\.js/);
});
