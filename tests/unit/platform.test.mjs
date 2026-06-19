import test from 'node:test';
import assert from 'node:assert/strict';

const createElement = (tag = 'div') => ({
  tag,
  async: false,
  defer: false,
  src: '',
  dataset: {},
  innerHTML: '',
  listeners: {},
  setAttribute(name, value) { this[name] = value; },
  addEventListener(type, handler) { this.listeners[type] = handler; },
  click() { this.listeners.click?.(); },
  querySelector(selector) {
    if (selector === '[data-error-retry]' && this.innerHTML.includes('data-error-retry')) {
      if (!this.retryButton) this.retryButton = createElement('button');
      return this.retryButton;
    }
    return null;
  }
});

test('error boundary renders fallback UI and retry action', async () => {
  const { ErrorBoundary } = await import('../../js/core/error-boundary.js');
  const boundary = new ErrorBoundary();
  const container = createElement();
  let retried = false;
  const originalConsoleError = console.error;
  console.error = () => {};

  boundary.render(container, new Error('boom'), () => { retried = true; });
  container.retryButton.click();
  console.error = originalConsoleError;

  assert.match(container.innerHTML, /error-boundary/);
  assert.equal(retried, true);
});

test('monitoring waits for consent before loading providers', async () => {
  const appended = [];
  const listeners = [];
  global.window = {
    location: { hostname: 'istebul.com' },
    addEventListener: (type, handler) => listeners.push({ type, handler })
  };
  global.document = {
    querySelector: () => null,
    createElement,
    head: {
      appendChild: (script) => {
        appended.push(script);
        script.onload?.();
      }
    }
  };

  const { MonitoringManager } = await import(`../../js/core/monitoring.js?monitoring=${Date.now()}`);
  const manager = new MonitoringManager();
  manager.sentryDSN = 'https://public@sentry.example/1';

  await manager.init(false);
  assert.equal(appended.length, 0);
  assert.equal(manager.handlersAttached, true);

  await manager.init(true);
  assert.equal(appended.length, 1);
  assert.match(String(appended[0].src), /sentry/i);

  delete global.window;
  delete global.document;
});

test('supabase fallback client supports auth, query and storage interfaces', async () => {
  const originalWindow = global.window;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  global.window = {};
  const originalConsoleWarn = console.warn;
  console.warn = () => {};

  const { supabase } = await import(`../../js/core/supabase.js?fallback=${Date.now()}`);
  const userResult = await supabase.auth.getUser();
  const queryResult = await supabase.from('listings').select('*').eq('id', '1');
  const publicUrl = supabase.storage.from('images').getPublicUrl('x.png');
  console.warn = originalConsoleWarn;
  if (originalUrl) process.env.SUPABASE_URL = originalUrl;
  if (originalKey) process.env.SUPABASE_ANON_KEY = originalKey;
  global.window = originalWindow;

  assert.equal(userResult.data?.user ?? null, null);
  assert.ok(Array.isArray(queryResult.data) || queryResult.data === null);
  assert.ok(publicUrl.data?.publicUrl);
});
