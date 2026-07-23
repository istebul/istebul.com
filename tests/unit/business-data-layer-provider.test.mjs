/**
 * EPIC-520 — Business Data Layer / provider architecture.
 */
import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href);

const {
  createBusinessDataProvider,
  getDefaultBusinessDataProvider
} = await import('../../src/business/providers/ProviderFactory.ts');
const { MockBusinessProvider } = await import(
  '../../src/business/providers/MockBusinessProvider.ts'
);
const { MetricsEngine } = await import('../../src/business/services/MetricsEngine.ts');
const { InsightEngine } = await import('../../src/business/services/InsightEngine.ts');
const { RecommendationEngine } = await import(
  '../../src/business/services/RecommendationEngine.ts'
);
const { runBusinessIntelligenceEngine } = await import(
  '../../src/business/intelligence/pipeline/BusinessIntelligenceEngine.ts'
);
const { createMockBusinessDataProvider, computeBusinessMetrics } = await import(
  '../../src/business/intelligence/index.ts'
);

test('ProviderFactory defaults to mock BusinessDataProvider', () => {
  const provider = createBusinessDataProvider();
  assert.equal(provider.kind, 'mock');
  assert.ok(provider instanceof MockBusinessProvider);
  assert.equal(getDefaultBusinessDataProvider().kind, 'mock');
});

test('MockBusinessProvider returns frozen intelligence mock snapshot', () => {
  const snap = createBusinessDataProvider({ kind: 'mock' }).getSnapshot();
  assert.equal(snap.currency, 'TRY');
  assert.ok(snap.revenueSeries.length >= 2);
  assert.ok(snap.categoryMargins.some((c) => c.category === 'Elektronik'));
});

test('MetricsEngine consumes provider interface only', () => {
  const engine = new MetricsEngine(createBusinessDataProvider());
  const result = engine.compute();
  const ids = result.metrics.metrics.map((m) => m.id);
  assert.deepEqual(ids, [
    'revenue-trend',
    'cost-trend',
    'growth',
    'risk-score',
    'customer-health'
  ]);
  assert.equal(typeof result.signals.revenueDelta, 'number');
  assert.equal(result.signals.topMarginCategory, 'Elektronik');
});

test('InsightEngine consumes MetricsEngine only', () => {
  const metricsEngine = new MetricsEngine(createBusinessDataProvider());
  const insightEngine = new InsightEngine(metricsEngine);
  metricsEngine.compute();
  const result = insightEngine.compute();
  const kinds = new Set(result.insights.insights.map((i) => i.kind));
  assert.ok(kinds.has('trend'));
  assert.ok(kinds.has('positive'));
  assert.ok(kinds.has('risk') || kinds.has('anomaly'));
  assert.equal(result.signals.topMarginCategory, 'Elektronik');
});

test('RecommendationEngine consumes InsightEngine only', () => {
  const metricsEngine = new MetricsEngine(createBusinessDataProvider());
  const insightEngine = new InsightEngine(metricsEngine);
  const recommendationEngine = new RecommendationEngine(insightEngine);
  metricsEngine.compute();
  insightEngine.compute();
  const recs = recommendationEngine.compute();
  const messages = recs.recommendations.map((r) => r.message);
  assert.ok(messages.some((m) => /Satışlar son 7 günde/i.test(m)));
  assert.ok(messages.some((m) => /En yüksek marj/i.test(m)));
  assert.ok(messages.some((m) => /Nakit akışı düşüyor/i.test(m)));
  assert.ok(messages.some((m) => /Stok yenilenmeli/i.test(m)));
});

test('Pipeline output preserved via runBusinessIntelligenceEngine', () => {
  const advisor = runBusinessIntelligenceEngine();
  assert.equal(advisor.source, 'mock');
  assert.equal(advisor.headline, 'AI Business Advisor');
  assert.equal(advisor.metrics.metrics.length, 5);
  assert.ok(advisor.recommendations.recommendations.length >= 4);
});

test('EPIC-510 compatibility shims still resolve', () => {
  const provider = createMockBusinessDataProvider();
  const metrics = computeBusinessMetrics(provider.getSnapshot());
  assert.equal(metrics.metrics.length, 5);
});
