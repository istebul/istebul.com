/**
 * EPIC-530 — Business Analytics Engine.
 */
import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href);

const { createBusinessDataProvider } = await import(
  '../../src/business/providers/ProviderFactory.ts'
);
const { createAnalyticsEngine } = await import(
  '../../src/business/intelligence/core/AnalyticsEngine.ts'
);
const { createDefaultAnalyticsRegistry } = await import(
  '../../src/business/intelligence/core/AnalyticsRegistry.ts'
);
const { MetricsEngine } = await import('../../src/business/services/MetricsEngine.ts');
const { InsightEngine } = await import('../../src/business/services/InsightEngine.ts');
const { RecommendationEngine } = await import(
  '../../src/business/services/RecommendationEngine.ts'
);
const { runBusinessIntelligenceEngine } = await import(
  '../../src/business/intelligence/pipeline/BusinessIntelligenceEngine.ts'
);
const { RevenueAnalytics } = await import(
  '../../src/business/intelligence/analytics/RevenueAnalytics.ts'
);
const { createBusinessDashboardPageElement } = await import(
  '../../src/business/pages/BusinessDashboardPage.ts'
);
const { createBusinessAiAdvisorPageElement } = await import(
  '../../src/business/pages/BusinessAiAdvisorPage.ts'
);

function installDomStubs() {
  class FakeEl {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this.children = [];
      this.attrs = {};
      this.className = '';
      this.id = '';
      this.textContent = '';
      this.dataset = {};
      this.style = { setProperty() {} };
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
        if (node && typeof node === 'object') this.children.push(node);
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
      return this.querySelectorAll(selector)[0] || null;
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
      return String(node.className || '')
        .split(/\s+/)
        .includes(selector.slice(1));
    }
    if (selector.startsWith('#')) return node.id === selector.slice(1);
    return false;
  }
  globalThis.document = {
    createElement: (tag) => new FakeEl(tag),
    getElementById: () => null,
    readyState: 'complete',
    addEventListener() {}
  };
  globalThis.HTMLElement = FakeEl;
}

test('AnalyticsRegistry seeds seven builtin modules', () => {
  const registry = createDefaultAnalyticsRegistry();
  assert.equal(registry.count(), 7);
  assert.equal(registry.get('revenue'), RevenueAnalytics);
});

test('AnalyticsEngine produces snapshot from mock provider', () => {
  const engine = createAnalyticsEngine({
    provider: createBusinessDataProvider({ kind: 'mock' })
  });
  const snap = engine.compute();
  assert.equal(snap.asOf, '2026-07-22');
  assert.equal(typeof snap.revenueDelta, 'number');
  assert.equal(snap.topMarginCategory, 'Elektronik');
  assert.equal(snap.moduleResults.length, 7);
});

test('MetricsEngine consumes analytics output not provider directly', () => {
  const provider = createBusinessDataProvider();
  const analyticsEngine = createAnalyticsEngine({ provider });
  analyticsEngine.compute();
  const metricsEngine = new MetricsEngine({ analyticsEngine, provider });
  const result = metricsEngine.compute();
  assert.equal(result.metrics.metrics.length, 5);
  assert.equal(result.signals.topMarginCategory, 'Elektronik');
  assert.ok(metricsEngine.getAnalyticsEngine() === analyticsEngine);
});

test('Insight and Recommendation engines keep layered dependencies', () => {
  const metricsEngine = new MetricsEngine(createBusinessDataProvider());
  const insightEngine = new InsightEngine(metricsEngine);
  const recommendationEngine = new RecommendationEngine(insightEngine);
  metricsEngine.compute();
  insightEngine.compute();
  const recs = recommendationEngine.compute();
  const messages = recs.recommendations.map((r) => r.message);
  assert.ok(messages.some((m) => /Satışlar son 7 günde/i.test(m)));
  assert.ok(messages.some((m) => /Stok yenilenmeli/i.test(m)));
});

test('Advisor pipeline output preserved', () => {
  const advisor = runBusinessIntelligenceEngine();
  assert.equal(advisor.headline, 'AI Business Advisor');
  assert.equal(advisor.metrics.metrics.length, 5);
  assert.ok(advisor.insights.insights.length >= 3);
  assert.ok(advisor.recommendations.recommendations.length >= 4);
});

test('Dashboard and Danışman UI still mount advisor panel', () => {
  installDomStubs();
  const dashboard = createBusinessDashboardPageElement();
  assert.ok(dashboard.querySelector('.ib-biz-advisor'));
  const advisorPage = createBusinessAiAdvisorPageElement();
  assert.ok(advisorPage.querySelector('.ib-biz-advisor'));
});
