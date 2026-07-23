/**
 * EPIC-540 — Business Health Scoring Engine.
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
const { createScoringEngine } = await import(
  '../../src/business/intelligence/scoring/ScoringEngine.ts'
);
const { RevenueScorer } = await import(
  '../../src/business/intelligence/scoring/RevenueScorer.ts'
);
const { createBusinessHealthEngine } = await import(
  '../../src/business/intelligence/health/BusinessHealthEngine.ts'
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
const { computeWeightedScore } = await import(
  '../../src/business/intelligence/utils/weighted-score.ts'
);
const { normalizeToScore } = await import(
  '../../src/business/intelligence/utils/score-normalizer.ts'
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

test('score normalizer and weighted score utilities', () => {
  assert.equal(normalizeToScore(0), 50);
  assert.ok(normalizeToScore(20, { scale: 2 }) > 50);
  const weighted = computeWeightedScore([
    {
      id: 'revenue',
      label: 'Revenue',
      score: 80,
      weight: 1,
      band: 'strong',
      detail: ''
    },
    {
      id: 'risk',
      label: 'Risk',
      score: 40,
      weight: 1,
      band: 'watch',
      detail: ''
    }
  ]);
  assert.equal(weighted, 60);
});

test('ScoringEngine produces seven domain scores', () => {
  const analytics = createAnalyticsEngine({
    provider: createBusinessDataProvider()
  }).compute();
  const scoring = createScoringEngine().score(analytics);
  assert.equal(scoring.domainScores.length, 7);
  assert.ok(scoring.domainScores.every((s) => s.score >= 0 && s.score <= 100));
  assert.equal(RevenueScorer.id, 'revenue');
});

test('BusinessHealthEngine returns overall 0–100 score and executive KPIs', () => {
  const analytics = createAnalyticsEngine({
    provider: createBusinessDataProvider()
  }).compute();
  const health = createBusinessHealthEngine().evaluate(analytics);
  assert.ok(health.overallScore >= 0 && health.overallScore <= 100);
  assert.ok(health.executiveKpis.length >= 8);
  assert.equal(health.executiveKpis[0]?.id, 'business-health');
  assert.equal(health.domainScores.length, 7);
});

test('MetricsEngine pipeline includes health without changing core metrics', () => {
  const result = new MetricsEngine(createBusinessDataProvider()).compute();
  assert.equal(result.metrics.metrics.length, 5);
  assert.ok(result.health);
  assert.ok(result.health.overallScore >= 0);
  assert.equal(result.signals.topMarginCategory, 'Elektronik');
});

test('Insight and Recommendation layers still work above MetricsEngine', () => {
  const metricsEngine = new MetricsEngine(createBusinessDataProvider());
  const insightEngine = new InsightEngine(metricsEngine);
  const recommendationEngine = new RecommendationEngine(insightEngine);
  metricsEngine.compute();
  insightEngine.compute();
  const recs = recommendationEngine.compute();
  assert.ok(recs.recommendations.some((r) => /Nakit akışı düşüyor/i.test(r.message)));
});

test('Advisor result exposes health and preserves UI mounts', () => {
  const advisor = runBusinessIntelligenceEngine();
  assert.ok(advisor.health);
  assert.ok(advisor.health.executiveKpis.length >= 8);
  assert.equal(advisor.metrics.metrics.length, 5);

  installDomStubs();
  assert.ok(createBusinessDashboardPageElement().querySelector('.ib-biz-advisor'));
  assert.ok(createBusinessAiAdvisorPageElement().querySelector('.ib-biz-advisor'));
});
