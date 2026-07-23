/**
 * EPIC-560 — Live Data Integration Foundation (provider adapters + resolver).
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
  getDefaultBusinessDataProvider,
  resolveBusinessProvider,
  createProviderResolver
} = await import('../../src/business/providers/ProviderFactory.ts');
const { MockBusinessProvider } = await import(
  '../../src/business/providers/MockBusinessProvider.ts'
);
const { SupabaseProvider, createSupabaseProvider } = await import(
  '../../src/business/providers/adapters/SupabaseProvider.ts'
);
const { ERPProvider, createERPProvider } = await import(
  '../../src/business/providers/adapters/ERPProvider.ts'
);
const { GarsonAIProvider, createGarsonAIProvider } = await import(
  '../../src/business/providers/adapters/GarsonAIProvider.ts'
);
const {
  getProviderCapabilities,
  listProviderCapabilities
} = await import('../../src/business/providers/core/ProviderCapabilities.ts');
const {
  ProviderNotReadyError,
  validateProviderCapabilities,
  isProviderReady
} = await import('../../src/business/providers/utils/provider-validator.ts');
const { MetricsEngine } = await import('../../src/business/services/MetricsEngine.ts');
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

test('MockBusinessProvider remains the default resolved provider', () => {
  const provider = createBusinessDataProvider();
  assert.equal(provider.kind, 'mock');
  assert.ok(provider instanceof MockBusinessProvider);
  assert.equal(getDefaultBusinessDataProvider().kind, 'mock');
  assert.equal(provider.getStatus().ready, true);
});

test('ProviderCapabilities catalog covers mock and live adapter kinds', () => {
  const listed = listProviderCapabilities();
  assert.equal(listed.length, 4);
  assert.ok(validateProviderCapabilities(getProviderCapabilities('mock')));
  assert.equal(getProviderCapabilities('supabase').live, true);
  assert.equal(getProviderCapabilities('erp').requiresNetwork, true);
  assert.equal(getProviderCapabilities('garson-ai').supportsRealtime, true);
});

test('Live adapters are stubs: status not ready and getSnapshot throws', () => {
  const supabase = createSupabaseProvider();
  const erp = createERPProvider();
  const garson = createGarsonAIProvider();
  assert.ok(supabase instanceof SupabaseProvider);
  assert.ok(erp instanceof ERPProvider);
  assert.ok(garson instanceof GarsonAIProvider);
  assert.equal(supabase.getStatus().code, 'stub');
  assert.equal(isProviderReady(erp.getStatus()), false);
  assert.throws(() => supabase.getSnapshot(), (err) => err instanceof ProviderNotReadyError);
  assert.throws(() => erp.getSnapshot(), (err) => err instanceof ProviderNotReadyError);
  assert.throws(() => garson.getSnapshot(), (err) => err instanceof ProviderNotReadyError);
});

test('ProviderResolver falls back to mock for unready live kinds', () => {
  const resolver = createProviderResolver();
  const result = resolver.resolve({ kind: 'supabase' });
  assert.equal(result.requestedKind, 'supabase');
  assert.equal(result.resolvedKind, 'mock');
  assert.equal(result.fellBackToMock, true);
  assert.equal(result.provider.kind, 'mock');
  assert.ok(result.provider.getSnapshot().revenueSeries.length >= 2);

  assert.throws(() => resolveBusinessProvider({ kind: 'erp', strict: true }), /not ready/i);
});

test('Pipeline and metrics unchanged with default provider resolution', () => {
  const metrics = new MetricsEngine(createBusinessDataProvider()).compute();
  assert.equal(metrics.metrics.metrics.length, 5);
  assert.equal(metrics.signals.topMarginCategory, 'Elektronik');

  const advisor = runBusinessIntelligenceEngine();
  assert.equal(advisor.source, 'mock');
  assert.equal(advisor.metrics.metrics.length, 5);
  assert.ok(advisor.health);
  assert.ok(advisor.kpi);
});

test('Dashboard and Advisor UI mounts preserved', () => {
  installDomStubs();
  assert.ok(createBusinessDashboardPageElement().querySelector('.ib-biz-advisor'));
  assert.ok(createBusinessAiAdvisorPageElement().querySelector('.ib-biz-advisor'));
});
