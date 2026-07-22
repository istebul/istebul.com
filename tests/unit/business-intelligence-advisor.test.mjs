/**
 * EPIC-510 — AI Business Advisor / Business Intelligence Engine.
 */
import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href);

const { createMockBusinessDataProvider } = await import(
  '../../src/business/intelligence/providers/MockDataProvider.ts'
);
const { computeBusinessMetrics } = await import(
  '../../src/business/intelligence/metrics/MetricsEngine.ts'
);
const { computeBusinessInsights } = await import(
  '../../src/business/intelligence/insights/InsightEngine.ts'
);
const { computeBusinessRecommendations } = await import(
  '../../src/business/intelligence/recommendations/RecommendationEngine.ts'
);
const { runBusinessIntelligenceEngine } = await import(
  '../../src/business/intelligence/pipeline/BusinessIntelligenceEngine.ts'
);
const { createBusinessAdvisorPanelElement } = await import(
  '../../src/business/components/BusinessAdvisorPanel.ts'
);
const { createBusinessDashboardPageElement } = await import(
  '../../src/business/pages/BusinessDashboardPage.ts'
);

const REQUIRED_METRIC_IDS = [
  'revenue-trend',
  'cost-trend',
  'growth',
  'risk-score',
  'customer-health'
];

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

  return { collectText };
}

test('Data Provider returns frozen mock snapshot without network', () => {
  const provider = createMockBusinessDataProvider();
  const snap = provider.getSnapshot();
  assert.equal(snap.currency, 'TRY');
  assert.ok(snap.revenueSeries.length >= 2);
  assert.ok(snap.costSeries.length >= 2);
  assert.ok(snap.categoryMargins.length >= 1);
});

test('Metrics Engine produces required business metrics', () => {
  const raw = createMockBusinessDataProvider().getSnapshot();
  const result = computeBusinessMetrics(raw);
  const ids = result.metrics.map((m) => m.id);
  for (const id of REQUIRED_METRIC_IDS) {
    assert.ok(ids.includes(id), `missing metric ${id}`);
  }
  const revenue = result.metrics.find((m) => m.id === 'revenue-trend');
  assert.ok(revenue);
  assert.equal(typeof revenue.numericValue, 'number');
});

test('Insight Engine emits trend, positive, risk, and anomaly kinds', () => {
  const raw = createMockBusinessDataProvider().getSnapshot();
  const metrics = computeBusinessMetrics(raw);
  const insights = computeBusinessInsights(raw, metrics);
  const kinds = new Set(insights.insights.map((i) => i.kind));
  assert.ok(kinds.has('trend'));
  assert.ok(kinds.has('positive'));
  assert.ok(kinds.has('risk') || kinds.has('anomaly'));
});

test('Recommendation Engine includes example AI suggestions', () => {
  const advisor = runBusinessIntelligenceEngine();
  const messages = advisor.recommendations.recommendations.map((r) => r.message);
  assert.ok(messages.some((m) => /Satışlar son 7 günde/i.test(m)));
  assert.ok(messages.some((m) => /En yüksek marj/i.test(m)));
  assert.ok(messages.some((m) => /Nakit akışı düşüyor/i.test(m)));
  assert.ok(messages.some((m) => /Stok yenilenmeli/i.test(m)));
});

test('Intelligence pipeline returns mock advisor result', () => {
  const advisor = runBusinessIntelligenceEngine();
  assert.equal(advisor.source, 'mock');
  assert.equal(advisor.headline, 'AI Business Advisor');
  assert.equal(advisor.metrics.metrics.length, 5);
  assert.ok(advisor.insights.insights.length >= 3);
  assert.ok(advisor.recommendations.recommendations.length >= 4);
});

test('Advisor panel UI renders metrics, insights, and recommendations', () => {
  const { collectText } = installDomStubs();
  const advisor = runBusinessIntelligenceEngine();
  const panel = createBusinessAdvisorPanelElement({ advisor, compact: true });
  assert.ok(panel.classList.contains('ib-biz-advisor'));
  assert.equal(panel.querySelectorAll('.ib-biz-advisor__metric').length, 5);
  assert.ok(panel.querySelector('.ib-biz-advisor__insights'));
  assert.ok(panel.querySelector('.ib-biz-advisor__recs'));
  const text = collectText(panel).join(' ');
  assert.match(text, /AI Business Advisor/);
  assert.match(text, /Nakit akışı düşüyor/);
});

test('Dashboard embeds AI Advisor panel', () => {
  installDomStubs();
  const page = createBusinessDashboardPageElement();
  assert.ok(page.querySelector('.ib-biz-advisor'));
  assert.ok(page.querySelector('#business-advisor-title'));
  assert.equal(page.querySelectorAll('.ib-biz-advisor__metric').length, 5);
});
