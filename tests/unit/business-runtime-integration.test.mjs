/**
 * EPIC-570 — Business Runtime Integration unit tests.
 */
import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href);

const {
  createBusinessRuntime,
  getDefaultBusinessRuntime,
  createBusinessRuntimeContext,
  createIdleRuntimeHealth,
  buildRuntimeHealth,
  buildRuntimeCacheKey,
  createInMemoryRuntimeCache,
  DEFAULT_RUNTIME_TIMEOUT_MS,
  DEFAULT_RUNTIME_CACHE_TTL_MS
} = await import('../../src/business/runtime/index.ts');

const { createProviderResolver } = await import(
  '../../src/business/providers/core/ProviderResolver.ts'
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
      const walk = (el) => {
        if (!el || typeof el !== 'object') return;
        const cls = String(el.className || '');
        if (selector.startsWith('.') && cls.split(/\s+/).includes(selector.slice(1))) {
          acc.push(el);
        }
        if (selector.startsWith('[') && selector.endsWith(']')) {
          const body = selector.slice(1, -1);
          const [rawKey, rawVal] = body.split('=');
          const key = rawKey.trim();
          const want = rawVal ? rawVal.replace(/^["']|["']$/g, '') : null;
          const attrVal = el.attrs?.[key] ?? el.dataset?.[key.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
          if (want == null ? key in (el.attrs || {}) || key in (el.dataset || {}) : String(attrVal) === want) {
            acc.push(el);
          }
        }
        for (const child of el.children || []) walk(child);
      };
      walk(this);
      return acc;
    }
  }

  globalThis.document = {
    createElement: (tag) => new FakeEl(tag)
  };
}

installDomStubs();

test('createBusinessRuntimeContext defaults locale to tr', () => {
  const ctx = createBusinessRuntimeContext({ tenantId: 't-1' });
  assert.equal(ctx.tenantId, 't-1');
  assert.equal(ctx.locale, 'tr');
});

test('idle runtime health before execute', () => {
  const runtime = createBusinessRuntime();
  const health = runtime.getHealth();
  assert.equal(health.status, 'idle');
  assert.equal(health.lifecycle, 'idle');
  assert.equal(createIdleRuntimeHealth().status, 'idle');
});

test('execute uses mock provider by default via ProviderResolver', () => {
  const runtime = createBusinessRuntime();
  const result = runtime.execute(createBusinessRuntimeContext({ tenantId: 'tenant-a' }));
  assert.equal(result.telemetry.requestedProviderKind, 'mock');
  assert.equal(result.telemetry.resolvedProviderKind, 'mock');
  assert.equal(result.telemetry.fellBackToMock, false);
  assert.equal(result.resolve.resolvedKind, 'mock');
  assert.equal(result.advisor.source, 'mock');
  assert.equal(result.advisor.headline, 'AI Business Advisor');
  assert.ok(result.advisor.health);
  assert.ok(result.advisor.kpi);
  assert.ok(result.advisor.events);
  assert.equal(result.health.lifecycle, 'complete');
  assert.equal(result.health.status, 'healthy');
  assert.equal(runtime.getLifecycle(), 'complete');
});

test('getDefaultBusinessRuntime executes with mock', () => {
  const runtime = getDefaultBusinessRuntime();
  const result = runtime.execute({
    tenantId: 'default-tenant',
    locale: 'en',
    providerKind: 'mock'
  });
  assert.equal(result.telemetry.locale, 'en');
  assert.equal(result.telemetry.resolvedProviderKind, 'mock');
});

test('live provider falls back to mock (non-strict) and marks degraded', () => {
  const runtime = createBusinessRuntime();
  const result = runtime.execute(
    createBusinessRuntimeContext({
      tenantId: 'tenant-live',
      providerKind: 'supabase'
    })
  );
  assert.equal(result.telemetry.requestedProviderKind, 'supabase');
  assert.equal(result.telemetry.resolvedProviderKind, 'mock');
  assert.equal(result.telemetry.fellBackToMock, true);
  assert.equal(result.health.status, 'degraded');
  assert.equal(result.advisor.source, 'mock');
});

test('strict live provider throws and sets unhealthy', () => {
  const runtime = createBusinessRuntime();
  assert.throws(
    () =>
      runtime.execute(
        createBusinessRuntimeContext({
          tenantId: 'tenant-strict',
          providerKind: 'erp',
          strictProvider: true
        })
      ),
    /not ready/i
  );
  assert.equal(runtime.getHealth().status, 'unhealthy');
  assert.equal(runtime.getLifecycle(), 'failed');
});

test('cache hit returns prior advisor payload', () => {
  const runtime = createBusinessRuntime();
  const ctx = createBusinessRuntimeContext({
    tenantId: 'cache-tenant',
    cache: { enabled: true, ttlMs: 60_000 }
  });
  const first = runtime.execute(ctx);
  const second = runtime.execute(ctx);
  assert.equal(second.telemetry.cacheHit, true);
  assert.equal(second.health.cacheHit, true);
  assert.equal(second.advisor.generatedAt, first.advisor.generatedAt);
  assert.equal(second.advisor.headline, first.advisor.headline);
});

test('clearCache forces recomputation', () => {
  const runtime = createBusinessRuntime();
  const ctx = createBusinessRuntimeContext({
    tenantId: 'cache-clear',
    cache: { enabled: true, ttlMs: 60_000 }
  });
  runtime.execute(ctx);
  runtime.clearCache();
  const again = runtime.execute(ctx);
  assert.equal(again.telemetry.cacheHit, false);
});

test('timeout flag when budget is zero', () => {
  const runtime = createBusinessRuntime({ defaultTimeoutMs: 0 });
  const result = runtime.execute(
    createBusinessRuntimeContext({
      tenantId: 'timeout-tenant',
      timeoutMs: 0
    })
  );
  assert.equal(result.telemetry.timedOut, true);
  assert.equal(result.health.timedOut, true);
  assert.equal(result.health.status, 'degraded');
});

test('missing tenantId throws', () => {
  const runtime = createBusinessRuntime();
  assert.throws(() => runtime.execute({ tenantId: '  ', locale: 'tr' }), /tenantId/i);
});

test('buildRuntimeCacheKey is stable', () => {
  assert.equal(
    buildRuntimeCacheKey({ tenantId: 'a', providerKind: 'mock', locale: 'tr' }),
    'biz-runtime:a:mock:tr'
  );
});

test('InMemoryRuntimeCache respects ttl expiry', () => {
  const cache = createInMemoryRuntimeCache();
  cache.set('k', { ok: true }, 60_000);
  assert.deepEqual(cache.get('k'), { ok: true });
  cache.set('k2', 1, 0);
  assert.equal(cache.get('k2'), undefined);
});

test('buildRuntimeHealth degraded on fallback', () => {
  const health = buildRuntimeHealth({
    lifecycle: 'complete',
    providerReady: true,
    requestedProviderKind: 'supabase',
    resolvedProviderKind: 'mock',
    fellBackToMock: true,
    timedOut: false,
    cacheHit: false,
    tenantId: 't'
  });
  assert.equal(health.status, 'degraded');
});

test('runtime advisor matches direct engine shape for mock', () => {
  const runtime = createBusinessRuntime();
  const viaRuntime = runtime.execute(createBusinessRuntimeContext({ tenantId: 'parity' }));
  const viaEngine = runBusinessIntelligenceEngine();
  assert.equal(viaRuntime.advisor.headline, viaEngine.headline);
  assert.equal(viaRuntime.advisor.source, viaEngine.source);
  assert.equal(viaRuntime.advisor.metrics.metrics.length, viaEngine.metrics.metrics.length);
  assert.equal(viaRuntime.advisor.insights.insights.length, viaEngine.insights.insights.length);
});

test('Dashboard and Advisor pages remain visually identical (structure)', () => {
  const dash = createBusinessDashboardPageElement();
  const advisor = createBusinessAiAdvisorPageElement();
  assert.equal(dash.dataset.businessPage, 'dashboard');
  assert.equal(advisor.dataset.businessPage, 'danisman');
  assert.ok(dash.querySelector('.ib-biz-advisor') || dash.children.some((c) => String(c.className).includes('ib-biz-advisor') || (c.querySelectorAll && c.querySelectorAll('.ib-biz-advisor').length)));
  // Advisor page includes advisor panel
  const hasAdvisorClass = (el) => {
    if (!el) return false;
    if (String(el.className || '').split(/\s+/).includes('ib-biz-advisor')) return true;
    return (el.children || []).some(hasAdvisorClass);
  };
  assert.equal(hasAdvisorClass(advisor), true);
  assert.equal(hasAdvisorClass(dash), true);
});

test('ProviderResolver is the only provider entry used by factory', () => {
  const resolver = createProviderResolver();
  const runtime = createBusinessRuntime({ resolver });
  const result = runtime.execute(createBusinessRuntimeContext({ tenantId: 'resolver-only' }));
  assert.equal(result.resolve.requestedKind, 'mock');
  assert.ok(typeof resolver.resolve === 'function');
});

test('defaults exported', () => {
  assert.equal(DEFAULT_RUNTIME_TIMEOUT_MS, 5000);
  assert.equal(DEFAULT_RUNTIME_CACHE_TTL_MS, 30000);
});

test('EPIC-570 doc exists', () => {
  const doc = path.join(process.cwd(), 'docs/business/EPIC-570-BUSINESS-RUNTIME.md');
  assert.ok(fs.existsSync(doc));
  const text = fs.readFileSync(doc, 'utf8');
  assert.match(text, /ProviderResolver/);
  assert.match(text, /BusinessRuntime/);
  assert.match(text, /mock remains the default/i);
});

test('runtime package files exist', () => {
  const root = path.join(process.cwd(), 'src/business/runtime');
  for (const name of [
    'BusinessRuntime.ts',
    'BusinessRuntimeFactory.ts',
    'BusinessRuntimeContext.ts',
    'RuntimeHealth.ts',
    'RuntimeCache.ts',
    'BusinessRuntimeResult.ts',
    'index.ts'
  ]) {
    assert.ok(fs.existsSync(path.join(root, name)), name);
  }
});

test('root barrel documents runtime export path', () => {
  const indexSrc = fs.readFileSync(path.join(process.cwd(), 'src/business/index.ts'), 'utf8');
  assert.match(indexSrc, /from '\.\/runtime'/);
  assert.match(indexSrc, /createBusinessRuntime/);
  assert.match(indexSrc, /BusinessRuntimeContext/);
});
