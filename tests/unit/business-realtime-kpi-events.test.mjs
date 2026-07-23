/**
 * EPIC-550 — Real-Time KPI & Event Intelligence.
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
const { createBusinessHealthEngine } = await import(
  '../../src/business/intelligence/health/BusinessHealthEngine.ts'
);
const { createKPIEngine } = await import(
  '../../src/business/intelligence/kpi/KPIEngine.ts'
);
const { createDefaultKPIRegistry } = await import(
  '../../src/business/intelligence/kpi/KPIRegistry.ts'
);
const { createEventBus } = await import(
  '../../src/business/intelligence/events/EventBus.ts'
);
const { createDefaultEventRegistry } = await import(
  '../../src/business/intelligence/events/EventRegistry.ts'
);
const { createEventProcessor } = await import(
  '../../src/business/intelligence/events/EventProcessor.ts'
);
const { createBusinessEvent } = await import(
  '../../src/business/intelligence/events/BusinessEvent.ts'
);
const { calculateTrend } = await import(
  '../../src/business/intelligence/utils/trend-calculator.ts'
);
const { detectChange } = await import(
  '../../src/business/intelligence/utils/change-detector.ts'
);
const { MetricsEngine } = await import('../../src/business/services/MetricsEngine.ts');
const { InsightEngine } = await import('../../src/business/services/InsightEngine.ts');
const { RecommendationEngine } = await import(
  '../../src/business/services/RecommendationEngine.ts'
);
const { runBusinessIntelligenceEngine } = await import(
  '../../src/business/intelligence/pipeline/BusinessIntelligenceEngine.ts'
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

test('trend calculator and change detector utilities', () => {
  const up = calculateTrend(12);
  assert.equal(up.direction, 'up');
  assert.equal(detectChange(10, 10.1, { absoluteThreshold: 0.5 }), false);
  assert.equal(detectChange(10, 12), true);
});

test('KPIRegistry seeds plugins and KPIEngine produces immutable snapshot', () => {
  const registry = createDefaultKPIRegistry();
  assert.ok(registry.count() >= 8);
  const analytics = createAnalyticsEngine({
    provider: createBusinessDataProvider()
  }).compute();
  const health = createBusinessHealthEngine().evaluate(analytics);
  const kpi = createKPIEngine({ registry }).compute(health, analytics);
  assert.ok(Object.isFrozen(kpi));
  assert.ok(kpi.kpis.length >= 8);
  assert.equal(kpi.signals.topMarginCategory, 'Elektronik');
  assert.ok(kpi.trends.length >= 8);
});

test('EventBus publish/subscribe and EventRegistry catalog', () => {
  const bus = createEventBus();
  const registry = createDefaultEventRegistry();
  assert.equal(registry.count(), 5);
  let seen = 0;
  bus.subscribe('trend.shifted', () => {
    seen += 1;
  });
  bus.publish(
    createBusinessEvent({
      type: 'trend.shifted',
      source: 'test',
      timestamp: '2026-07-22',
      payload: { note: 'unit' }
    })
  );
  assert.equal(seen, 1);
  assert.equal(bus.getPublishCount(), 1);
});

test('EventProcessor transforms events into KPI updates when value is provided', () => {
  const analytics = createAnalyticsEngine({
    provider: createBusinessDataProvider()
  }).compute();
  const health = createBusinessHealthEngine().evaluate(analytics);
  const kpi = createKPIEngine().compute(health, analytics);
  const processor = createEventProcessor();
  const observational = processor.processFromSnapshot(kpi);
  assert.equal(observational.appliedUpdates, 0);
  assert.equal(observational.kpiSnapshot.signals.revenueDelta, kpi.signals.revenueDelta);
  assert.ok(observational.events.length >= 2);

  const patched = processor.applyKpiUpdate(kpi, 'risk-score', 99);
  assert.equal(patched.appliedUpdates, 1);
  const risk = patched.kpiSnapshot.kpis.find((k) => k.id === 'risk-score');
  assert.equal(risk?.numericValue, 99);
});

test('MetricsEngine consumes KPI snapshots without changing core metrics', () => {
  const result = new MetricsEngine(createBusinessDataProvider()).compute();
  assert.equal(result.metrics.metrics.length, 5);
  assert.ok(result.kpi);
  assert.ok(result.events);
  assert.ok(result.events.events.length >= 2);
  assert.equal(result.events.appliedUpdates, 0);
  assert.equal(result.signals.topMarginCategory, 'Elektronik');
  assert.ok(result.health.overallScore >= 0);
});

test('Insight and Recommendation layers may use KPI trends', () => {
  const metricsEngine = new MetricsEngine(createBusinessDataProvider());
  const insightEngine = new InsightEngine(metricsEngine);
  const recommendationEngine = new RecommendationEngine(insightEngine);
  metricsEngine.compute();
  const insights = insightEngine.compute();
  assert.ok(insights.trends.length >= 5);
  assert.ok(insights.insights.insights.some((i) => i.id === 'ins-trend-revenue'));
  const recs = recommendationEngine.compute();
  assert.ok(recs.recommendations.some((r) => /Nakit akışı düşüyor/i.test(r.message)));
  assert.ok(recs.recommendations.some((r) => /Stok yenilenmeli/i.test(r.message)));
});

test('Advisor result exposes kpi/events and preserves Dashboard + Advisor UI', () => {
  const advisor = runBusinessIntelligenceEngine();
  assert.ok(advisor.kpi);
  assert.ok(advisor.events);
  assert.ok(advisor.health);
  assert.equal(advisor.metrics.metrics.length, 5);
  assert.equal(advisor.source, 'mock');

  installDomStubs();
  const dash = createBusinessDashboardPageElement();
  const ai = createBusinessAiAdvisorPageElement();
  assert.ok(dash.querySelector('.ib-biz-advisor'));
  assert.ok(ai.querySelector('.ib-biz-advisor'));
  assert.equal(dash.querySelectorAll('.ib-biz-advisor__metric').length, 5);
});
